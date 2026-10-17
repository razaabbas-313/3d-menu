package com.atelierar.publicapi;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Decommissioned S3 snapshot worker, now acting as an instant in-memory cache eviction coordinator.
 * Manual S3 static menu.json snapshot generation and CloudFront edge invalidations have been retired
 * in favor of dynamic PostgreSQL menu delivery with edge HTTP caching and in-memory cache eviction.
 */
@Service
public class PublicMenuSnapshotService {
    private static final Logger log = LoggerFactory.getLogger(PublicMenuSnapshotService.class);

    private final PublicMenuService publicMenuService;

    public PublicMenuSnapshotService(PublicMenuService publicMenuService) {
        this.publicMenuService = publicMenuService;
    }

    /**
     * Instantly evicts the in-memory public menu cache for the restaurant.
     */
    public void updateSnapshot(UUID restaurantId) {
        if (restaurantId == null) return;
        publicMenuService.evictByRestaurantId(restaurantId);
    }

    /**
     * Instantly evicts the public menu cache for the specified slug.
     */
    public void deleteSnapshot(String slug) {
        if (slug == null || slug.isBlank()) return;
        publicMenuService.evictBySlug(slug);
    }
}
