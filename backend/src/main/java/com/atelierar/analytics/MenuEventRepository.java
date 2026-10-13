package com.atelierar.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MenuEventRepository extends JpaRepository<MenuEvent, UUID> {
    List<MenuEvent> findByRestaurantIdAndCreatedAtGreaterThanEqual(UUID restaurantId, Instant since);
}
