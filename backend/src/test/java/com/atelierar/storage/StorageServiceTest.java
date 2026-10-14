package com.atelierar.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class StorageServiceTest {

    @Test
    void validatesValidGlbHeader() throws IOException {
        // 'g','l','T','F' (0x46546C67) + version 2 (2,0,0,0) + length
        byte[] validGlb = new byte[]{ 'g', 'l', 'T', 'F', 2, 0, 0, 0, 12, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "dish.glb", "model/gltf-binary", validGlb);
        assertDoesNotThrow(() -> StorageValidator.validateModel(file, 15 * 1024 * 1024));
    }

    @Test
    void rejectsInvalidGlbHeader() {
        byte[] fakeGlb = new byte[]{ 'N', 'O', 'T', 'F', 1, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "dish.glb", "model/gltf-binary", fakeGlb);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> StorageValidator.validateModel(file, 15 * 1024 * 1024));
        assertTrue(ex.getReason().contains("not a valid .glb"));
    }

    @Test
    void validatesImagesCorrectly() throws IOException {
        byte[] jpeg = new byte[]{ (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpeg);
        StorageValidator.ImageInfo info = StorageValidator.validateImage(file);
        assertEquals("jpg", info.extension());
        assertEquals("image/jpeg", info.mimeType());
    }

    @Test
    void localStorageEnforcesQuotaAndDeletes(@TempDir Path tempDir) throws IOException {
        // 1 MB quota for test
        LocalStorageService storage = new LocalStorageService(tempDir.toString(), 15, 1);
        UUID restId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        byte[] jpeg = new byte[]{ (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", jpeg);

        String url = storage.saveItemImage(restId, itemId, file);
        assertNotNull(url);
        assertTrue(url.startsWith("/uploads/restaurants/" + restId));

        storage.deleteQuietly(url);
    }
}
