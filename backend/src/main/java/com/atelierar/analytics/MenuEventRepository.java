package com.atelierar.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MenuEventRepository extends JpaRepository<MenuEvent, UUID> {
    List<MenuEvent> findByRestaurantIdAndCreatedAtGreaterThanEqual(UUID restaurantId, Instant since);

    interface TypeCount {
        EventType getType();
        long getCount();
    }

    interface ItemCount {
        UUID getItemId();
        EventType getType();
        long getCount();
    }

    interface EventDayPoint {
        Instant getCreatedAt();
        EventType getType();
    }

    @Query("SELECT e.type AS type, COUNT(e) AS count FROM MenuEvent e " +
           "WHERE e.restaurantId = :restaurantId AND e.createdAt >= :since " +
           "GROUP BY e.type")
    List<TypeCount> countByTypeSince(@Param("restaurantId") UUID restaurantId, @Param("since") Instant since);

    @Query("SELECT e.type AS type, COUNT(e) AS count FROM MenuEvent e " +
           "WHERE e.restaurantId = :restaurantId AND e.createdAt >= :since AND e.createdAt < :until " +
           "GROUP BY e.type")
    List<TypeCount> countByTypeBetween(@Param("restaurantId") UUID restaurantId,
                                      @Param("since") Instant since,
                                      @Param("until") Instant until);

    @Query("SELECT e.itemId AS itemId, e.type AS type, COUNT(e) AS count FROM MenuEvent e " +
           "WHERE e.restaurantId = :restaurantId AND e.createdAt >= :since AND e.itemId IS NOT NULL " +
           "AND (e.type = :viewType OR e.type = :arType) " +
           "GROUP BY e.itemId, e.type")
    List<ItemCount> countByItemSince(@Param("restaurantId") UUID restaurantId,
                                    @Param("since") Instant since,
                                    @Param("viewType") EventType viewType,
                                    @Param("arType") EventType arType);

    @Query("SELECT e.createdAt AS createdAt, e.type AS type FROM MenuEvent e " +
           "WHERE e.restaurantId = :restaurantId AND e.createdAt >= :since " +
           "AND (e.type = :scanType OR e.type = :viewType OR e.type = :arType)")
    List<EventDayPoint> findDailyMetricsSince(@Param("restaurantId") UUID restaurantId,
                                             @Param("since") Instant since,
                                             @Param("scanType") EventType scanType,
                                             @Param("viewType") EventType viewType,
                                             @Param("arType") EventType arType);

    @Modifying
    @Transactional
    @Query("DELETE FROM MenuEvent e WHERE e.createdAt < :cutoff")
    int deleteByCreatedAtBefore(@Param("cutoff") Instant cutoff);
}
