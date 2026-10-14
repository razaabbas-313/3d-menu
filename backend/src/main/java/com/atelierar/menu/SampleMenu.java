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
                        "Halal", true, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd" + Q,
                        "دی ٹرفل رائل", "خشک بیف، بلیک ٹرفل کریم، چیڈر چیز، اور بروش بن۔",
                        "ذا ترافل رويال", "لحم بقري معتق، كريمة الترافل الأسود، جبن شيدر، وخبز البريوش."),
                item(restaurantId, "Burrata Garden", "Starters",
                        "Creamy burrata, heirloom tomato, basil oil and warm sourdough.", "1850",
                        "Vegetarian", false, "https://images.unsplash.com/photo-1608039829572-78524f79c4c7" + Q,
                        "بوراٹا گارڈن", "کریمی بوراٹا، ٹماٹر، تلسی کا تیل اور گرم سوورڈو۔",
                        "حديقة البوراتا", "جبنة بوراتا كريمية، طماطم، زيت الريحان وخبز العجين المخمر."),
                item(restaurantId, "Charred Corn Ribs", "Starters",
                        "Smoky sweetcorn, lime crema and smoked paprika.", "950",
                        "Vegetarian,Spicy", false, "https://images.unsplash.com/photo-1551754655-cd27e38d2076" + Q,
                        "چارڈ کارن ربز", "بھنی ہوئی سویٹ کارن، لائم کریما اور پیپریکا۔",
                        "أضلاع الذرة المشوية", "ذرة حلوة مدخنة، كريمة الليمون، وبابريكا مدخنة."),
                item(restaurantId, "Saffron Sea Bass", "Mains",
                        "Pan-seared sea bass, saffron beurre blanc and seasonal greens.", "3200",
                        "Halal,Gluten-free", true, "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2" + Q,
                        "زعفران سی باس", "پین فرائیڈ سی باس، زعفرانی ساس اور تازہ سبزیاں۔",
                        "سمك القاروص بالزعفران", "سمك القاروص المحمر، صلصة الزبدة بالزعفران والخضار الموسمية."),
                item(restaurantId, "Midnight Tiramisu", "Desserts",
                        "Espresso-soaked ladyfingers, mascarpone and dark cocoa.", "1250",
                        "Vegetarian", true, "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9" + Q,
                        "مڈ نائٹ تیرامیسو", "ایسپریسو، مسکارپون چیز اور ڈارک کوکو۔",
                        "تيراميسو منتصف الليل", "بسكويت مشبع بالإسبريسو، جبنة ماسكاربوني، وكاكاو داكن."),
                item(restaurantId, "Rosewater Pavlova", "Desserts",
                        "Crisp meringue, rose cream, berries and pistachio.", "1100",
                        "Vegetarian,Gluten-free", false, "https://images.unsplash.com/photo-1488477181946-6428a0291777" + Q,
                        "عرق گلاب پاولوا", "کرسپی مرینگو، گلاب کریم، بیریز اور پستہ۔",
                        "بافلوفا بماء الورد", "مارينغ مقرمش، كريمة الورد، توت مشكل وفستق حلبي.")
        );
    }

    private static MenuItem item(UUID rid, String name, String category, String description, String price,
                                 String tags, boolean featured, String imageUrl,
                                 String nameUr, String descriptionUr, String nameAr, String descriptionAr) {
        MenuItem item = new MenuItem(rid);
        item.apply(name, category, description, new BigDecimal(price), tags, featured, true, true, imageUrl, 1.0, "plate",
                nameUr, descriptionUr, nameAr, descriptionAr);
        return item;
    }
}
