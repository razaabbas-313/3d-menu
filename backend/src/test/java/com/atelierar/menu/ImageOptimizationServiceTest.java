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
    void generatesThumbnailAndMainImage() throws IOException {
        // Create an 800x600 test image in memory
        BufferedImage image = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, 800, 600);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baos);
        byte[] inputBytes = baos.toByteArray();

        StorageValidator.ImageInfo info = new StorageValidator.ImageInfo("jpg", "image/jpeg");
        ImageOptimizationService.ImageResult result = service.optimize(inputBytes, info);

        assertNotNull(result);
        assertNotNull(result.mainBytes());
        assertNotNull(result.thumbnailBytes());
        assertEquals("jpg", result.mainExtension());
        assertEquals("image/jpeg", result.mainMimeType());
        assertTrue(result.thumbnailBytes().length > 0);
    }
}
