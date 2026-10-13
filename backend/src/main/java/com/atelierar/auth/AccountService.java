package com.atelierar.auth;

import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AccountService {
    private final AppUserRepository users;
    private final RestaurantService restaurants;
    private final PasswordEncoder encoder;

    public AccountService(AppUserRepository users, RestaurantService restaurants, PasswordEncoder encoder) {
        this.users = users;
        this.restaurants = restaurants;
        this.encoder = encoder;
    }

    public record Registered(AppUser user, Restaurant restaurant) {
    }

    @Transactional
    public Registered register(String email, String password, String restaurantName, String city) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists. Try signing in.");
        }
        AppUser user = users.save(new AppUser(normalized, encoder.encode(password)));
        Restaurant restaurant = restaurants.create(user.getId(), restaurantName, city);
        return new Registered(user, restaurant);
    }

    public AppUser authenticate(String email, String password) {
        AppUser user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        if (user == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        return user;
    }
}
