package com.atelierar.restaurant;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.menu.SampleMenu;
import com.atelierar.storage.StorageService;
import com.atelierar.web.Dtos.ItemDto;
import com.atelierar.web.Dtos.RestaurantDto;
import com.atelierar.web.Dtos.RestaurantUpdate;
import com.atelierar.web.Mappers;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/restaurant")
public class RestaurantController {
    private final RestaurantService service;
    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final StorageService storage;
    private final com.atelierar.publicapi.PublicMenuSnapshotService snapshots;

    public RestaurantController(RestaurantService service, RestaurantRepository restaurants,
                                MenuItemRepository items, StorageService storage,
                                com.atelierar.publicapi.PublicMenuSnapshotService snapshots) {
        this.service = service;
        this.restaurants = restaurants;
        this.items = items;
        this.storage = storage;
        this.snapshots = snapshots;
    }

    @GetMapping
    public RestaurantDto get() {
        return Mappers.restaurant(service.current());
    }

    @PutMapping
    public RestaurantDto update(@Valid @RequestBody RestaurantUpdate req) {
        Restaurant r = service.current();
        String oldSlug = r.getSlug();
        String slugReq = req.slug() != null && !req.slug().isBlank() ? req.slug().trim() : null;
        if (slugReq != null) {
            String candidate = RestaurantService.normalizeSlug(slugReq);
            if (!candidate.equalsIgnoreCase(r.getSlug())) {
                if (restaurants.existsBySlugAndIdNot(candidate, r.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "The web address /m/" + candidate + " is already taken by another restaurant.");
                }
                r.setSlug(candidate);
            }
        }
        r.updateProfile(
                req.name().trim(),
                r.getSlug(),
                blankToNull(req.tagline()),
                blankToNull(req.city()),
                req.currency(),
                req.accent(),
                blankToNull(req.instagram()),
                blankToNull(req.whatsapp()),
                blankToNull(req.phone()),
                blankToNull(req.tiktok()),
                blankToNull(req.facebook()),
                blankToNull(req.website()),
                blankToNull(req.googleMapsUrl()),
                blankToNull(req.wifiName()),
                blankToNull(req.wifiPassword()),
                req.theme() != null ? req.theme() : "dark",
                req.whatsappOrderEnabled() != null ? req.whatsappOrderEnabled() : true,
                blankToNull(req.whatsappMessageTemplate()),
                req.categories()
        );
        Restaurant saved = restaurants.save(r);
        if (oldSlug != null && !oldSlug.equalsIgnoreCase(saved.getSlug())) {
            snapshots.deleteSnapshot(oldSlug);
        }
        snapshots.updateSnapshot(saved.getId());
        return Mappers.restaurant(saved);
    }

    @PatchMapping("/publish")
    public RestaurantDto publish(@RequestParam boolean value) {
        Restaurant r = service.current();
        if (value && items.countByRestaurantId(r.getId()) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one dish before publishing your menu.");
        }
        r.setPublished(value);
        Restaurant saved = restaurants.save(r);
        snapshots.updateSnapshot(saved.getId());
        return Mappers.restaurant(saved);
    }

    @PatchMapping("/categories")
    public RestaurantDto updateCategories(@RequestBody List<String> categories) {
        Restaurant r = service.current();
        r.setCategoriesList(categories);
        Restaurant saved = restaurants.save(r);
        snapshots.updateSnapshot(saved.getId());
        return Mappers.restaurant(saved);
    }

    @PostMapping(value = "/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RestaurantDto uploadCover(@RequestParam("file") MultipartFile file) throws IOException {
        Restaurant r = service.current();
        String newUrl = storage.saveCoverImage(r.getId(), file);
        String old = r.getCoverUrl();
        r.setCoverUrl(newUrl);
        Restaurant saved = restaurants.save(r);
        storage.deleteQuietly(old);
        snapshots.updateSnapshot(saved.getId());
        return Mappers.restaurant(saved);
    }

    @DeleteMapping("/cover")
    public RestaurantDto removeCover() {
        Restaurant r = service.current();
        String old = r.getCoverUrl();
        r.setCoverUrl(null);
        Restaurant saved = restaurants.save(r);
        storage.deleteQuietly(old);
        snapshots.updateSnapshot(saved.getId());
        return Mappers.restaurant(saved);
    }

    /** Fills an empty menu with example dishes so a new owner can explore the product immediately. */
    @PostMapping("/sample-menu")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ItemDto> addSampleMenu() {
        Restaurant r = service.current();
        if (items.countByRestaurantId(r.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sample dishes can only be added to an empty menu.");
        }
        List<MenuItem> created = items.saveAll(SampleMenu.build(r.getId()));
        snapshots.updateSnapshot(r.getId());
        return created.stream().map(Mappers::item).toList();
    }

    @GetMapping("/storage")
    public Map<String, Object> getStorageUsage() {
        Restaurant r = service.current();
        long usedBytes = storage.getRestaurantStorageUsage(r.getId());
        long quotaBytes = storage.getQuotaBytes();
        long usedMb = usedBytes / (1024 * 1024);
        long quotaMb = quotaBytes / (1024 * 1024);
        return Map.of(
                "usedBytes", usedBytes,
                "quotaBytes", quotaBytes,
                "usedMb", usedMb,
                "quotaMb", quotaMb,
                "percentUsed", quotaBytes > 0 ? (double) usedBytes / quotaBytes * 100.0 : 0.0
        );
    }

    @PostMapping("/storage/cleanup")
    public Map<String, Object> cleanupStorage() {
        Restaurant r = service.current();
        Set<String> activeKeys = new HashSet<>();
        if (r.getCoverUrl() != null) {
            String k = storage.extractKey(r.getCoverUrl());
            if (k != null) activeKeys.add(k);
        }
        for (MenuItem item : items.findByRestaurantIdOrderByCreatedAtDesc(r.getId())) {
            if (item.getImageUrl() != null) {
                String k = storage.extractKey(item.getImageUrl());
                if (k != null) activeKeys.add(k);
            }
            if (item.getThumbnailUrl() != null) {
                String k = storage.extractKey(item.getThumbnailUrl());
                if (k != null) activeKeys.add(k);
            }
            if (item.getModelUrl() != null) {
                String k = storage.extractKey(item.getModelUrl());
                if (k != null) activeKeys.add(k);
            }
            if (item.getOriginalModelUrl() != null) {
                String k = storage.extractKey(item.getOriginalModelUrl());
                if (k != null) activeKeys.add(k);
            }
        }
        long beforeBytes = storage.getRestaurantStorageUsage(r.getId());
        int deleted = storage.cleanupOrphans(r.getId(), activeKeys);
        long afterBytes = storage.getRestaurantStorageUsage(r.getId());
        return Map.of(
                "deletedFiles", deleted,
                "freedBytes", Math.max(0, beforeBytes - afterBytes),
                "currentUsedBytes", afterBytes,
                "quotaBytes", storage.getQuotaBytes()
        );
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
