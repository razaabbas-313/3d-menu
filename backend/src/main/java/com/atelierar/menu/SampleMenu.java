package com.atelierar.menu;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Example dishes offered to brand-new restaurants. Photos are hot-linked from Unsplash. */
public final class SampleMenu {
    private SampleMenu() {
    }

    private static final String Q = "?auto=format&fit=crop&w=900&q=80";

    public static List<MenuItem> build(UUID restaurantId) {
        return List.of(
                item(restaurantId, "The Truffle Royale", "Signatures",
                        "Dry-aged beef, black truffle cream, aged cheddar, toasted brioche.", "2450",
                        "Halal", true, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd" + Q),
                item(restaurantId, "Burrata Garden", "Starters",
                        "Creamy burrata, heirloom tomato, basil oil and warm sourdough.", "1850",
                        "Vegetarian", false, "https://images.unsplash.com/photo-1608039829572-78524f79c4c7" + Q),
                item(restaurantId, "Charred Corn Ribs", "Starters",
                        "Smoky sweetcorn, lime crema and smoked paprika.", "950",
                        "Vegetarian,Spicy", false, "https://images.unsplash.com/photo-1551754655-cd27e38d2076" + Q),
                item(restaurantId, "Saffron Sea Bass", "Mains",
                        "Pan-seared sea bass, saffron beurre blanc and seasonal greens.", "3200",
                        "Halal,Gluten-free", true, "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2" + Q),
                item(restaurantId, "Midnight Tiramisu", "Desserts",
                        "Espresso-soaked ladyfingers, mascarpone and dark cocoa.", "1250",
                        "Vegetarian", true, "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9" + Q),
                item(restaurantId, "Rosewater Pavlova", "Desserts",
                        "Crisp meringue, rose cream, berries and pistachio.", "1100",
                        "Vegetarian,Gluten-free", false, "https://images.unsplash.com/photo-1488477181946-6428a0291777" + Q)
        );
    }

    private static MenuItem item(UUID rid, String name, String category, String description, String price,
                                 String tags, boolean featured, String imageUrl) {
        MenuItem item = new MenuItem(rid);
        item.apply(name, category, description, new BigDecimal(price), tags, featured, true, true, imageUrl, 1.0, "plate");
        return item;
    }
}
