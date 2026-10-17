package com.atelierar.publicapi;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.menu.SampleMenu;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.web.Dtos.PublicItemDto;
import com.atelierar.web.Dtos.PublicMenuDto;
import com.atelierar.web.Dtos.PublicRestaurantDto;
import com.atelierar.web.Mappers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * High-performance service providing public guest menus directly from PostgreSQL
 * with Spring Boot in-memory caching and instant cache eviction on mutations.
 * Completely eliminates slow manual S3 snapshot file generation and CloudFront edge desyncs.
 */
@Service
public class PublicMenuService {
    private static final Logger log = LoggerFactory.getLogger(PublicMenuService.class);

    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final CacheManager cacheManager;

    public PublicMenuService(RestaurantRepository restaurants,
                             MenuItemRepository items,
                             CacheManager cacheManager) {
        this.restaurants = restaurants;
        this.items = items;
        this.cacheManager = cacheManager;
    }

    /**
     * Retrieves the published public menu for a restaurant by slug.
     * Cached in-memory with key = lowercase slug for instantaneous sub-millisecond retrieval.
     */
    @Cacheable(value = "public-menus", key = "#slug != null ? #slug.toLowerCase() : ''")
    public PublicMenuDto getPublicMenu(String slug) {
        String normalized = slug != null ? slug.trim().toLowerCase(Locale.ROOT) : "";
        log.debug("Cache miss for public menu: '{}'. Querying PostgreSQL database.", normalized);

        if ("demo".equalsIgnoreCase(normalized)) {
            var existing = restaurants.findBySlugAndPublishedTrue("demo");
            if (existing.isPresent()) {
                return buildMenuDto(existing.get());
            }
            return buildSeededDemoMenu();
        }

        Restaurant r = restaurants.findBySlugAndPublishedTrue(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This menu is not available."));

        return buildMenuDto(r);
    }

    private PublicMenuDto buildMenuDto(Restaurant r) {
        List<MenuItem> publishedItems = items.findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(r.getId());
        return new PublicMenuDto(
                Mappers.publicRestaurant(r),
                publishedItems.stream().map(Mappers::publicItem).toList()
        );
    }

    /**
     * Evicts the cached public menu for a given slug.
     */
    @CacheEvict(value = "public-menus", key = "#slug != null ? #slug.toLowerCase() : ''")
    public void evictBySlug(String slug) {
        if (slug == null || slug.isBlank()) return;
        String normalized = slug.trim().toLowerCase(Locale.ROOT);
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache("public-menus");
            if (cache != null) cache.evict(normalized);
        }
        log.info("Evicted public menu in-memory cache for slug: '{}'", normalized);
    }

    /**
     * Evicts the cached public menu for a given restaurant ID by resolving its active slug.
     */
    public void evictByRestaurantId(UUID restaurantId) {
        if (restaurantId == null) return;
        restaurants.findById(restaurantId).ifPresent(r -> {
            if (r.getSlug() != null) {
                evictBySlug(r.getSlug());
            }
        });
    }

    /**
     * Clears all cached public menus.
     */
    @CacheEvict(value = "public-menus", allEntries = true)
    public void evictAll() {
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache("public-menus");
            if (cache != null) cache.clear();
        }
        log.info("Evicted all entries from 'public-menus' cache.");
    }

    private PublicMenuDto buildSeededDemoMenu() {
        PublicRestaurantDto rest = new PublicRestaurantDto(
                "Le Petit Bistro 3D",
                "demo",
                "Experience our signature culinary creations in interactive 3D and table-top Augmented Reality.",
                "London & Dubai",
                "USD",
                "cobalt",
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
                "@lepetitbistro3d",
                "+1234567890",
                "+1 (555) 234-5678",
                "@lepetitbistro3d",
                "https://facebook.com",
                "https://lepetitbistro.com",
                "https://maps.google.com",
                "Bistro_Guest_WiFi",
                "bistrogourmet",
                "dark",
                true,
                "Hello, I would like to order {dish} for Table {table}.",
                List.of("Appetizers", "Main Courses", "Desserts", "Beverages")
        );

        UUID demoId = UUID.randomUUID();
        var sampleDishes = SampleMenu.build(demoId);
        if (!sampleDishes.isEmpty()) {
            sampleDishes.get(0).setModel("/models/avocado.glb", "avocado.glb");
        }

        List<PublicItemDto> publicItems = sampleDishes.stream().map(Mappers::publicItem).toList();
        return new PublicMenuDto(rest, publicItems);
    }
}
