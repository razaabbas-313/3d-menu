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
                                String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme,
                                boolean whatsappOrderEnabled, String whatsappMessageTemplate,
                                List<String> categories) {
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
            @Size(max = 30) String theme,
            Boolean whatsappOrderEnabled,
            @Size(max = 500) String whatsappMessageTemplate,
            List<String> categories) {
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
            String modelPlacement,
            @Size(max = 140) String nameUr,
            @Size(max = 700) String descriptionUr,
            @Size(max = 140) String nameAr,
            @Size(max = 700) String descriptionAr) {
    }

    public record ItemDto(String id, String name, String category, String description, BigDecimal price,
                          String imageUrl, String thumbnailUrl, String modelUrl, String originalModelUrl,
                          String modelFileName, String modelStatus, Long modelFileSize, Long originalModelFileSize,
                          String modelOptimizationNotes, String tags,
                          boolean featured, boolean available, boolean published, Instant createdAt,
                          Double modelScale, String modelPlacement,
                          String nameUr, String descriptionUr, String nameAr, String descriptionAr) {
    }

    // ---- public menu ----
    public record PublicRestaurantDto(String name, String slug, String tagline, String city, String currency,
                                      String accent, String coverUrl,
                                      String instagram, String whatsapp, String phone, String tiktok, String facebook,
                                      String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme,
                                      boolean whatsappOrderEnabled, String whatsappMessageTemplate,
                                      List<String> categories) {
    }

    public record PublicItemDto(String id, String name, String category, String description, BigDecimal price,
                                String imageUrl, String thumbnailUrl, String modelUrl, String modelStatus, Long modelFileSize,
                                String tags, boolean featured, boolean available,
                                Double modelScale, String modelPlacement,
                                String nameUr, String descriptionUr, String nameAr, String descriptionAr) {
    }

    public record PublicMenuDto(PublicRestaurantDto restaurant, List<PublicItemDto> items) {
    }

    public record EventRequest(@NotNull EventType type, UUID itemId) {
    }

    // ---- leads ----
    public record LeadInquiryRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 140) String restaurantName,
            @NotBlank @Size(max = 60) String phone,
            @Size(max = 160) String email,
            @Size(max = 500) String notes) {
    }

    public record LeadInquiryDto(String id, String name, String restaurantName, String phone, String email, String notes, Instant createdAt) {
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
