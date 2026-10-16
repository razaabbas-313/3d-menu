package com.atelierar.menu;

import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantService;
import com.atelierar.storage.StorageService;
import com.atelierar.storage.StorageValidator;
import com.atelierar.web.Dtos.ItemDto;
import com.atelierar.web.Dtos.ItemRequest;
import com.atelierar.web.Mappers;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Owner-facing CRUD. Every query is scoped to the signed-in owner's restaurant. */
@RestController
@RequestMapping("/api/v1/items")
public class MenuItemController {
    private final RestaurantService restaurants;
    private final MenuItemRepository items;
    private final StorageService storage;
    private final com.atelierar.publicapi.PublicMenuSnapshotService snapshots;
    private final ModelOptimizationService modelOptimizer;
    private final ImageOptimizationService imageOptimizer;
    private final long maxModelBytes;

    public MenuItemController(RestaurantService restaurants,
                              MenuItemRepository items,
                              StorageService storage,
                              com.atelierar.publicapi.PublicMenuSnapshotService snapshots,
                              ModelOptimizationService modelOptimizer,
                              ImageOptimizationService imageOptimizer,
                              @Value("${app.storage.max-model-mb:15}") long maxModelMb) {
        this.restaurants = restaurants;
        this.items = items;
        this.storage = storage;
        this.snapshots = snapshots;
        this.modelOptimizer = modelOptimizer;
        this.imageOptimizer = imageOptimizer;
        this.maxModelBytes = maxModelMb * 1024L * 1024L;
    }

    @GetMapping
    public List<ItemDto> list() {
        Restaurant r = restaurants.current();
        return items.findByRestaurantIdOrderByCreatedAtDesc(r.getId()).stream().map(Mappers::item).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemDto create(@Valid @RequestBody ItemRequest req) {
        Restaurant r = restaurants.current();
        MenuItem item = new MenuItem(r.getId());
        applyRequest(item, req);
        MenuItem saved = items.save(item);
        snapshots.updateSnapshot(r.getId());
        return Mappers.item(saved);
    }

    @PutMapping("/{id}")
    public ItemDto update(@PathVariable UUID id, @Valid @RequestBody ItemRequest req) {
        MenuItem item = owned(id);
        String oldImage = item.getImageUrl();
        applyRequest(item, req);
        MenuItem saved = items.save(item);
        if (oldImage != null && !oldImage.equals(saved.getImageUrl())) {
            storage.deleteQuietly(oldImage);
            if (item.getThumbnailUrl() != null) {
                storage.deleteQuietly(item.getThumbnailUrl());
                item.setThumbnailUrl(null);
                saved = items.save(item);
            }
        }
        snapshots.updateSnapshot(saved.getRestaurantId());
        return Mappers.item(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        MenuItem item = owned(id);
        String image = item.getImageUrl();
        String thumb = item.getThumbnailUrl();
        String model = item.getModelUrl();
        String originalModel = item.getOriginalModelUrl();
        items.delete(item);
        storage.deleteQuietly(image);
        storage.deleteQuietly(thumb);
        storage.deleteQuietly(model);
        storage.deleteQuietly(originalModel);
        snapshots.updateSnapshot(item.getRestaurantId());
    }

    @PatchMapping("/{id}/available")
    public ItemDto toggleAvailable(@PathVariable UUID id, @RequestParam boolean value) {
        MenuItem item = owned(id);
        item.apply(item.getName(), item.getCategory(), item.getDescription(), item.getPrice(), item.getTags(),
                item.isFeatured(), value, item.isPublished(), item.getImageUrl(), item.getModelScale(), item.getModelPlacement(),
                item.getNameUr(), item.getDescriptionUr(), item.getNameAr(), item.getDescriptionAr());
        MenuItem saved = items.save(item);
        snapshots.updateSnapshot(saved.getRestaurantId());
        return Mappers.item(saved);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto uploadImage(@PathVariable UUID id, @RequestParam("file") MultipartFile file) throws IOException {
        MenuItem item = owned(id);
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);

        byte[] rawBytes = file.getBytes();
        ImageOptimizationService.ImageResult imgResult = imageOptimizer.optimize(rawBytes, info);

        String mainUrl = storage.saveItemImageBytes(item.getRestaurantId(), item.getId(), imgResult.mainBytes(), imgResult.mainExtension(), imgResult.mainMimeType());
        String thumbUrl = storage.saveItemThumbnail(item.getRestaurantId(), item.getId(), imgResult.thumbnailBytes(), imgResult.thumbExtension(), imgResult.thumbMimeType());

        String oldImage = item.getImageUrl();
        String oldThumb = item.getThumbnailUrl();

        item.setImageUrl(mainUrl);
        item.setThumbnailUrl(thumbUrl);
        MenuItem saved = items.save(item);

        if (oldImage != null && !oldImage.equals(mainUrl)) storage.deleteQuietly(oldImage);
        if (oldThumb != null && !oldThumb.equals(thumbUrl)) storage.deleteQuietly(oldThumb);

        snapshots.updateSnapshot(saved.getRestaurantId());
        return Mappers.item(saved);
    }

    @PostMapping(value = "/{id}/model", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto uploadModel(@PathVariable UUID id, @RequestParam("file") MultipartFile file) throws IOException {
        MenuItem item = owned(id);
        StorageValidator.validateModel(file, maxModelBytes);

        // Track lifecycle state
        item.setModelStatus("PROCESSING");
        item.setModelFileName(displayName(file.getOriginalFilename()));
        items.save(item);

        try {
            byte[] originalBytes = file.getBytes();
            long origSize = originalBytes.length;

            // 1. Store original model privately in S3
            String oldOriginal = item.getOriginalModelUrl();
            String originalUrl = storage.saveItemOriginalModel(item.getRestaurantId(), item.getId(), originalBytes, file.getOriginalFilename());

            // 2. Optimize production copy using Draco and WebP pipeline (bypassed safely on 512MB RAM free instances)
            ModelOptimizationService.OptimizationResult optResult = modelOptimizer.optimize(originalBytes, file.getOriginalFilename());

            // 3. Upload optimized model to public S3 / CloudFront location
            String oldModel = item.getModelUrl();
            String optimizedUrl = storage.saveItemOptimizedModel(item.getRestaurantId(), item.getId(), optResult.optimizedBytes());

            // 4. Update database item metadata
            item.setModel(optimizedUrl, displayName(file.getOriginalFilename()));
            item.setOriginalModelUrl(originalUrl);
            item.setOriginalModelFileSize(origSize);
            item.setModelFileSize(optResult.optimizedSize());
            item.setModelStatus(optResult.status());
            item.setModelOptimizationNotes(optResult.notes());
            MenuItem saved = items.save(item);

            // 5. Clean up old assets quietly
            if (oldModel != null && !oldModel.equals(optimizedUrl)) storage.deleteQuietly(oldModel);
            if (oldOriginal != null && !oldOriginal.equals(originalUrl)) storage.deleteQuietly(oldOriginal);

            // 6. Update menu snapshot ONLY after asset is successfully processed
            if ("READY".equalsIgnoreCase(saved.getModelStatus())) {
                snapshots.updateSnapshot(saved.getRestaurantId());
            }

            return Mappers.item(saved);
        } catch (Exception e) {
            // Revert state so dish is never stuck in PROCESSING on failure
            item.setModelStatus("READY");
            items.save(item);
            throw e;
        }
    }

    @DeleteMapping("/{id}/model")
    public ItemDto removeModel(@PathVariable UUID id) {
        MenuItem item = owned(id);
        String oldModel = item.getModelUrl();
        String oldOriginal = item.getOriginalModelUrl();
        item.setModel(null, null);
        item.setOriginalModelUrl(null);
        item.setModelFileSize(null);
        item.setOriginalModelFileSize(null);
        item.setModelStatus("READY");
        item.setModelOptimizationNotes(null);
        MenuItem saved = items.save(item);
        if (oldModel != null) storage.deleteQuietly(oldModel);
        if (oldOriginal != null) storage.deleteQuietly(oldOriginal);
        snapshots.updateSnapshot(saved.getRestaurantId());
        return Mappers.item(saved);
    }

    @GetMapping("/{id}/original-model-url")
    public Map<String, String> getOriginalModelUrl(@PathVariable UUID id) {
        MenuItem item = owned(id);
        if (item.getOriginalModelUrl() == null || item.getOriginalModelUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No original model available for this dish.");
        }
        String presignedUrl = storage.generatePresignedGetUrl(item.getOriginalModelUrl(), Duration.ofMinutes(15));
        return Map.of("url", presignedUrl);
    }

    @PatchMapping("/{id}/model-tuning")
    public ItemDto updateModelTuning(@PathVariable UUID id,
                                     @RequestParam(required = false) Double scale,
                                     @RequestParam(required = false) String placement) {
        MenuItem item = owned(id);
        if (scale != null && scale >= 0.2 && scale <= 4.0) {
            item.setModelScale(scale);
        }
        if (placement != null && !placement.isBlank()) {
            item.setModelPlacement(placement.trim());
        }
        MenuItem saved = items.save(item);
        snapshots.updateSnapshot(saved.getRestaurantId());
        return Mappers.item(saved);
    }

    // ------------------------------------------------------------------ helpers

    private MenuItem owned(UUID id) {
        Restaurant r = restaurants.current();
        return items.findByIdAndRestaurantId(id, r.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dish not found"));
    }

    private void applyRequest(MenuItem item, ItemRequest req) {
        item.apply(
                req.name().trim(),
                req.category().trim(),
                blankToNull(req.description()),
                req.price(),
                normalizeTags(req.tags()),
                Boolean.TRUE.equals(req.featured()),
                req.available() == null || req.available(),
                req.published() == null || req.published(),
                cleanImageUrl(req.imageUrl(), item.getImageUrl()),
                req.modelScale() != null ? req.modelScale() : (item.getModelScale() != null ? item.getModelScale() : 1.0),
                req.modelPlacement() != null ? req.modelPlacement() : (item.getModelPlacement() != null ? item.getModelPlacement() : "plate"),
                blankToNull(req.nameUr()),
                blankToNull(req.descriptionUr()),
                blankToNull(req.nameAr()),
                blankToNull(req.descriptionAr()));
    }

    /**
     * Photos are attached through the upload endpoint. The JSON API only accepts an external http(s) link,
     * or the value the dish already has (so editing other fields never changes the photo). This also stops
     * one restaurant from pointing at, and later deleting, another restaurant's uploaded file.
     */
    private static String cleanImageUrl(String url, String current) {
        if (url == null || url.isBlank()) return null;
        String u = url.trim();
        if (u.equals(current)) return u;
        if (u.regionMatches(true, 0, "https://", 0, 8) || u.regionMatches(true, 0, "http://", 0, 7)) return u;
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Photo must be uploaded as a file or given as an http(s) link.");
    }

    /** Trim, de-duplicate (case-insensitive), cap at 8 tags of 24 characters. */
    static String normalizeTags(String raw) {
        if (raw == null || raw.isBlank()) return null;
        Map<String, String> unique = new LinkedHashMap<>();
        for (String part : raw.split(",")) {
            String tag = part.trim();
            if (tag.isEmpty()) continue;
            if (tag.length() > 24) tag = tag.substring(0, 24);
            unique.putIfAbsent(tag.toLowerCase(), tag);
            if (unique.size() == 8) break;
        }
        return unique.isEmpty() ? null : String.join(",", new ArrayList<>(unique.values()));
    }

    private static String displayName(String original) {
        if (original == null || original.isBlank()) return "model.glb";
        String cleaned = original.replace('\\', '/');
        String name = cleaned.substring(cleaned.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) return "model.glb";
        return name.length() > 120 ? name.substring(name.length() - 120) : name;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
