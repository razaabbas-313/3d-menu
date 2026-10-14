package com.atelierar.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

/**
 * AWS S3 storage implementation. Uses AWS SDK for Java v2 with UrlConnectionHttpClient
 * for low memory footprint on free-tier containers.
 */
public class S3StorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3;
    private final String bucket;
    private final String publicBaseUrl;
    private final long maxModelBytes;
    private final long quotaBytes;

    public S3StorageService(@Value("${aws.region:${AWS_REGION:us-east-1}}") String region,
                            @Value("${app.storage.s3.bucket:${S3_BUCKET:}}") String bucket,
                            @Value("${app.storage.s3.public-base-url:${S3_PUBLIC_BASE_URL:}}") String publicBaseUrl,
                            @Value("${app.storage.max-model-mb:15}") long maxModelMb,
                            @Value("${app.storage.quota-mb:100}") long quotaMb) {
        this.bucket = bucket.trim();
        String url = publicBaseUrl != null ? publicBaseUrl.trim() : "";
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        this.publicBaseUrl = url;
        this.maxModelBytes = maxModelMb * 1024L * 1024L;
        this.quotaBytes = quotaMb * 1024L * 1024L;

        this.s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();

        log.info("S3StorageService initialized for bucket '{}' (region: {}, publicBaseUrl: {})", bucket, region, this.publicBaseUrl);
    }

    // Constructor for testing with mock S3Client
    public S3StorageService(S3Client s3, String bucket, String publicBaseUrl, long maxModelMb, long quotaMb) {
        this.s3 = s3;
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        this.maxModelBytes = maxModelMb * 1024L * 1024L;
        this.quotaBytes = quotaMb * 1024L * 1024L;
    }

    @Override
    public String saveItemModel(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException {
        StorageValidator.validateModel(file, maxModelBytes);
        checkQuota(restaurantId, file.getSize());

        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/" + UUID.randomUUID() + ".glb";
        } else {
            key = "models/" + UUID.randomUUID() + ".glb";
        }
        putObject(key, file.getBytes(), "model/gltf-binary", "public, max-age=31536000, immutable");
        return toPublicUrl(key);
    }

    @Override
    public String saveItemImage(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException {
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);
        checkQuota(restaurantId, file.getSize());

        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/image-" + UUID.randomUUID() + "." + info.extension();
        } else {
            key = "images/" + UUID.randomUUID() + "." + info.extension();
        }
        putObject(key, file.getBytes(), info.mimeType(), "public, max-age=31536000, immutable");
        return toPublicUrl(key);
    }

    @Override
    public String saveCoverImage(UUID restaurantId, MultipartFile file) throws IOException {
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);
        checkQuota(restaurantId, file.getSize());

        String key;
        if (restaurantId != null) {
            key = "restaurants/" + restaurantId + "/cover/cover-" + UUID.randomUUID() + "." + info.extension();
        } else {
            key = "images/" + UUID.randomUUID() + "." + info.extension();
        }
        putObject(key, file.getBytes(), info.mimeType(), "public, max-age=31536000, immutable");
        return toPublicUrl(key);
    }

    @Override
    public String savePublicSnapshot(String slug, String json) throws IOException {
        String key = "public/" + slug + "/menu.json";
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        putObject(key, bytes, "application/json", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
        return toPublicUrl(key);
    }

    @Override
    public Optional<String> getPublicSnapshot(String slug) {
        String key = "public/" + slug + "/menu.json";
        try {
            var responseBytes = s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build());
            return Optional.of(responseBytes.asUtf8String());
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch S3 snapshot for {}: {}", slug, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void deleteQuietly(String url) {
        if (url == null || url.isBlank()) return;
        String key = extractKey(url);
        if (key == null) return;
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            log.debug("Deleted S3 object: {}", key);
        } catch (Exception e) {
            log.warn("Could not delete S3 object {}: {}", key, e.getMessage());
        }
    }

    @Override
    public Optional<Path> getLocalRoot() {
        return Optional.empty();
    }

    @Override
    public boolean isLocal() {
        return false;
    }

    @Override
    public long getRestaurantStorageUsage(UUID restaurantId) {
        if (restaurantId == null || bucket.isEmpty()) return 0;
        String prefix = "restaurants/" + restaurantId + "/";
        long totalBytes = 0;
        try {
            ListObjectsV2Request req = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(prefix)
                    .build();
            ListObjectsV2Response res;
            do {
                res = s3.listObjectsV2(req);
                for (S3Object obj : res.contents()) {
                    totalBytes += obj.size();
                }
                req = req.toBuilder().continuationToken(res.nextContinuationToken()).build();
            } while (res.isTruncated());
        } catch (Exception e) {
            log.warn("Error calculating storage usage for restaurant {}: {}", restaurantId, e.getMessage());
        }
        return totalBytes;
    }

    private void checkQuota(UUID restaurantId, long newBytes) {
        if (restaurantId == null) return;
        long current = getRestaurantStorageUsage(restaurantId);
        if (current + newBytes > quotaBytes) {
            long quotaMb = quotaBytes / (1024 * 1024);
            throw StorageValidator.tooLarge("Storage quota exceeded (" + quotaMb + " MB limit). Delete unused dishes or models to free up space.");
        }
    }

    private void putObject(String key, byte[] content, String contentType, String cacheControl) {
        if (bucket.isEmpty()) {
            throw StorageValidator.bad("S3 storage is enabled but S3_BUCKET is not configured.");
        }
        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .cacheControl(cacheControl)
                .build();
        s3.putObject(req, RequestBody.fromBytes(content));
    }

    private String toPublicUrl(String key) {
        if (!publicBaseUrl.isEmpty()) {
            return publicBaseUrl + "/" + key;
        }
        return "https://" + bucket + ".s3.amazonaws.com/" + key;
    }

    private String extractKey(String url) {
        if (!publicBaseUrl.isEmpty() && url.startsWith(publicBaseUrl)) {
            String sub = url.substring(publicBaseUrl.length());
            return sub.startsWith("/") ? sub.substring(1) : sub;
        }
        String s3Prefix = "https://" + bucket + ".s3.amazonaws.com/";
        if (url.startsWith(s3Prefix)) {
            return url.substring(s3Prefix.length());
        }
        if (url.startsWith("/uploads/")) {
            return url.substring("/uploads/".length());
        }
        return null;
    }
}
