package com.atelierar.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

/**
 * Storage service interface abstracting local disk and AWS S3 storage.
 */
public interface StorageService {
    String PREFIX = "/uploads/";

    String saveItemModel(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException;

    String saveItemImage(UUID restaurantId, UUID itemId, MultipartFile file) throws IOException;

    String saveCoverImage(UUID restaurantId, MultipartFile file) throws IOException;

    String savePublicSnapshot(String slug, String json) throws IOException;

    Optional<String> getPublicSnapshot(String slug);

    void deleteQuietly(String url);

    default String saveModel(MultipartFile file) throws IOException {
        return saveItemModel(null, null, file);
    }

    default String saveImage(MultipartFile file) throws IOException {
        return saveItemImage(null, null, file);
    }

    Optional<Path> getLocalRoot();

    boolean isLocal();

    long getRestaurantStorageUsage(UUID restaurantId);
}
