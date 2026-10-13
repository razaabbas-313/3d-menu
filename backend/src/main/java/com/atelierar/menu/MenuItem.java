package com.atelierar.menu;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "menu_items")
public class MenuItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID restaurantId;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 60)
    private String category;

    @Column(length = 700)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 500)
    private String modelUrl;

    @Column(length = 255)
    private String modelFileName;

    /** Comma separated dietary / highlight tags, e.g. "Halal,Spicy". */
    @Column(length = 300)
    private String tags;

    @Column(columnDefinition = "double precision default 1.0")
    private Double modelScale = 1.0;

    @Column(length = 40)
    private String modelPlacement = "plate";

    // columnDefinition defaults let Hibernate add these columns to databases that already contain rows.
    @Column(columnDefinition = "boolean default false")
    private boolean featured = false;

    @Column(columnDefinition = "boolean default true")
    private boolean available = true;

    @Column(nullable = false)
    private boolean published = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected MenuItem() {
    }

    public MenuItem(UUID restaurantId) {
        this.restaurantId = restaurantId;
    }

    public UUID getId() { return id; }
    public UUID getRestaurantId() { return restaurantId; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public String getImageUrl() { return imageUrl; }
    public String getModelUrl() { return modelUrl; }
    public String getModelFileName() { return modelFileName; }
    public String getTags() { return tags; }
    public Double getModelScale() { return modelScale == null ? 1.0 : modelScale; }
    public String getModelPlacement() { return modelPlacement == null ? "plate" : modelPlacement; }
    public boolean isFeatured() { return featured; }
    public boolean isAvailable() { return available; }
    public boolean isPublished() { return published; }
    public Instant getCreatedAt() { return createdAt; }

    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setModel(String url, String fileName) { this.modelUrl = url; this.modelFileName = fileName; }
    public void setModelScale(Double modelScale) { this.modelScale = modelScale; }
    public void setModelPlacement(String modelPlacement) { this.modelPlacement = modelPlacement; }

    public void apply(String name, String category, String description, BigDecimal price, String tags,
                      boolean featured, boolean available, boolean published, String imageUrl,
                      Double modelScale, String modelPlacement) {
        this.name = name;
        this.category = category;
        this.description = description;
        this.price = price;
        this.tags = tags;
        this.featured = featured;
        this.available = available;
        this.published = published;
        this.imageUrl = imageUrl;
        if (modelScale != null) this.modelScale = modelScale;
        if (modelPlacement != null && !modelPlacement.isBlank()) this.modelPlacement = modelPlacement;
    }
}
