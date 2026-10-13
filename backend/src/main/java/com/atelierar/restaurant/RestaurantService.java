package com.atelierar.restaurant;

import com.atelierar.config.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.UUID;

@Service
public class RestaurantService {
    private final RestaurantRepository restaurants;

    public RestaurantService(RestaurantRepository restaurants) {
        this.restaurants = restaurants;
    }

    /** The restaurant owned by the signed-in user. Every owner-facing endpoint goes through this. */
    public Restaurant current() {
        UUID userId = CurrentUser.id();
        return restaurants.findFirstByOwnerIdOrderByCreatedAtAsc(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No restaurant found for this account"));
    }

    public static String normalizeSlug(String raw) {
        if (raw == null) return "restaurant";
        String base = raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        if (base.length() > 60) base = base.substring(0, 60).replaceAll("-+$", "");
        return base.isBlank() ? "restaurant" : base;
    }

    public Restaurant create(UUID ownerId, String name, String city) {
        String base = normalizeSlug(name);
        String slug = base;
        int n = 2;
        while (restaurants.existsBySlug(slug)) slug = base + "-" + n++;
        return restaurants.save(new Restaurant(ownerId, name.trim(), slug, blankToNull(city)));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
