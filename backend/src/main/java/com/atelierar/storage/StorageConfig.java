package com.atelierar.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.io.IOException;

@Configuration
public class StorageConfig {

    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
    public StorageService s3StorageService(
            @Value("${aws.region:${AWS_REGION:us-east-1}}") String region,
            @Value("${app.storage.s3.bucket:${S3_BUCKET:}}") String bucket,
            @Value("${app.storage.s3.public-base-url:${S3_PUBLIC_BASE_URL:}}") String publicBaseUrl,
            @Value("${aws.access-key-id:${AWS_ACCESS_KEY_ID:}}") String accessKeyId,
            @Value("${aws.secret-access-key:${AWS_SECRET_ACCESS_KEY:}}") String secretAccessKey,
            @Value("${app.storage.max-model-mb:30}") long maxModelMb,
            @Value("${app.storage.quota-mb:150}") long quotaMb) {
        return new S3StorageService(region, bucket, publicBaseUrl, accessKeyId, secretAccessKey, maxModelMb, quotaMb);
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
    public StorageService localStorageService(
            @Value("${app.storage.dir:uploads}") String dir,
            @Value("${app.storage.max-model-mb:30}") long maxModelMb,
            @Value("${app.storage.quota-mb:150}") long quotaMb) throws IOException {
        return new LocalStorageService(dir, maxModelMb, quotaMb);
    }
}
