package com.atelierar.config;

import com.atelierar.storage.StorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final StorageService storage;

    public WebConfig(StorageService storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        storage.getLocalRoot().ifPresent(path -> {
            String location = path.toUri().toString();
            if (!location.endsWith("/")) location += "/";
            // File names contain a random UUID and are never rewritten, so they can be cached aggressively.
            registry.addResourceHandler("/uploads/**")
                    .addResourceLocations(location)
                    .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic());
        });
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/uploads/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "HEAD", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
