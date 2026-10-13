package com.atelierar.web;

import com.atelierar.analytics.EventType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** All request/response shapes of the public JSON API in one place. */
public final class Dtos {
    private Dtos() {
    }

    // ---- auth ----
    public record RegisterRequest(
            @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Size(min = 8, max = 100, message = "must be 8-100 characters") String password,
            @NotBlank @Size(max = 120) String restaurantName,
            @Size(max = 120) String city) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record UserDto(String id, String email) {
    }

    public record AuthResponse(String token, UserDto user, RestaurantDto restaurant) {
    }

    public record MeResponse(UserDto user, RestaurantDto restaurant) {
    }

    // ---- restaurant ----
    public record RestaurantDto(String id, String name, String slug, String tagline, String city, String currency,
                                String accent, String coverUrl, boolean published,
                                String instagram, String whatsapp, String phone, String tiktok, String facebook,
                                String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme) {
    }

    public record RestaurantUpdate(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 80) String slug,
            @Size(max = 500) String tagline,
            @Size(max = 120) String city,
            @Pattern(regexp = "PKR|USD|AED|GBP|EUR|SAR|INR", message = "is not a supported currency") String currency,
            @Pattern(regexp = "cobalt|saffron|basil|rose|graphite", message = "is not a supported accent") String accent,
            @Size(max = 120) String instagram,
            @Size(max = 60) String whatsapp,
            @Size(max = 60) String phone,
            @Size(max = 120) String tiktok,
            @Size(max = 120) String facebook,
            @Size(max = 255) String website,
            @Size(max = 500) String googleMapsUrl,
            @Size(max = 100) String wifiName,
            @Size(max = 100) String wifiPassword,
            @Size(max = 30) String theme) {
    }

    // ---- menu items ----
    public record ItemRequest(
            @NotBlank @Size(max = 140) String name,
            @NotBlank @Size(max = 60) String category,
            @Size(max = 700) String description,
            @NotNull @DecimalMin(value = "0", message = "must not be negative") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @Size(max = 300) String tags,
            Boolean featured,
            Boolean available,
            Boolean published,
            @Size(max = 500) String imageUrl,
            Double modelScale,
            String modelPlacement) {
    }

    public record ItemDto(String id, String name, String category, String description, BigDecimal price,
                          String imageUrl, String modelUrl, String modelFileName, String tags,
                          boolean featured, boolean available, boolean published, Instant createdAt,
                          Double modelScale, String modelPlacement) {
    }

    // ---- public menu ----
    public record PublicRestaurantDto(String name, String slug, String tagline, String city, String currency,
                                      String accent, String coverUrl,
                                      String instagram, String whatsapp, String phone, String tiktok, String facebook,
                                      String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme) {
    }

    public record PublicItemDto(String id, String name, String category, String description, BigDecimal price,
                                String imageUrl, String modelUrl, String tags, boolean featured, boolean available,
                                Double modelScale, String modelPlacement) {
    }

    public record PublicMenuDto(PublicRestaurantDto restaurant, List<PublicItemDto> items) {
    }

    public record EventRequest(@NotNull EventType type, UUID itemId) {
    }

    // ---- analytics ----
    public record Delta(long current, long previous) {
    }

    public record DayPoint(String date, long scans, long views, long arLaunches) {
    }

    public record TopItem(String id, String name, long views, long arLaunches) {
    }

    public record AnalyticsSummary(int days, Delta scans, Delta itemViews, Delta modelViews, Delta arLaunches,
                                   List<DayPoint> series, List<TopItem> topItems) {
    }
}
