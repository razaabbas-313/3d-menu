package com.atelierar.menu;

import com.atelierar.storage.StorageValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Optimizes dish photos and generates lightweight thumbnails (400px)
 * for snappy mobile menu browsing and reduced data usage.
 */
@Service
public class ImageOptimizationService {
    private static final Logger log = LoggerFactory.getLogger(ImageOptimizationService.class);

    private static final int THUMBNAIL_MAX_DIM = 400;
    private static final int MAIN_MAX_DIM = 1600;

    public record ImageResult(
            byte[] mainBytes,
            String mainExtension,
            String mainMimeType,
            byte[] thumbnailBytes,
            String thumbExtension,
            String thumbMimeType
    ) {}

    public ImageResult optimize(byte[] inputBytes, StorageValidator.ImageInfo info) {
        String ext = info != null ? info.extension() : "jpg";
        String mime = info != null ? info.mimeType() : "image/jpeg";

        if (inputBytes == null || inputBytes.length == 0) {
            return new ImageResult(inputBytes, ext, mime, inputBytes, ext, mime);
        }

        // Strict pre-compressed fast-path:
        // If client already downsampled and compressed the photo (< 350 KB WebP or JPEG, or any WebP),
        // completely bypass Java ImageIO.read(...) and CPU-heavy rasterization to prevent free-tier container choking
        boolean isWebp = "image/webp".equalsIgnoreCase(mime) || "webp".equalsIgnoreCase(ext);
        boolean isJpeg = "image/jpeg".equalsIgnoreCase(mime) || "jpg".equalsIgnoreCase(ext) || "jpeg".equalsIgnoreCase(ext);

        if ((isWebp || isJpeg) && inputBytes.length < 350 * 1024) {
            String targetExt = isWebp ? "webp" : "jpg";
            String targetMime = isWebp ? "image/webp" : "image/jpeg";
            log.info("Client pre-compressed image received ({} KB, {}); bypassing ImageIO.read pass completely.",
                    inputBytes.length / 1024, targetMime);
            return new ImageResult(inputBytes, targetExt, targetMime, inputBytes, targetExt, targetMime);
        }

        if (isWebp) {
            // Standard ImageIO does not natively decode WebP without plugins; pass through directly
            log.info("WebP image received ({} KB); passing through without software rasterization.",
                    inputBytes.length / 1024);
            return new ImageResult(inputBytes, "webp", "image/webp", inputBytes, "webp", "image/webp");
        }

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(inputBytes));
            if (original == null) {
                // If format is not readable by standard ImageIO (e.g. raw WebP), fallback to original bytes
                return new ImageResult(inputBytes, ext, mime, inputBytes, ext, mime);
            }

            int origW = original.getWidth();
            int origH = original.getHeight();

            // 1. Generate Thumbnail (max 400x400)
            byte[] thumbBytes = createResized(original, THUMBNAIL_MAX_DIM, ext);
            if (thumbBytes == null || thumbBytes.length == 0) {
                thumbBytes = inputBytes;
            }

            // 2. Generate Optimized Main Image (max 1600x1600 if larger)
            byte[] mainBytes;
            if (origW > MAIN_MAX_DIM || origH > MAIN_MAX_DIM) {
                mainBytes = createResized(original, MAIN_MAX_DIM, ext);
                if (mainBytes == null || mainBytes.length == 0) {
                    mainBytes = inputBytes;
                }
            } else {
                mainBytes = inputBytes;
            }

            return new ImageResult(mainBytes, ext, mime, thumbBytes, ext, mime);

        } catch (Exception e) {
            log.warn("Image optimization fallback: {}", e.getMessage());
            return new ImageResult(inputBytes, ext, mime, inputBytes, ext, mime);
        }
    }

    private byte[] createResized(BufferedImage src, int maxDimension, String format) {
        int w = src.getWidth();
        int h = src.getHeight();

        double scale = Math.min((double) maxDimension / w, (double) maxDimension / h);
        if (scale >= 1.0 && maxDimension != THUMBNAIL_MAX_DIM) {
            return null; // No need to resize if already smaller than max
        }

        int targetW = Math.max(1, (int) Math.round(w * Math.min(scale, 1.0)));
        int targetH = Math.max(1, (int) Math.round(h * Math.min(scale, 1.0)));

        boolean hasAlpha = src.getColorModel().hasAlpha();
        int imageType = hasAlpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage resized = new BufferedImage(targetW, targetH, imageType);

        Graphics2D g2 = resized.createGraphics();
        try {
            g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            if (!hasAlpha) {
                g2.setColor(Color.WHITE);
                g2.fillRect(0, 0, targetW, targetH);
            }

            g2.drawImage(src, 0, 0, targetW, targetH, null);
        } finally {
            g2.dispose();
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            String writeFormat = "png".equalsIgnoreCase(format) ? "png" : "jpg";
            boolean success = ImageIO.write(resized, writeFormat, baos);
            if (success) {
                return baos.toByteArray();
            }
        } catch (IOException e) {
            log.warn("Failed to encode resized image: {}", e.getMessage());
        }
        return null;
    }
}
