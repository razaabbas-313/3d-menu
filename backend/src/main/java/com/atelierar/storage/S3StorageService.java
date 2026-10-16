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
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * AWS S3 storage implementation. Uses AWS SDK for Java v2 with UrlConnectionHttpClient
 * for low memory footprint on free-tier containers. Keeps bucket private by default
 * and provides secure asset delivery via CloudFront or S3 presigned URLs.
 */
public class S3StorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;
    private final String region;
    private final String publicBaseUrl;
    private final long maxModelBytes;
    private final long quotaBytes;

    public S3StorageService(@Value("${aws.region:${AWS_REGION:us-east-1}}") String region,
                            @Value("${app.storage.s3.bucket:${S3_BUCKET:}}") String bucket,
                            @Value("${app.storage.s3.public-base-url:${S3_PUBLIC_BASE_URL:}}") String publicBaseUrl,
                            @Value("${aws.access-key-id:${AWS_ACCESS_KEY_ID:}}") String accessKeyId,
                            @Value("${aws.secret-access-key:${AWS_SECRET_ACCESS_KEY:}}") String secretAccessKey,
                            @Value("${app.storage.max-model-mb:15}") long maxModelMb,
                            @Value("${app.storage.quota-mb:100}") long quotaMb) {
        this.region = region != null && !region.isBlank() ? region.trim() : "us-east-1";
        this.bucket = bucket != null ? bucket.trim() : "";
        String url = publicBaseUrl != null ? publicBaseUrl.trim() : "";
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        this.publicBaseUrl = url;
        this.maxModelBytes = maxModelMb * 1024L * 1024L;
        this.quotaBytes = quotaMb * 1024L * 1024L;

        software.amazon.awssdk.auth.credentials.AwsCredentialsProvider credentialsProvider;
        if (accessKeyId != null && !accessKeyId.isBlank() && secretAccessKey != null && !secretAccessKey.isBlank()) {
            credentialsProvider = software.amazon.awssdk.auth.credentials.StaticCredentialsProvider.create(
                    software.amazon.awssdk.auth.credentials.AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim())
            );
        } else {
            credentialsProvider = DefaultCredentialsProvider.create();
        }

        this.s3 = S3Client.builder()
                .region(Region.of(this.region))
                .credentialsProvider(credentialsProvider)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();

        this.presigner = S3Presigner.builder()
                .region(Region.of(this.region))
                .credentialsProvider(credentialsProvider)
                .build();

        log.info("S3StorageService initialized for bucket '{}' (region: {}, publicBaseUrl: {})", this.bucket, this.region, this.publicBaseUrl);
    }

    public S3StorageService(S3Client s3, String bucket, String publicBaseUrl, long maxModelMb, long quotaMb) {
        this(s3, null, bucket, "us-east-1", publicBaseUrl, maxModelMb, quotaMb);
    }

    public S3StorageService(S3Client s3, String bucket, String region, String publicBaseUrl, long maxModelMb, long quotaMb) {
        this(s3, null, bucket, region, publicBaseUrl, maxModelMb, quotaMb);
    }

    public S3StorageService(S3Client s3, S3Presigner presigner, String bucket, String region, String publicBaseUrl, long maxModelMb, long quotaMb) {
        this.s3 = s3;
        this.presigner = presigner;
        this.bucket = bucket != null ? bucket.trim() : "";
        this.region = region != null && !region.isBlank() ? region.trim() : "us-east-1";
        this.publicBaseUrl = publicBaseUrl != null && publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : (publicBaseUrl != null ? publicBaseUrl.trim() : "");
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
    public String saveItemOriginalModel(UUID restaurantId, UUID itemId, byte[] content, String originalFilename) throws IOException {
        checkQuota(restaurantId, content.length);
        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/original-" + UUID.randomUUID() + ".glb";
        } else {
            key = "models/original-" + UUID.randomUUID() + ".glb";
        }
        // Private original model: not publicly cached, private control
        putObject(key, content, "model/gltf-binary", "private, no-cache");
        return "s3://" + bucket + "/" + key;
    }

    @Override
    public String saveItemOptimizedModel(UUID restaurantId, UUID itemId, byte[] content) throws IOException {
        checkQuota(restaurantId, content.length);
        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/" + UUID.randomUUID() + ".glb";
        } else {
            key = "models/" + UUID.randomUUID() + ".glb";
        }
        putObject(key, content, "model/gltf-binary", "public, max-age=31536000, immutable");
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
    public String saveItemImageBytes(UUID restaurantId, UUID itemId, byte[] content, String extension, String mimeType) throws IOException {
        checkQuota(restaurantId, content.length);
        String ext = (extension != null && !extension.isBlank()) ? extension : "jpg";
        String mime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";
        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/image-" + UUID.randomUUID() + "." + ext;
        } else {
            key = "images/" + UUID.randomUUID() + "." + ext;
        }
        putObject(key, content, mime, "public, max-age=31536000, immutable");
        return toPublicUrl(key);
    }

    @Override
    public String saveItemThumbnail(UUID restaurantId, UUID itemId, byte[] content, String extension, String mimeType) throws IOException {
        checkQuota(restaurantId, content.length);
        String ext = (extension != null && !extension.isBlank()) ? extension : "jpg";
        String mime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";
        String key;
        if (restaurantId != null && itemId != null) {
            key = "restaurants/" + restaurantId + "/items/" + itemId + "/thumb-" + UUID.randomUUID() + "." + ext;
        } else {
            key = "images/thumb-" + UUID.randomUUID() + "." + ext;
        }
        putObject(key, content, mime, "public, max-age=31536000, immutable");
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

    @Override
    public String generatePresignedGetUrl(String urlOrKey, Duration duration) {
        if (urlOrKey == null || urlOrKey.isBlank() || bucket.isEmpty() || presigner == null) {
            return urlOrKey;
        }
        String key = extractKey(urlOrKey);
        if (key == null) key = urlOrKey;
        if (key.startsWith("/")) key = key.substring(1);

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(duration != null ? duration : Duration.ofHours(24))
                    .getObjectRequest(getObjectRequest)
                    .build();
            PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
            return presigned.url().toString();
        } catch (Exception e) {
            log.warn("Failed to generate presigned GET URL for key '{}': {}", key, e.getMessage());
            return urlOrKey;
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
        if (presigner != null) {
            return generatePresignedGetUrl(key, Duration.ofDays(7));
        }
        if (region != null && !region.isBlank() && !region.equalsIgnoreCase("us-east-1")) {
            return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
        }
        return "https://" + bucket + ".s3.amazonaws.com/" + key;
    }

    private String extractKey(String url) {
        if (url == null || url.isBlank()) return null;
        int q = url.indexOf('?');
        String cleanUrl = q > 0 ? url.substring(0, q) : url;

        if (cleanUrl.startsWith("s3://" + bucket + "/")) {
            return cleanUrl.substring(("s3://" + bucket + "/").length());
        }
        if (!publicBaseUrl.isEmpty() && cleanUrl.startsWith(publicBaseUrl)) {
            String sub = cleanUrl.substring(publicBaseUrl.length());
            return sub.startsWith("/") ? sub.substring(1) : sub;
        }
        String regionalPrefix = "https://" + bucket + ".s3." + region + ".amazonaws.com/";
        if (cleanUrl.startsWith(regionalPrefix)) {
            return cleanUrl.substring(regionalPrefix.length());
        }
        String s3Prefix = "https://" + bucket + ".s3.amazonaws.com/";
        if (cleanUrl.startsWith(s3Prefix)) {
            return cleanUrl.substring(s3Prefix.length());
        }
        if (cleanUrl.startsWith("/uploads/")) {
            return cleanUrl.substring("/uploads/".length());
        }
        return null;
    }
}
