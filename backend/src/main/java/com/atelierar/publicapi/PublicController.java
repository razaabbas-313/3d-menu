package com.atelierar.publicapi;

import com.atelierar.analytics.EventType;
import com.atelierar.analytics.MenuEvent;
import com.atelierar.analytics.MenuEventRepository;
import com.atelierar.config.RateLimiter;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.web.Dtos.EventRequest;
import com.atelierar.web.Dtos.PublicMenuDto;
import com.atelierar.web.Mappers;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.UUID;

/** Unauthenticated endpoints used by guests who scan the QR code. Only published data leaves here. */
@RestController
@RequestMapping("/api/v1/public")
public class PublicController {
    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final MenuEventRepository events;
    private final RateLimiter limiter;

    public PublicController(RestaurantRepository restaurants, MenuItemRepository items,
                            MenuEventRepository events, RateLimiter limiter) {
        this.restaurants = restaurants;
        this.items = items;
        this.events = events;
        this.limiter = limiter;
    }

    @GetMapping("/menu/{slug}")
    public PublicMenuDto menu(@PathVariable String slug) {
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
        Restaurant r = published(slug);
        UUID itemId = req.itemId();
        if (itemId != null && !items.existsByIdAndRestaurantId(itemId, r.getId())) {
            itemId = null; // ignore ids that do not belong to this restaurant
        }
        boolean needsItem = req.type() != EventType.SCAN;
        if (needsItem && itemId == null) return;
        events.save(new MenuEvent(r.getId(), itemId, req.type()));
    }

    private Restaurant published(String slug) {
        return restaurants.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This menu is not available."));
    }
}
