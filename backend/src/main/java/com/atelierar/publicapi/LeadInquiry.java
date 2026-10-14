package com.atelierar.publicapi;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lead_inquiries")
public class LeadInquiry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "restaurant_name", nullable = false, length = 140)
    private String restaurantName;

    @Column(nullable = false, length = 60)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(length = 500)
    private String notes;

    @Column(name = "ip_address", length = 60)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LeadInquiry() {
    }

    public LeadInquiry(String name, String restaurantName, String phone, String email, String notes, String ipAddress) {
        this.name = name;
        this.restaurantName = restaurantName;
        this.phone = phone;
        this.email = email;
        this.notes = notes;
        this.ipAddress = ipAddress;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getRestaurantName() { return restaurantName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getNotes() { return notes; }
    public String getIpAddress() { return ipAddress; }
    public Instant getCreatedAt() { return createdAt; }
}
