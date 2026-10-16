package com.atelierar.publicapi;

import com.atelierar.menu.MenuItem;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.web.Dtos.PublicItemDto;
import com.atelierar.web.Dtos.PublicRestaurantDto;
import com.atelierar.web.Mappers;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PublicMenuSnapshotPrivacyTest {

    @Test
    void publicRestaurantOmitsWifiPasswordIfWifiNameNotProvided() {
        Restaurant r = new Restaurant(UUID.randomUUID(), "Bistro Luxe", "bistro-luxe", "PKR");
        r.updateProfile("Bistro Luxe", "bistro-luxe", "Fine Dining", "Karachi", "PKR", "cobalt",
                null, null, null, null, null, null, null,
                null, // No wifiName
                "SuperSecretWifiPass123", // Has wifiPassword in DB
                "dark", true, null);

        PublicRestaurantDto dto = Mappers.publicRestaurant(r);

        assertNull(dto.wifiName());
        assertNull(dto.wifiPassword(), "wifiPassword must NEVER be leaked in public snapshot when wifiName is absent!");
    }

    @Test
    void publicRestaurantIncludesWifiPasswordOnlyWhenWifiNameProvided() {
        Restaurant r = new Restaurant(UUID.randomUUID(), "Bistro Luxe", "bistro-luxe", "PKR");
        r.updateProfile("Bistro Luxe", "bistro-luxe", "Fine Dining", "Karachi", "PKR", "cobalt",
                null, null, null, null, null, null, null,
                "Guest-WiFi",
                "GuestPass2026",
                "dark", true, null);

        PublicRestaurantDto dto = Mappers.publicRestaurant(r);

        assertEquals("Guest-WiFi", dto.wifiName());
        assertEquals("GuestPass2026", dto.wifiPassword());
    }

    @Test
    void publicItemHidesUnready3dModelUrlFromGuests() {
        UUID restId = UUID.randomUUID();
        MenuItem item = new MenuItem(restId);
        item.apply("Steak Diane", "Mains", "Juicy tenderloin", new BigDecimal("3500.00"), "beef,special",
                true, true, true, "https://cdn.example.com/steak.jpg", 1.0, "plate");
        item.setModel("https://cdn.example.com/steak.glb", "steak.glb");
        item.setOriginalModelUrl("s3://bucket/private/original-steak.glb");
        item.setModelStatus("PROCESSING"); // Still processing

        PublicItemDto dto = Mappers.publicItem(item);

        assertNull(dto.modelUrl(), "3D Model URL must NOT be shown to guests while model is still PROCESSING!");
    }

    @Test
    void publicItemShowsReady3dModelUrlToGuests() {
        UUID restId = UUID.randomUUID();
        MenuItem item = new MenuItem(restId);
        item.apply("Steak Diane", "Mains", "Juicy tenderloin", new BigDecimal("3500.00"), "beef,special",
                true, true, true, "https://cdn.example.com/steak.jpg", 1.0, "plate");
        item.setModel("https://cdn.example.com/steak.glb", "steak.glb");
        item.setOriginalModelUrl("s3://bucket/private/original-steak.glb");
        item.setModelStatus("READY");

        PublicItemDto dto = Mappers.publicItem(item);

        assertEquals("https://cdn.example.com/steak.glb", dto.modelUrl());
    }
}
