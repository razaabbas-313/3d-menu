package com.atelierar.config;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/** Tiny in-memory fixed-window limiter. Fine for one instance; use Redis/bucket4j when you scale out. */
@Component
public class RateLimiter {
    private record Window(long start, int count) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int max, Duration window) {
        long now = System.currentTimeMillis();
        long length = window.toMillis();
        Window w = windows.compute(key, (k, old) ->
                old == null || now - old.start() >= length ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        if (w.count() > max) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please wait a moment and try again.");
        }
        if (windows.size() > 50_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().start() > 3_600_000L);
        }
    }
}
