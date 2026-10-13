# Atelier AR

3D and augmented-reality menus for restaurants. Owners upload dishes and `.glb` models, print one QR code, and guests
scan it to rotate each dish on their phone and place it on their table in AR. No app to install.

```
atelier/
  backend/    Spring Boot 3.4 (Java 21) REST API: auth, menu, uploads, analytics
  frontend/   React 18 + Vite + TypeScript: landing page, owner dashboard, guest menu
  samples/    A CC0 demo model (avocado.glb) for trying the 3D studio
  docker-compose.yml
```

## Run it locally

You need Java 21 and Node 20+. **No database install is required**: the API uses an embedded H2 file database by default.

```bash
# terminal 1: API on http://localhost:8080
cd backend && mvn spring-boot:run

# terminal 2: website on http://localhost:5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173, create an account, click **Use sample dishes**, then upload `samples/avocado.glb` to a dish in
the **3D studio**.

No Java handy? `cd frontend && npm run mock` starts an in-memory stand-in for the API on port 8080 (data resets on restart).

### PostgreSQL
Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (see `backend/.env.example`). If you already have a database from the first MVP,
the new columns are added automatically, but the old demo restaurant has no owner. Simplest is to start from an empty database.

### Testing AR on a real phone
AR only works over **https** on a phone, so `localhost` will not do. Expose your dev server with a tunnel
(for example `cloudflared tunnel --url http://localhost:5173` or `ngrok http 5173`), publish your menu, and scan the QR code
from the **QR and sharing** page. In the **3D studio** there is also a "Try it on your phone" QR for the selected dish.
iPhones open Quick Look, Android phones open Scene Viewer or WebXR.

### Production
`JWT_SECRET=$(openssl rand -hex 32) docker compose up --build` starts PostgreSQL, the API and an nginx site on port 3000.
Put it behind HTTPS (Caddy, Cloudflare, a load balancer). Back up the `pgdata` and `uploads` volumes.

## What was fixed and added since the first version

| Area | Before | Now |
|---|---|---|
| Security | No login; anyone could edit any restaurant | JWT accounts, BCrypt passwords, every query scoped to the owner, rate-limited sign-in and event endpoints |
| Uploads | `.gltf` accepted (breaks without its `.bin`), extension trusted, old files orphaned | GLB only, verified by file signature, size-limited, old files deleted on replace, photo upload added |
| Analytics | Hard-coded "1,284 scans" | Real scan, dish-view and AR-launch events with daily charts and top dishes |
| Data | `featured` never reached the UI; fake starter dishes when the API was down | Featured, sold-out, hidden and dietary labels; honest loading, empty and error states |
| Editing | `prompt()` / `confirm()` | Editor drawer, confirm dialogs, search, filters, quick hide |
| QR | Third-party QR service, fields that did not save | Local QR generation, PNG/SVG download, printable table card, publish toggle |
| Guest menu | Hard-coded restaurant, same stock photo, `?menu=` links | Branded per restaurant (name, cover, accent), `/m/slug` links, deep links to a dish, search, sold-out states |
| Errors | Generic handler swallowed exceptions; oversized upload gave a 500 | Consistent `{ "error": "..." }` JSON, logging, proper 400/401/404/409/413/429 |
| Ops | CORS hard-coded | Environment-driven config, Dockerfiles, compose stack |

## API (all JSON, prefix `/api/v1`)

| | |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | accounts |
| `GET/PUT /restaurant`, `PATCH /restaurant/publish?value=`, `POST/DELETE /restaurant/cover`, `POST /restaurant/sample-menu` | owner's restaurant |
| `GET/POST /items`, `PUT/DELETE /items/{id}`, `POST /items/{id}/image`, `POST/DELETE /items/{id}/model` | dishes |
| `GET /analytics/summary?days=7&tz=300` | guest activity |
| `GET /public/menu/{slug}`, `POST /public/menu/{slug}/events` | guest menu (no login) |

## Known limitations and sensible next steps
- **Storage** is local disk. Move uploads to S3/R2 + a CDN before running several servers.
- **Schema** is managed by Hibernate `ddl-auto=update`. Add Flyway migrations before real customers.
- **Rate limiting** is in-memory (one instance). Use Redis or an edge limiter when you scale out.
- **Analytics** aggregates in Java, fine for thousands of events a day; switch to SQL aggregation or pre-computed daily rows later.
- **Not built yet**: password reset and email verification, multiple branches per owner, billing (the landing-page prices are placeholders in `Landing.tsx`),
  Urdu/RTL and multi-language menus, drag-to-reorder dishes, automated tests.
