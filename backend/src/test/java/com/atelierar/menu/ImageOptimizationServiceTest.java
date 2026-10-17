package com.atelierar.menu;

import com.atelierar.storage.StorageValidator;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class ImageOptimizationServiceTest {

    private final ImageOptimizationService service = new ImageOptimizationService();

    @Test
    void preCompressedWebPUnder350KbBypassesImageIO() {
        byte[] fakeWebpBytes = new byte[120 * 1024]; // 120 KB WebP
        StorageValidator.ImageInfo info = new StorageValidator.ImageInfo("webp", "image/webp");

        ImageOptimizationService.ImageResult result = service.optimize(fakeWebpBytes, info);

        assertNotNull(result);
        assertSame(fakeWebpBytes, result.mainBytes(), "Pre-compressed WebP must bypass re-encoding and reuse input bytes");
        assertSame(fakeWebpBytes, result.thumbnailBytes(), "Thumbnail must reuse input bytes on fast path");
        assertEquals("webp", result.mainExtension());
        assertEquals("image/webp", result.mainMimeType());
    }

    @Test
    void preCompressedJpegUnder350KbBypassesImageIO() {
        byte[] fakeJpegBytes = new byte[180 * 1024]; // 180 KB JPEG
        StorageValidator.ImageInfo info = new StorageValidator.ImageInfo("jpg", "image/jpeg");

        ImageOptimizationService.ImageResult result = service.optimize(fakeJpegBytes, info);

        assertNotNull(result);
        assertSame(fakeJpegBytes, result.mainBytes(), "Pre-compressed JPEG under 350 KB must bypass ImageIO pass");
        assertSame(fakeJpegBytes, result.thumbnailBytes());
        assertEquals("jpg", result.mainExtension());
        assertEquals("image/jpeg", result.mainMimeType());
    }

    @Test
    void generatesThumbnailAndMainImageForLargeUncompressedImage() throws IOException {
        // Create an 800x600 test image in memory with padding to exceed 350 KB
        BufferedImage image = new BufferedImage(1200, 900, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, 1200, 900);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baos);
        byte[] smallBytes = baos.toByteArray();
        // Pad to ensure > 350 KB
        byte[] largeBytes = new byte[400 * 1024];
        System.arraycopy(smallBytes, 0, largeBytes, 0, smallBytes.length);

        StorageValidator.ImageInfo info = new StorageValidator.ImageInfo("jpg", "image/jpeg");
        ImageOptimizationService.ImageResult result = service.optimize(largeBytes, info);

        assertNotNull(result);
        assertNotNull(result.mainBytes());
        assertNotNull(result.thumbnailBytes());
        assertEquals("jpg", result.mainExtension());
        assertEquals("image/jpeg", result.mainMimeType());
        assertTrue(result.thumbnailBytes().length > 0);
    }
}
