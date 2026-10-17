package com.atelierar.restaurant;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "restaurants")
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Nullable so databases created by the first MVP (no owners) still migrate cleanly. */
    @Column
    private UUID ownerId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(length = 500)
    private String tagline;

    @Column(length = 120)
    private String city;

    @Column(length = 8)
    private String currency = "PKR";

    @Column(length = 20)
    private String accent = "cobalt";

    @Column(length = 120)
    private String instagram;

    @Column(length = 60)
    private String whatsapp;

    @Column(length = 60)
    private String phone;

    @Column(length = 120)
    private String tiktok;

    @Column(length = 120)
    private String facebook;

    @Column(length = 255)
    private String website;

    @Column(length = 500)
    private String googleMapsUrl;

    @Column(length = 100)
    private String wifiName;

    @Column(length = 100)
    private String wifiPassword;

    @Column(length = 30)
    private String theme = "dark";

    @Column(length = 500)
    private String coverUrl;

    @Column(nullable = false)
    private boolean published = false;

    @Column(columnDefinition = "boolean default true")
    private boolean whatsappOrderEnabled = true;

    @Column(length = 500)
    private String whatsappMessageTemplate = "Hello, I would like to order {dish} for Table {table}.";

    @Column(length = 2000)
    private String categories;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Restaurant() {
    }

    public Restaurant(UUID ownerId, String name, String slug, String city) {
        this.ownerId = ownerId;
        this.name = name;
        this.slug = slug;
        this.city = city;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getTagline() { return tagline; }
    public String getCity() { return city; }
    public String getCurrency() { return currency == null ? "PKR" : currency; }
    public String getAccent() { return accent == null ? "cobalt" : accent; }
    public String getCoverUrl() { return coverUrl; }
    public boolean isPublished() { return published; }
    public String getInstagram() { return instagram; }
    public String getWhatsapp() { return whatsapp; }
    public String getPhone() { return phone; }
    public String getTiktok() { return tiktok; }
    public String getFacebook() { return facebook; }
    public String getWebsite() { return website; }
    public String getGoogleMapsUrl() { return googleMapsUrl; }
    public String getWifiName() { return wifiName; }
    public String getWifiPassword() { return wifiPassword; }
    public String getTheme() { return theme == null ? "dark" : theme; }
    public boolean isWhatsappOrderEnabled() { return whatsappOrderEnabled; }
    public String getWhatsappMessageTemplate() {
        return whatsappMessageTemplate == null ? "Hello, I would like to order {dish} for Table {table}." : whatsappMessageTemplate;
    }
    public String getCategories() { return categories; }

    public java.util.List<String> getCategoriesList() {
        if (categories == null || categories.isBlank()) {
            return java.util.List.of();
        }
        return java.util.Arrays.stream(categories.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public void setCategories(String categories) { this.categories = categories; }

    public void setCategoriesList(java.util.List<String> list) {
        if (list == null || list.isEmpty()) {
            this.categories = null;
        } else {
            this.categories = String.join(",", list);
        }
    }

    public void setId(UUID id) { this.id = id; }
    public void setSlug(String slug) { this.slug = slug; }
    public void setPublished(boolean published) { this.published = published; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public void setWhatsappOrderEnabled(boolean whatsappOrderEnabled) { this.whatsappOrderEnabled = whatsappOrderEnabled; }
    public void setWhatsappMessageTemplate(String template) { this.whatsappMessageTemplate = template; }

    public void updateProfile(String name, String slug, String tagline, String city, String currency, String accent,
                              String instagram, String whatsapp, String phone, String tiktok, String facebook,
                              String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme,
                              Boolean whatsappOrderEnabled, String whatsappMessageTemplate) {
        updateProfile(name, slug, tagline, city, currency, accent, instagram, whatsapp, phone, tiktok, facebook,
                website, googleMapsUrl, wifiName, wifiPassword, theme, whatsappOrderEnabled, whatsappMessageTemplate, null);
    }

    public void updateProfile(String name, String slug, String tagline, String city, String currency, String accent,
                              String instagram, String whatsapp, String phone, String tiktok, String facebook,
                              String website, String googleMapsUrl, String wifiName, String wifiPassword, String theme,
                              Boolean whatsappOrderEnabled, String whatsappMessageTemplate,
                              java.util.List<String> categories) {
        this.name = name;
        if (slug != null && !slug.isBlank()) this.slug = slug;
        this.tagline = tagline;
        this.city = city;
        if (currency != null) this.currency = currency;
        if (accent != null) this.accent = accent;
        this.instagram = instagram;
        this.whatsapp = whatsapp;
        this.phone = phone;
        this.tiktok = tiktok;
        this.facebook = facebook;
        this.website = website;
        this.googleMapsUrl = googleMapsUrl;
        this.wifiName = wifiName;
        this.wifiPassword = wifiPassword;
        if (theme != null) this.theme = theme;
        if (whatsappOrderEnabled != null) this.whatsappOrderEnabled = whatsappOrderEnabled;
        if (whatsappMessageTemplate != null && !whatsappMessageTemplate.isBlank()) this.whatsappMessageTemplate = whatsappMessageTemplate;
        if (categories != null) {
            setCategoriesList(categories);
        }
    }
}
