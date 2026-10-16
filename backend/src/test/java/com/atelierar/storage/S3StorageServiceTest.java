package com.atelierar.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class S3StorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private PresignedGetObjectRequest presignedRequest;

    private S3StorageService storageService;

    private final String bucket = "test-atelier-bucket";
    private final String region = "us-east-1";
    private final String publicBaseUrl = "https://cdn.atelierar.com";

    @BeforeEach
    void setUp() {
        storageService = new S3StorageService(
                s3Client,
                s3Presigner,
                bucket,
                region,
                publicBaseUrl,
                15, // max 15MB model
                100 // 100MB quota
        );
    }

    @Test
    void saveItemModelStoresWithCloudFrontPublicUrl() throws IOException {
        byte[] validGlb = new byte[]{ 'g', 'l', 'T', 'F', 2, 0, 0, 0, 12, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "dish.glb", "model/gltf-binary", validGlb);
        UUID restId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        // Stub empty storage quota check
        ListObjectsV2Response listResponse = ListObjectsV2Response.builder()
                .contents(Collections.emptyList())
                .isTruncated(false)
                .build();
        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(listResponse);

        String url = storageService.saveItemModel(restId, itemId, file);

        assertNotNull(url);
        assertTrue(url.startsWith("https://cdn.atelierar.com/restaurants/" + restId + "/items/" + itemId + "/"));
        assertTrue(url.endsWith(".glb"));

        ArgumentCaptor<PutObjectRequest> putCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(putCaptor.capture(), any(RequestBody.class));

        PutObjectRequest putReq = putCaptor.getValue();
        assertEquals(bucket, putReq.bucket());
        assertEquals("model/gltf-binary", putReq.contentType());
        assertTrue(putReq.cacheControl().contains("max-age=31536000"));
    }

    @Test
    void saveItemOriginalModelStoresPrivately() throws IOException {
        byte[] rawGlb = new byte[]{ 'g', 'l', 'T', 'F', 2, 0, 0, 0, 12, 0, 0, 0 };
        UUID restId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        ListObjectsV2Response listResponse = ListObjectsV2Response.builder()
                .contents(Collections.emptyList())
                .isTruncated(false)
                .build();
        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(listResponse);

        String s3Uri = storageService.saveItemOriginalModel(restId, itemId, rawGlb, "orig.glb");

        assertNotNull(s3Uri);
        assertTrue(s3Uri.startsWith("s3://" + bucket + "/restaurants/" + restId + "/items/" + itemId + "/original-"));

        ArgumentCaptor<PutObjectRequest> putCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(putCaptor.capture(), any(RequestBody.class));

        PutObjectRequest putReq = putCaptor.getValue();
        assertEquals("private, no-cache", putReq.cacheControl());
    }

    @Test
    void saveItemThumbnailStoresWithThumbnailKey() throws IOException {
        byte[] thumbBytes = new byte[]{ 1, 2, 3, 4 };
        UUID restId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        ListObjectsV2Response listResponse = ListObjectsV2Response.builder()
                .contents(Collections.emptyList())
                .isTruncated(false)
                .build();
        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(listResponse);

        String url = storageService.saveItemThumbnail(restId, itemId, thumbBytes, "webp", "image/webp");

        assertNotNull(url);
        assertTrue(url.startsWith("https://cdn.atelierar.com/restaurants/" + restId + "/items/" + itemId + "/thumb-"));
        assertTrue(url.endsWith(".webp"));

        ArgumentCaptor<PutObjectRequest> putCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(putCaptor.capture(), any(RequestBody.class));

        PutObjectRequest putReq = putCaptor.getValue();
        assertEquals("image/webp", putReq.contentType());
    }

    @Test
    void generatesPresignedGetUrlUsingS3Presigner() throws Exception {
        String testUrl = "https://cdn.atelierar.com/restaurants/123/items/456/original-abc.glb";
        java.net.URL mockUrl = URI.create("https://" + bucket + ".s3.amazonaws.com/restaurants/123/items/456/original-abc.glb?X-Amz-Signature=mock").toURL();

        when(presignedRequest.url()).thenReturn(mockUrl);
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedRequest);

        String signed = storageService.generatePresignedGetUrl(testUrl, Duration.ofMinutes(15));

        assertNotNull(signed);
        assertTrue(signed.contains("X-Amz-Signature=mock"));
        verify(s3Presigner).presignGetObject(any(GetObjectPresignRequest.class));
    }

    @Test
    void enforcesQuotaAndRejectsUploadWhenFull() {
        UUID restId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        // 101 MB currently used (over 100MB quota)
        S3Object largeObj = S3Object.builder().size(101L * 1024L * 1024L).build();
        ListObjectsV2Response listResponse = ListObjectsV2Response.builder()
                .contents(Collections.singletonList(largeObj))
                .isTruncated(false)
                .build();
        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(listResponse);

        byte[] jpeg = new byte[]{ (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpeg);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> storageService.saveItemImage(restId, itemId, file));
        assertTrue(ex.getReason().contains("Storage quota exceeded"));
    }

    @Test
    void deleteQuietlyDeletesObject() {
        String url = "https://cdn.atelierar.com/restaurants/123/items/456/dish.glb";
        storageService.deleteQuietly(url);

        ArgumentCaptor<DeleteObjectRequest> delCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(delCaptor.capture());
        assertEquals("restaurants/123/items/456/dish.glb", delCaptor.getValue().key());
        assertEquals(bucket, delCaptor.getValue().bucket());
    }
}
