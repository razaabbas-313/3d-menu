package com.atelierar.analytics;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class DataRetentionService {
    private static final Logger log = LoggerFactory.getLogger(DataRetentionService.class);
    private final MenuEventRepository events;

    public DataRetentionService(MenuEventRepository events) {
        this.events = events;
    }

    /**
     * Purges raw analytics events older than 90 days every night at 3:15 AM UTC.
     * Prevents unbounded table growth to keep Neon PostgreSQL within the 0.5 GB free tier limit.
     */
    @Scheduled(cron = "0 15 3 * * *")
    public void purgeOldEvents() {
        Instant cutoff = Instant.now().minus(90, ChronoUnit.DAYS);
        int deleted = events.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            log.info("Data Retention: Purged {} menu_events older than 90 days (cutoff: {})", deleted, cutoff);
        }
    }
}
