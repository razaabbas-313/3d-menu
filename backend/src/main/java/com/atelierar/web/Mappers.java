package com.atelierar.web;

import com.atelierar.menu.MenuItem;
import com.atelierar.publicapi.LeadInquiry;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.web.Dtos.*;

public final class Mappers {
    private Mappers() {
    }

    public static RestaurantDto restaurant(Restaurant r) {
        return new RestaurantDto(r.getId().toString(), r.getName(), r.getSlug(), r.getTagline(), r.getCity(),
                r.getCurrency(), r.getAccent(), r.getCoverUrl(), r.isPublished(),
                r.getInstagram(), r.getWhatsapp(), r.getPhone(), r.getTiktok(), r.getFacebook(),
                r.getWebsite(), r.getGoogleMapsUrl(), r.getWifiName(), r.getWifiPassword(), r.getTheme(),
                r.isWhatsappOrderEnabled(), r.getWhatsappMessageTemplate());
    }

    public static PublicRestaurantDto publicRestaurant(Restaurant r) {
        // Strict privacy: only serialize wifiPassword if wifiName is present
        String wifiPass = (r.getWifiName() != null && !r.getWifiName().isBlank()) ? r.getWifiPassword() : null;
        return new PublicRestaurantDto(r.getName(), r.getSlug(), r.getTagline(), r.getCity(), r.getCurrency(),
                r.getAccent(), r.getCoverUrl(),
                r.getInstagram(), r.getWhatsapp(), r.getPhone(), r.getTiktok(), r.getFacebook(),
                r.getWebsite(), r.getGoogleMapsUrl(), r.getWifiName(), wifiPass, r.getTheme(),
                r.isWhatsappOrderEnabled(), r.getWhatsappMessageTemplate());
    }

    public static ItemDto item(MenuItem i) {
        String id = i.getId() != null ? i.getId().toString() : "item-" + i.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        return new ItemDto(id, i.getName(), i.getCategory(), i.getDescription(), i.getPrice(),
                i.getImageUrl(), i.getThumbnailUrl(), i.getModelUrl(), i.getOriginalModelUrl(),
                i.getModelFileName(), i.getModelStatus(), i.getModelFileSize(), i.getOriginalModelFileSize(),
                i.getModelOptimizationNotes(), i.getTags(),
                i.isFeatured(), i.isAvailable(), i.isPublished(), i.getCreatedAt(),
                i.getModelScale(), i.getModelPlacement(),
                i.getNameUr(), i.getDescriptionUr(), i.getNameAr(), i.getDescriptionAr());
    }

    public static PublicItemDto publicItem(MenuItem i) {
        String id = i.getId() != null ? i.getId().toString() : "item-" + i.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        // Safe delivery: only expose modelUrl if status is READY or not failed
        boolean isReady = i.getModelStatus() == null || "READY".equalsIgnoreCase(i.getModelStatus());
        String modelUrl = isReady ? i.getModelUrl() : null;
        return new PublicItemDto(id, i.getName(), i.getCategory(), i.getDescription(), i.getPrice(),
                i.getImageUrl(), i.getThumbnailUrl(), modelUrl, i.getModelStatus(), i.getModelFileSize(),
                i.getTags(), i.isFeatured(), i.isAvailable(),
                i.getModelScale(), i.getModelPlacement(),
                i.getNameUr(), i.getDescriptionUr(), i.getNameAr(), i.getDescriptionAr());
    }

    public static LeadInquiryDto lead(LeadInquiry lead) {
        String id = lead.getId() != null ? lead.getId().toString() : java.util.UUID.randomUUID().toString();
        return new LeadInquiryDto(id, lead.getName(), lead.getRestaurantName(),
                lead.getPhone(), lead.getEmail(), lead.getNotes(), lead.getCreatedAt());
    }
}
