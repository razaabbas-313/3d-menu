package com.atelierar.publicapi;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.storage.StorageService;
import com.atelierar.web.Dtos.PublicMenuDto;
import com.atelierar.web.Mappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Generates and uploads public menu snapshots to S3 or local storage at public/{slug}/menu.json.
 * This ensures guests never experience cold-start delays when scanning QR codes if the backend sleeps.
 * Operates asynchronously so dish creation and image uploads respond instantaneously without waiting on S3 network I/O.
 */
@Service
public class PublicMenuSnapshotService {
    private static final Logger log = LoggerFactory.getLogger(PublicMenuSnapshotService.class);

    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final StorageService storage;
    private final ObjectMapper objectMapper;
    private final ExecutorService snapshotExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "menu-snapshot-worker");
        t.setDaemon(true);
        return t;
    });

    public PublicMenuSnapshotService(RestaurantRepository restaurants,
                                     MenuItemRepository items,
                                     StorageService storage,
                                     ObjectMapper objectMapper) {
        this.restaurants = restaurants;
        this.items = items;
        this.storage = storage;
        this.objectMapper = objectMapper;
    }

    /**
     * Asynchronously re-generates and publishes the public JSON snapshot for the given restaurant.
     * If the restaurant is not published, deletes any existing snapshot.
     */
    public void updateSnapshot(UUID restaurantId) {
        if (restaurantId == null) return;
        snapshotExecutor.submit(() -> doUpdateSnapshot(restaurantId));
    }

    private void doUpdateSnapshot(UUID restaurantId) {
        try {
            Restaurant r = restaurants.findById(restaurantId).orElse(null);
            if (r == null) return;
            if (!r.isPublished()) {
                doDeleteSnapshot(r.getSlug());
                return;
            }
            List<MenuItem> publishedItems = items.findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(r.getId());
            PublicMenuDto snapshot = new PublicMenuDto(
                    Mappers.publicRestaurant(r),
                    publishedItems.stream().map(Mappers::publicItem).toList()
            );

            String json = objectMapper.writeValueAsString(snapshot);
            String url = storage.savePublicSnapshot(r.getSlug(), json);
            log.info("Public menu snapshot updated asynchronously for '{}' at {}", r.getSlug(), url);
        } catch (Exception e) {
            log.error("Failed to generate public menu snapshot for restaurant {}: {}", restaurantId, e.getMessage());
        }
    }

    /**
     * Asynchronously deletes the public snapshot for the specified slug from storage/CDN.
     */
    public void deleteSnapshot(String slug) {
        if (slug == null || slug.isBlank()) return;
        snapshotExecutor.submit(() -> doDeleteSnapshot(slug));
    }

    private void doDeleteSnapshot(String slug) {
        try {
            storage.deletePublicSnapshot(slug);
            log.info("Deleted public menu snapshot for slug '{}'", slug);
        } catch (Exception e) {
            log.warn("Failed to delete public snapshot for slug '{}': {}", slug, e.getMessage());
        }
    }
}
