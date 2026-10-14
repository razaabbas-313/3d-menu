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
        return new PublicRestaurantDto(r.getName(), r.getSlug(), r.getTagline(), r.getCity(), r.getCurrency(),
                r.getAccent(), r.getCoverUrl(),
                r.getInstagram(), r.getWhatsapp(), r.getPhone(), r.getTiktok(), r.getFacebook(),
                r.getWebsite(), r.getGoogleMapsUrl(), r.getWifiName(), r.getWifiPassword(), r.getTheme(),
                r.isWhatsappOrderEnabled(), r.getWhatsappMessageTemplate());
    }

    public static ItemDto item(MenuItem i) {
        String id = i.getId() != null ? i.getId().toString() : "item-" + i.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        return new ItemDto(id, i.getName(), i.getCategory(), i.getDescription(), i.getPrice(),
                i.getImageUrl(), i.getModelUrl(), i.getModelFileName(), i.getTags(),
                i.isFeatured(), i.isAvailable(), i.isPublished(), i.getCreatedAt(),
                i.getModelScale(), i.getModelPlacement(),
                i.getNameUr(), i.getDescriptionUr(), i.getNameAr(), i.getDescriptionAr());
    }

    public static PublicItemDto publicItem(MenuItem i) {
        String id = i.getId() != null ? i.getId().toString() : "item-" + i.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        return new PublicItemDto(id, i.getName(), i.getCategory(), i.getDescription(), i.getPrice(),
                i.getImageUrl(), i.getModelUrl(), i.getTags(), i.isFeatured(), i.isAvailable(),
                i.getModelScale(), i.getModelPlacement(),
                i.getNameUr(), i.getDescriptionUr(), i.getNameAr(), i.getDescriptionAr());
    }

    public static LeadInquiryDto lead(LeadInquiry lead) {
        String id = lead.getId() != null ? lead.getId().toString() : java.util.UUID.randomUUID().toString();
        return new LeadInquiryDto(id, lead.getName(), lead.getRestaurantName(),
                lead.getPhone(), lead.getEmail(), lead.getNotes(), lead.getCreatedAt());
    }
}
