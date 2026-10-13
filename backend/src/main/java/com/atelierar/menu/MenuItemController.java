package com.atelierar.menu;

import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantService;
import com.atelierar.storage.StorageService;
import com.atelierar.web.Dtos.ItemDto;
import com.atelierar.web.Dtos.ItemRequest;
import com.atelierar.web.Mappers;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
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

    public MenuItemController(RestaurantService restaurants, MenuItemRepository items, StorageService storage) {
        this.restaurants = restaurants;
        this.items = items;
        this.storage = storage;
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
        return Mappers.item(items.save(item));
    }

    @PutMapping("/{id}")
    public ItemDto update(@PathVariable UUID id, @Valid @RequestBody ItemRequest req) {
        MenuItem item = owned(id);
        String oldImage = item.getImageUrl();
        applyRequest(item, req);
        MenuItem saved = items.save(item);
        if (oldImage != null && !oldImage.equals(saved.getImageUrl())) storage.deleteQuietly(oldImage);
        return Mappers.item(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        MenuItem item = owned(id);
        String image = item.getImageUrl();
        String model = item.getModelUrl();
        items.delete(item);
        storage.deleteQuietly(image);
        storage.deleteQuietly(model);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto uploadImage(@PathVariable UUID id, @RequestParam("file") MultipartFile file) throws IOException {
        MenuItem item = owned(id);
        String url = storage.saveImage(file);
        String old = item.getImageUrl();
        item.setImageUrl(url);
        MenuItem saved = items.save(item);
        storage.deleteQuietly(old);
        return Mappers.item(saved);
    }

    @PostMapping(value = "/{id}/model", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto uploadModel(@PathVariable UUID id, @RequestParam("file") MultipartFile file) throws IOException {
        MenuItem item = owned(id);
        String url = storage.saveModel(file);
        String old = item.getModelUrl();
        item.setModel(url, displayName(file.getOriginalFilename()));
        MenuItem saved = items.save(item);
        storage.deleteQuietly(old);
        return Mappers.item(saved);
    }

    @DeleteMapping("/{id}/model")
    public ItemDto removeModel(@PathVariable UUID id) {
        MenuItem item = owned(id);
        String old = item.getModelUrl();
        item.setModel(null, null);
        MenuItem saved = items.save(item);
        storage.deleteQuietly(old);
        return Mappers.item(saved);
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
        return Mappers.item(items.save(item));
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
                req.modelPlacement() != null ? req.modelPlacement() : (item.getModelPlacement() != null ? item.getModelPlacement() : "plate"));
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
