package com.atelierar.storage;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * One-off migration tool to move legacy local files from /uploads into AWS S3
 * and rewrite database URLs.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class StorageMigrationController {
    private static final Logger log = LoggerFactory.getLogger(StorageMigrationController.class);

    private final StorageService storage;
    private final MenuItemRepository items;
    private final RestaurantRepository restaurants;
    private final String s3Bucket;
    private final String s3PublicBaseUrl;
    private final String localDir;
    private final String migrationKey;

    public StorageMigrationController(StorageService storage,
                                      MenuItemRepository items,
                                      RestaurantRepository restaurants,
                                      @Value("${app.storage.s3.bucket:${S3_BUCKET:}}") String s3Bucket,
                                      @Value("${app.storage.s3.public-base-url:${S3_PUBLIC_BASE_URL:}}") String s3PublicBaseUrl,
                                      @Value("${app.storage.dir:uploads}") String localDir,
                                      @Value("${app.migration.secret:${JWT_SECRET:}}") String migrationKey) {
        this.storage = storage;
        this.items = items;
        this.restaurants = restaurants;
        this.s3Bucket = s3Bucket.trim();
        this.s3PublicBaseUrl = s3PublicBaseUrl.endsWith("/") ? s3PublicBaseUrl.substring(0, s3PublicBaseUrl.length() - 1) : s3PublicBaseUrl.trim();
        this.localDir = localDir;
        this.migrationKey = migrationKey;
    }

    @PostMapping("/migrate-storage")
    public ResponseEntity<Map<String, Object>> migrateToS3(@RequestHeader(value = "X-Migration-Key", required = false) String key) {
        if (migrationKey.isBlank() || key == null || !migrationKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid migration key");
        }
        if (storage.isLocal()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "STORAGE_PROVIDER must be set to 's3' to perform migration.");
        }
        if (s3Bucket.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "S3_BUCKET must be configured for migration.");
        }

        Path root = Paths.get(localDir).toAbsolutePath().normalize();
        if (!Files.exists(root)) {
            return ResponseEntity.ok(Map.of("message", "No local uploads directory found to migrate", "root", root.toString()));
        }

        int uploadedCount = 0;
        int updatedItems = 0;
        int updatedRestaurants = 0;

        try (Stream<Path> stream = Files.walk(root)) {
            List<Path> files = stream.filter(Files::isRegularFile).toList();
            for (Path file : files) {
                String relativeKey = root.relativize(file).toString().replace('\\', '/');
                byte[] bytes = Files.readAllBytes(file);
                String contentType = detectContentType(relativeKey);

                // Upload to S3 if not already there
                if (storage instanceof S3StorageService s3Service) {
                    try {
                        var field = S3StorageService.class.getDeclaredField("s3");
                        field.setAccessible(true);
                        S3Client s3Client = (S3Client) field.get(s3Service);
                        s3Client.putObject(PutObjectRequest.builder()
                                .bucket(s3Bucket)
                                .key(relativeKey)
                                .contentType(contentType)
                                .cacheControl("public, max-age=31536000, immutable")
                                .build(), RequestBody.fromBytes(bytes));
                        uploadedCount++;
                    } catch (Exception e) {
                        log.error("Failed to upload file {} to S3: {}", relativeKey, e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error scanning local files: " + e.getMessage());
        }

        // Rewrite local /uploads/... URLs in database
        String prefix = "/uploads/";
        List<MenuItem> allItems = items.findAll();
        for (MenuItem item : allItems) {
            boolean changed = false;
            if (item.getImageUrl() != null && item.getImageUrl().startsWith(prefix)) {
                String keyPath = item.getImageUrl().substring(prefix.length());
                item.setImageUrl(toPublicUrl(keyPath));
                changed = true;
            }
            if (item.getModelUrl() != null && item.getModelUrl().startsWith(prefix)) {
                String keyPath = item.getModelUrl().substring(prefix.length());
                item.setModel(toPublicUrl(keyPath), item.getModelFileName());
                changed = true;
            }
            if (changed) {
                items.save(item);
                updatedItems++;
            }
        }

        List<Restaurant> allRestaurants = restaurants.findAll();
        for (Restaurant r : allRestaurants) {
            if (r.getCoverUrl() != null && r.getCoverUrl().startsWith(prefix)) {
                String keyPath = r.getCoverUrl().substring(prefix.length());
                r.setCoverUrl(toPublicUrl(keyPath));
                restaurants.save(r);
                updatedRestaurants++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("filesUploadedToS3", uploadedCount);
        result.put("menuItemsRewritten", updatedItems);
        result.put("restaurantsRewritten", updatedRestaurants);
        return ResponseEntity.ok(result);
    }

    private String toPublicUrl(String key) {
        if (!s3PublicBaseUrl.isEmpty()) {
            return s3PublicBaseUrl + "/" + key;
        }
        return "https://" + s3Bucket + ".s3.amazonaws.com/" + key;
    }

    private String detectContentType(String key) {
        String lower = key.toLowerCase();
        if (lower.endsWith(".glb")) return "model/gltf-binary";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }
}
