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
import java.time.Duration;
import java.util.List;
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
                               @Value("${app.storage.max-model-mb:30}") long maxModelMb,
                               @Value("${app.storage.quota-mb:500}") long quotaMb) throws IOException {
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
    public String saveItemOriginalModel(UUID restaurantId, UUID itemId, byte[] content, String originalFilename) throws IOException {
        checkQuota(restaurantId, content.length);
        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/original-" + UUID.randomUUID() + ".glb";
        } else {
            relativePath = "models/original-" + UUID.randomUUID() + ".glb";
        }
        return writeBytes(relativePath, content);
    }

    @Override
    public String saveItemOptimizedModel(UUID restaurantId, UUID itemId, byte[] content) throws IOException {
        checkQuota(restaurantId, content.length);
        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/" + UUID.randomUUID() + ".glb";
        } else {
            relativePath = "models/" + UUID.randomUUID() + ".glb";
        }
        return writeBytes(relativePath, content);
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
    public String saveItemImageBytes(UUID restaurantId, UUID itemId, byte[] content, String extension, String mimeType) throws IOException {
        checkQuota(restaurantId, content.length);
        String ext = (extension != null && !extension.isBlank()) ? extension : "jpg";
        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/image-" + UUID.randomUUID() + "." + ext;
        } else {
            relativePath = "images/" + UUID.randomUUID() + "." + ext;
        }
        return writeBytes(relativePath, content);
    }

    @Override
    public String saveItemThumbnail(UUID restaurantId, UUID itemId, byte[] content, String extension, String mimeType) throws IOException {
        checkQuota(restaurantId, content.length);
        String ext = (extension != null && !extension.isBlank()) ? extension : "jpg";
        String relativePath;
        if (restaurantId != null && itemId != null) {
            relativePath = "restaurants/" + restaurantId + "/items/" + itemId + "/thumb-" + UUID.randomUUID() + "." + ext;
        } else {
            relativePath = "images/thumb-" + UUID.randomUUID() + "." + ext;
        }
        return writeBytes(relativePath, content);
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

    @Override
    public void deletePublicSnapshot(String slug) {
        if (slug == null || slug.isBlank()) return;
        try {
            Path target = root.resolve("public").resolve(slug).resolve("menu.json").normalize();
            if (target.startsWith(root)) {
                Files.deleteIfExists(target);
                log.info("Deleted local public snapshot: {}", target);
            }
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete local public snapshot {}: {}", slug, e.getMessage());
        }
    }

    @Override
    public String generatePresignedPutUrl(String key, String contentType, Duration duration) {
        return null; // Direct S3 presigned PUT is only active when S3 storage provider is configured
    }

    @Override
    public String generatePresignedGetUrl(String urlOrKey, Duration duration) {
        if (urlOrKey == null || urlOrKey.isBlank()) return urlOrKey;
        if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://") || urlOrKey.startsWith(PREFIX)) {
            return urlOrKey;
        }
        return PREFIX + urlOrKey;
    }

    @Override
    public String toPublicUrl(String key) {
        if (key == null || key.isBlank()) return "";
        if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith(PREFIX)) {
            return key;
        }
        return PREFIX + (key.startsWith("/") ? key.substring(1) : key);
    }

    @Override
    public long getQuotaBytes() {
        return quotaBytes;
    }

    @Override
    public String extractKey(String url) {
        if (url == null || url.isBlank()) return null;
        int q = url.indexOf('?');
        String cleanUrl = q > 0 ? url.substring(0, q) : url;
        if (cleanUrl.startsWith(PREFIX)) {
            return cleanUrl.substring(PREFIX.length());
        }
        if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
            int idx = cleanUrl.indexOf(PREFIX);
            if (idx >= 0) return cleanUrl.substring(idx + PREFIX.length());
        }
        return cleanUrl.startsWith("/") ? cleanUrl.substring(1) : cleanUrl;
    }

    @Override
    public int cleanupOrphans(UUID restaurantId, java.util.Set<String> activeKeys) {
        if (restaurantId == null) return 0;
        Path restDir = root.resolve("restaurants").resolve(restaurantId.toString());
        if (!Files.exists(restDir)) return 0;
        int deleted = 0;
        try (Stream<Path> stream = Files.walk(restDir)) {
            List<Path> files = stream.filter(Files::isRegularFile).toList();
            for (Path p : files) {
                String relativeKey = root.relativize(p).toString().replace('\\', '/');
                if (activeKeys == null || !activeKeys.contains(relativeKey)) {
                    Files.deleteIfExists(p);
                    log.info("Purged orphaned local asset for restaurant {}: {}", restaurantId, relativeKey);
                    deleted++;
                }
            }
        } catch (IOException e) {
            log.warn("Failed orphan cleanup for {}: {}", restaurantId, e.getMessage());
        }
        return deleted;
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

    private String writeBytes(String relativePath, byte[] content) throws IOException {
        Path dest = root.resolve(relativePath).normalize();
        if (!dest.startsWith(root)) {
            throw StorageValidator.bad("Invalid file path.");
        }
        Files.createDirectories(dest.getParent());
        Files.write(dest, content);
        return PREFIX + relativePath.replace('\\', '/');
    }
}
