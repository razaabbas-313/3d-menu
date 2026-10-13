package com.atelierar.menu;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {
    List<MenuItem> findByRestaurantIdOrderByCreatedAtDesc(UUID restaurantId);

    List<MenuItem> findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(UUID restaurantId);

    Optional<MenuItem> findByIdAndRestaurantId(UUID id, UUID restaurantId);

    boolean existsByIdAndRestaurantId(UUID id, UUID restaurantId);

    long countByRestaurantId(UUID restaurantId);
}
