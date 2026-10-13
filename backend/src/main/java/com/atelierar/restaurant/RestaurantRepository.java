package com.atelierar.restaurant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    Optional<Restaurant> findBySlugAndPublishedTrue(String slug);

    Optional<Restaurant> findFirstByOwnerIdOrderByCreatedAtAsc(UUID ownerId);
}
