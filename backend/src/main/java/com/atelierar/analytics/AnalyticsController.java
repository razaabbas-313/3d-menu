package com.atelierar.analytics;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantService;
import com.atelierar.web.Dtos.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final RestaurantService restaurants;
    private final MenuEventRepository events;
    private final MenuItemRepository items;

    public AnalyticsController(RestaurantService restaurants, MenuEventRepository events, MenuItemRepository items) {
        this.restaurants = restaurants;
        this.events = events;
        this.items = items;
    }

    /**
     * @param days window length (1-90). The previous window of equal length is returned for comparison.
     * @param tz   browser offset from UTC in minutes (e.g. 300 for Pakistan) so "today" matches the owner's clock.
     */
    @GetMapping("/summary")
    public AnalyticsSummary summary(@RequestParam(defaultValue = "7") int days,
                                    @RequestParam(defaultValue = "0") int tz) {
        days = Math.max(1, Math.min(days, 90));
        ZoneOffset zone = ZoneOffset.ofTotalSeconds(Math.max(-14 * 60, Math.min(tz, 14 * 60)) * 60);
        Restaurant r = restaurants.current();

        LocalDate today = LocalDate.now(zone);
        Instant start = today.minusDays(days - 1L).atStartOfDay(zone).toInstant();
        Instant previousStart = start.minus(days, ChronoUnit.DAYS);

        // 1. Current window totals aggregated in SQL
        long[] current = new long[EventType.values().length];
        for (MenuEventRepository.TypeCount tc : events.countByTypeSince(r.getId(), start)) {
            if (tc.getType() != null) {
                current[tc.getType().ordinal()] = tc.getCount();
            }
        }

        // 2. Previous window totals aggregated in SQL
        long[] previous = new long[EventType.values().length];
        for (MenuEventRepository.TypeCount tc : events.countByTypeBetween(r.getId(), previousStart, start)) {
            if (tc.getType() != null) {
                previous[tc.getType().ordinal()] = tc.getCount();
            }
        }

        // 3. Day points for charts (lightweight projections, zero full Hibernate entity instantiation)
        Map<LocalDate, long[]> perDay = new TreeMap<>();
        for (int i = days - 1; i >= 0; i--) perDay.put(today.minusDays(i), new long[3]); // scans, views, ar

        for (MenuEventRepository.EventDayPoint pt : events.findDailyMetricsSince(
                r.getId(), start, EventType.SCAN, EventType.ITEM_VIEW, EventType.AR_LAUNCH)) {
            long[] bucket = perDay.get(pt.getCreatedAt().atZone(zone).toLocalDate());
            if (bucket != null) {
                switch (pt.getType()) {
                    case SCAN -> bucket[0]++;
                    case ITEM_VIEW -> bucket[1]++;
                    case AR_LAUNCH -> bucket[2]++;
                    default -> {}
                }
            }
        }

        List<DayPoint> series = new ArrayList<>();
        perDay.forEach((date, v) -> series.add(new DayPoint(date.toString(), v[0], v[1], v[2])));

        // 4. Top items aggregated in SQL
        Map<UUID, long[]> perItem = new HashMap<>(); // views, ar
        for (MenuEventRepository.ItemCount ic : events.countByItemSince(r.getId(), start, EventType.ITEM_VIEW, EventType.AR_LAUNCH)) {
            if (ic.getItemId() != null) {
                perItem.computeIfAbsent(ic.getItemId(), k -> new long[2])[ic.getType() == EventType.ITEM_VIEW ? 0 : 1] = ic.getCount();
            }
        }

        Map<UUID, MenuItem> byId = new HashMap<>();
        for (MenuItem item : items.findByRestaurantIdOrderByCreatedAtDesc(r.getId())) byId.put(item.getId(), item);
        List<TopItem> top = perItem.entrySet().stream()
                .filter(e -> byId.containsKey(e.getKey()))
                .sorted((a, b) -> Long.compare(b.getValue()[0] + b.getValue()[1], a.getValue()[0] + a.getValue()[1]))
                .limit(5)
                .map(e -> new TopItem(e.getKey().toString(), byId.get(e.getKey()).getName(), e.getValue()[0], e.getValue()[1]))
                .toList();

        return new AnalyticsSummary(days,
                delta(current, previous, EventType.SCAN),
                delta(current, previous, EventType.ITEM_VIEW),
                delta(current, previous, EventType.MODEL_VIEW),
                delta(current, previous, EventType.AR_LAUNCH),
                series, top);
    }

    private static Delta delta(long[] current, long[] previous, EventType type) {
        return new Delta(current[type.ordinal()], previous[type.ordinal()]);
    }
}
