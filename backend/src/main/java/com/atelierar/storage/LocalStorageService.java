package com.atelierar.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Local-disk file storage. Used for development and local testing.
 */
public class LocalStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path root;
    private final long maxModelBytes;
    private final long quotaBytes;

    public LocalStorageService(@Value("${app.storage.dir:uploads}") String dir,
                               @Value("${app.storage.max-model-mb:15}") long maxModelMb,
                               @Value("${app.storage.quota-mb:100}") long quotaMb) throws IOException {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        this.maxModelBytes = maxModelMb * 1024L * 1024L;
        this.quotaBytes = quotaMb * 1024L * 1024L;
        Files.createDirectories(root.resolve("models"));
        Files.createDirectories(root.resolve("images"));
        Files.createDirectories(root.resolve("public"));
    }

    @Override
    public String saveItemModel(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException {
        StorageValidator.validateModel(file, maxModelBytes);
        checkQuota(restaurantId, file.getSize());

        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/" + UUID.randomUUID() + ".glb";
        } else {
            relativePath = "models/" + UUID.randomUUID() + ".glb";
        }
        return write(relativePath, file);
    }

    @Override
    public String saveItemImage(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException {
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);
        checkQuota(restaurantId, file.getSize());

        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/image-" + UUID.randomUUID() + "." + info.extension();
        } else {
            relativePath = "images/" + UUID.randomUUID() + "." + info.extension();
        }
        return write(relativePath, file);
    }

    @Override
    public String saveCoverImage(UUID restaurantId, MultipartFile file) throws IOException {
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);
        checkQuota(restaurantId, file.getSize());

        String relativePath;
        if (restaurantId != null) {
            relativePath = "restaurants/" + restaurantId + "/cover/cover-" + UUID.randomUUID() + "." + info.extension();
        } else {
            relativePath = "images/" + UUID.randomUUID() + "." + info.extension();
        }
        return write(relativePath, file);
    }

    @Override
    public String savePublicSnapshot(String slug, String json) throws IOException {
        Path snapshotPath = root.resolve("public").resolve(slug).resolve("menu.json").normalize();
        if (!snapshotPath.startsWith(root)) {
            throw StorageValidator.bad("Invalid menu slug");
        }
        Files.createDirectories(snapshotPath.getParent());
        Files.writeString(snapshotPath, json, StandardCharsets.UTF_8);
        return PREFIX + "public/" + slug + "/menu.json";
    }

    @Override
    public Optional<String> getPublicSnapshot(String slug) {
        Path snapshotPath = root.resolve("public").resolve(slug).resolve("menu.json").normalize();
        if (Files.exists(snapshotPath)) {
            try {
                return Optional.of(Files.readString(snapshotPath, StandardCharsets.UTF_8));
            } catch (IOException e) {
                log.warn("Failed to read snapshot for {}: {}", slug, e.getMessage());
            }
        }
        return Optional.empty();
    }

    @Override
    public void deleteQuietly(String url) {
        if (url == null || !url.startsWith(PREFIX)) return;
        try {
            Path p = root.resolve(url.substring(PREFIX.length())).normalize();
            if (p.startsWith(root)) {
                Files.deleteIfExists(p);
            }
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete {}: {}", url, e.getMessage());
        }
    }

    @Override
    public Optional<Path> getLocalRoot() {
        return Optional.of(root);
    }

    @Override
    public boolean isLocal() {
        return true;
    }

    @Override
    public long getRestaurantStorageUsage(UUID restaurantId) {
        if (restaurantId == null) return 0;
        Path restDir = root.resolve("restaurants").resolve(restaurantId.toString());
        if (!Files.exists(restDir)) return 0;
        try (Stream<Path> stream = Files.walk(restDir)) {
            return stream.filter(Files::isRegularFile)
                    .mapToLong(p -> {
                        try {
                            return Files.size(p);
                        } catch (IOException e) {
                            return 0L;
                        }
                    })
                    .sum();
        } catch (IOException e) {
            log.warn("Failed to calculate storage for {}: {}", restaurantId, e.getMessage());
            return 0;
        }
    }

    private void checkQuota(UUID restaurantId, long newBytes) {
        if (restaurantId == null) return;
        long current = getRestaurantStorageUsage(restaurantId);
        if (current + newBytes > quotaBytes) {
            long quotaMb = quotaBytes / (1024 * 1024);
            throw StorageValidator.tooLarge("Storage quota exceeded (" + quotaMb + " MB limit). Delete unused dishes or models to free up space.");
        }
    }

    private String write(String relativePath, MultipartFile file) throws IOException {
        Path dest = root.resolve(relativePath).normalize();
        if (!dest.startsWith(root)) {
            throw StorageValidator.bad("Invalid file path.");
        }
        Files.createDirectories(dest.getParent());
        file.transferTo(dest);
        return PREFIX + relativePath.replace('\\', '/');
    }
}
