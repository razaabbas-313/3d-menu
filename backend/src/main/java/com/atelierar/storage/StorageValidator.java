package com.atelierar.storage;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

public final class StorageValidator {
    public static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024; // 10 MB

    private StorageValidator() {}

    public static void validateModel(MultipartFile file, long maxModelBytes) throws IOException {
        if (file == null || file.isEmpty()) {
            throw bad("Choose a .glb file to upload.");
        }
        if (file.getSize() > maxModelBytes) {
            long maxMb = maxModelBytes / (1024 * 1024);
            throw tooLarge("The 3D model is larger than " + maxMb + " MB. Compress it and try again.");
        }
        byte[] head;
        try (var is = file.getInputStream()) {
            head = is.readNBytes(12);
        }
        boolean glb = head.length >= 12
                && head[0] == 'g' && head[1] == 'l' && head[2] == 'T' && head[3] == 'F' // 0x46546C67
                && head[4] == 2 && head[5] == 0 && head[6] == 0 && head[7] == 0; // version 2
        if (!glb) {
            throw bad("This is not a valid .glb (glTF 2.0 binary) file. Export your model as GLB.");
        }
    }

    public record ImageInfo(String extension, String mimeType) {}

    public static ImageInfo validateImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw bad("Choose an image to upload.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw tooLarge("The image is larger than 10 MB. Use a smaller photo.");
        }
        byte[] h;
        try (var is = file.getInputStream()) {
            h = is.readNBytes(12);
        }
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return new ImageInfo("jpg", "image/jpeg");
        }
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') {
            return new ImageInfo("png", "image/png");
        }
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return new ImageInfo("webp", "image/webp");
        }
        throw bad("Upload a JPG, PNG or WebP image.");
    }

    public static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    public static ResponseStatusException tooLarge(String message) {
        return new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, message);
    }
}
