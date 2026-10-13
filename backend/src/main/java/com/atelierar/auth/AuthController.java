package com.atelierar.auth;

import com.atelierar.config.CurrentUser;
import com.atelierar.config.JwtService;
import com.atelierar.config.RateLimiter;
import com.atelierar.restaurant.Restaurant;
import com.atelierar.restaurant.RestaurantRepository;
import com.atelierar.restaurant.RestaurantService;
import com.atelierar.web.Dtos.*;
import com.atelierar.web.Mappers;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AccountService accounts;
    private final AppUserRepository users;
    private final RestaurantRepository restaurantRepo;
    private final RestaurantService restaurantService;
    private final JwtService jwt;
    private final RateLimiter limiter;

    public AuthController(AccountService accounts, AppUserRepository users, RestaurantRepository restaurantRepo,
                          RestaurantService restaurantService, JwtService jwt, RateLimiter limiter) {
        this.accounts = accounts;
        this.users = users;
        this.restaurantRepo = restaurantRepo;
        this.restaurantService = restaurantService;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        limiter.check("auth:" + http.getRemoteAddr(), 20, Duration.ofMinutes(10));
        AccountService.Registered created = accounts.register(req.email(), req.password(), req.restaurantName(), req.city());
        return new AuthResponse(
                jwt.issue(created.user().getId()),
                new UserDto(created.user().getId().toString(), created.user().getEmail()),
                Mappers.restaurant(created.restaurant()));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        limiter.check("auth:" + http.getRemoteAddr(), 20, Duration.ofMinutes(10));
        AppUser user = accounts.authenticate(req.email(), req.password());
        // Not restaurantService.current(): the security context is still anonymous while logging in.
        Restaurant restaurant = restaurantRepo.findFirstByOwnerIdOrderByCreatedAtAsc(user.getId())
                .orElseGet(() -> restaurantService.create(user.getId(), "My restaurant", null));
        return new AuthResponse(jwt.issue(user.getId()),
                new UserDto(user.getId().toString(), user.getEmail()),
                Mappers.restaurant(restaurant));
    }

    @GetMapping("/me")
    public MeResponse me() {
        AppUser user = users.findById(CurrentUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again"));
        return new MeResponse(
                new UserDto(user.getId().toString(), user.getEmail()),
                Mappers.restaurant(restaurantService.current()));
    }
}
