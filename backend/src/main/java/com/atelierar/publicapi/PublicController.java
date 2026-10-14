package com.atelierar.publicapi;

import com.atelierar.analytics.EventType;
import com.atelierar.analytics.MenuEvent;
import com.atelierar.analytics.MenuEventRepository;
import com.atelierar.config.RateLimiter;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.menu.SampleMenu;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.web.Dtos.*;
import com.atelierar.web.Mappers;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/** Unauthenticated endpoints used by guests and public landing visitors. */
@RestController
@RequestMapping("/api/v1/public")
public class PublicController {
    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final MenuEventRepository events;
    private final LeadInquiryRepository leads;
    private final RateLimiter limiter;

    public PublicController(RestaurantRepository restaurants,
                            MenuItemRepository items,
                            MenuEventRepository events,
                            LeadInquiryRepository leads,
                            RateLimiter limiter) {
        this.restaurants = restaurants;
        this.items = items;
        this.events = events;
        this.leads = leads;
        this.limiter = limiter;
    }

    @GetMapping("/menu/{slug}")
    public PublicMenuDto menu(@PathVariable String slug) {
        if ("demo".equalsIgnoreCase(slug)) {
            var existing = restaurants.findBySlugAndPublishedTrue("demo");
            if (existing.isPresent()) {
                Restaurant r = existing.get();
                return new PublicMenuDto(
                        Mappers.publicRestaurant(r),
                        items.findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(r.getId()).stream()
                                .map(Mappers::publicItem).toList());
            }
            // Seeded in-memory demo restaurant for instant preview
            return buildSeededDemoMenu();
        }

        Restaurant r = published(slug);
        return new PublicMenuDto(
                Mappers.publicRestaurant(r),
                items.findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(r.getId()).stream()
                        .map(Mappers::publicItem).toList());
    }

    /** Records an anonymous interaction (scan, dish view, AR launch) for the owner's analytics. */
    @PostMapping("/menu/{slug}/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void event(@PathVariable String slug, @Valid @RequestBody EventRequest req, HttpServletRequest http) {
        limiter.check("evt:" + http.getRemoteAddr() + ":" + slug, 120, Duration.ofMinutes(1));
        if ("demo".equalsIgnoreCase(slug)) {
            return; // Ignore analytics for static demo
        }
        Restaurant r = published(slug);
        UUID itemId = req.itemId();
        if (itemId != null && !items.existsByIdAndRestaurantId(itemId, r.getId())) {
            itemId = null; // ignore ids that do not belong to this restaurant
        }
        boolean needsItem = req.type() != EventType.SCAN;
        if (needsItem && itemId == null) return;
        events.save(new MenuEvent(r.getId(), itemId, req.type()));
    }

    /** Lead capture endpoint from public marketing landing page. */
    @PostMapping("/leads")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadInquiryDto submitLead(@Valid @RequestBody LeadInquiryRequest req, HttpServletRequest http) {
        limiter.check("lead:" + http.getRemoteAddr(), 10, Duration.ofHours(1));
        LeadInquiry lead = new LeadInquiry(
                req.name().trim(),
                req.restaurantName().trim(),
                req.phone().trim(),
                req.email() != null ? req.email().trim() : null,
                req.notes() != null ? req.notes().trim() : null,
                http.getRemoteAddr()
        );
        return Mappers.lead(leads.save(lead));
    }

    private Restaurant published(String slug) {
        return restaurants.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This menu is not available."));
    }

    private PublicMenuDto buildSeededDemoMenu() {
        PublicRestaurantDto rest = new PublicRestaurantDto(
                "Le Petit Bistro 3D",
                "demo",
                "Experience our signature culinary creations in interactive 3D and table-top Augmented Reality.",
                "London & Dubai",
                "USD",
                "cobalt",
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
                "@lepetitbistro3d",
                "+1234567890",
                "+1 (555) 234-5678",
                "@lepetitbistro3d",
                "https://facebook.com",
                "https://lepetitbistro.com",
                "https://maps.google.com",
                "Bistro_Guest_WiFi",
                "bistrogourmet",
                "dark",
                true,
                "Hello, I would like to order {dish} for Table {table}."
        );

        UUID demoId = UUID.randomUUID();
        var sampleDishes = SampleMenu.build(demoId);
        // Set sample model for the first dish
        if (!sampleDishes.isEmpty()) {
            sampleDishes.get(0).setModel("/models/avocado.glb", "avocado.glb");
        }

        List<PublicItemDto> publicItems = sampleDishes.stream().map(Mappers::publicItem).toList();
        return new PublicMenuDto(rest, publicItems);
    }

    @GetMapping("/health")
    public java.util.Map<String, String> health() {
        return java.util.Map.of("status", "UP");
    }
}
