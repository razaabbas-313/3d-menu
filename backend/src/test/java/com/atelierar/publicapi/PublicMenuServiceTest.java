package com.atelierar.publicapi;

import com.atelierar.menu.MenuItem;
import com.atelierar.menu.MenuItemRepository;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.web.Dtos.PublicMenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicMenuServiceTest {

    @Mock
    private RestaurantRepository restaurants;

    @Mock
    private MenuItemRepository items;

    @Mock
    private CacheManager cacheManager;

    @Mock
    private Cache cache;

    private PublicMenuService service;

    @BeforeEach
    void setUp() {
        service = new PublicMenuService(restaurants, items, cacheManager);
    }

    @Test
    void getPublicMenuReturnsPublishedRestaurantAndItems() {
        UUID restId = UUID.randomUUID();
        Restaurant restaurant = new Restaurant(restId, "Chez Laurent", "chez-laurent", "USD");
        restaurant.setId(restId);
        restaurant.setPublished(true);

        MenuItem item = new MenuItem(restId);
        item.apply("Truffle Pasta", "Mains", "Fresh pasta with black truffle", new BigDecimal("28.00"),
                "pasta,truffle", true, true, true, "https://cdn.example.com/pasta.jpg", 1.0, "plate");

        when(restaurants.findBySlugAndPublishedTrue("chez-laurent")).thenReturn(Optional.of(restaurant));
        when(items.findByRestaurantIdAndPublishedTrueOrderByCategoryAscNameAsc(restId)).thenReturn(List.of(item));

        PublicMenuDto result = service.getPublicMenu("chez-laurent");

        assertNotNull(result);
        assertEquals("Chez Laurent", result.restaurant().name());
        assertEquals(1, result.items().size());
        assertEquals("Truffle Pasta", result.items().get(0).name());
    }

    @Test
    void getPublicMenuThrows404WhenRestaurantNotFoundOrUnpublished() {
        when(restaurants.findBySlugAndPublishedTrue("unknown-slug")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> service.getPublicMenu("unknown-slug"));
    }

    @Test
    void getPublicMenuDemoReturnsSeededMenuWhenDbEmpty() {
        when(restaurants.findBySlugAndPublishedTrue("demo")).thenReturn(Optional.empty());

        PublicMenuDto demo = service.getPublicMenu("demo");

        assertNotNull(demo);
        assertEquals("Le Petit Bistro 3D", demo.restaurant().name());
        assertFalse(demo.items().isEmpty());
    }

    @Test
    void evictMethodsRunWithoutErrors() {
        UUID restId = UUID.randomUUID();
        Restaurant restaurant = new Restaurant(restId, "Chez Laurent", "chez-laurent", "USD");
        restaurant.setId(restId);
        when(restaurants.findById(restId)).thenReturn(Optional.of(restaurant));
        when(cacheManager.getCache("public-menus")).thenReturn(cache);

        assertDoesNotThrow(() -> {
            service.evictBySlug("chez-laurent");
            service.evictByRestaurantId(restId);
            service.evictAll();
        });
        verify(cache, atLeastOnce()).clear();
        verify(cache, atLeastOnce()).evict("chez-laurent");
    }
}
