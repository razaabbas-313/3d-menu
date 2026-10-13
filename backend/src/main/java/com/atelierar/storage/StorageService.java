package com.atelierar.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Local-disk file storage. Files are validated by their content (magic bytes), never by file name,
 * and stored under random names. Swap this class for S3/R2/GCS when you deploy to several servers.
 */
@Service
public class StorageService {
    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final String PREFIX = "/uploads/";
    public static final long MAX_MODEL_BYTES = 25L * 1024 * 1024;
    public static final long MAX_IMAGE_BYTES = 6L * 1024 * 1024;

    private final Path root;

    public StorageService(@Value("${app.storage.dir}") String dir) throws IOException {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        Files.createDirectories(root.resolve("models"));
        Files.createDirectories(root.resolve("images"));
    }

    public Path root() {
        return root;
    }

    /** Stores a binary glTF (.glb) file and returns its public URL path. */
    public String saveModel(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw bad("Choose a .glb file to upload.");
        if (file.getSize() > MAX_MODEL_BYTES) throw bad("The model is larger than 25 MB. Compress it and try again.");
        byte[] head = file.getInputStream().readNBytes(12);
        boolean glb = head.length >= 12 && head[0] == 'g' && head[1] == 'l' && head[2] == 'T' && head[3] == 'F'
                && head[4] == 2 && head[5] == 0 && head[6] == 0 && head[7] == 0; // magic + version 2
        if (!glb) throw bad("This is not a valid .glb (glTF 2.0 binary) file. Export your model as GLB.");
        return write("models", "glb", file);
    }

    /** Stores a JPEG, PNG or WebP image and returns its public URL path. */
    public String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw bad("Choose an image to upload.");
        if (file.getSize() > MAX_IMAGE_BYTES) throw bad("The image is larger than 6 MB. Use a smaller photo.");
        byte[] h = file.getInputStream().readNBytes(12);
        String ext = null;
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) ext = "jpg";
        else if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') ext = "png";
        else if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') ext = "webp";
        if (ext == null) throw bad("Upload a JPG, PNG or WebP image.");
        return write("images", ext, file);
    }

    /** Deletes a previously stored file. Ignores external URLs, nulls and anything outside the storage root. */
    public void deleteQuietly(String url) {
        if (url == null || !url.startsWith(PREFIX)) return;
        try {
            Path p = root.resolve(url.substring(PREFIX.length())).normalize();
            if (p.startsWith(root)) Files.deleteIfExists(p);
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete {}: {}", url, e.getMessage());
        }
    }

    private String write(String folder, String ext, MultipartFile file) throws IOException {
        String name = UUID.randomUUID() + "." + ext;
        Path dest = root.resolve(folder).resolve(name).normalize();
        if (!dest.startsWith(root)) throw bad("Invalid file name.");
        file.transferTo(dest);
        return PREFIX + folder + "/" + name;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
