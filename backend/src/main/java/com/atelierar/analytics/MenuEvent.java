package com.atelierar.analytics;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "menu_events", indexes = @Index(name = "idx_menu_events_restaurant_created", columnList = "restaurant_id,created_at"))
public class MenuEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "restaurant_id", nullable = false)
    private UUID restaurantId;

    @Column(name = "item_id")
    private UUID itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventType type;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected MenuEvent() {
    }

    public MenuEvent(UUID restaurantId, UUID itemId, EventType type) {
        this.restaurantId = restaurantId;
        this.itemId = itemId;
        this.type = type;
    }

    public UUID getRestaurantId() { return restaurantId; }
    public UUID getItemId() { return itemId; }
    public EventType getType() { return type; }
    public Instant getCreatedAt() { return createdAt; }
}
