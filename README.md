# Atelier AR

**Turn restaurant menus into an interactive 3D and Augmented Reality dining spectacle.**

Atelier AR empowers restaurant owners to upload photorealistic 3D dishes (`.glb`), print luxury QR table stands, and allow guests to place dishes directly onto their dining tables in Augmented Reality—without downloading any apps.

```
atelier/
  backend/    Spring Boot 3.4 (Java 21) REST API: Auth, S3 Presigned PUT, Analytics, Flyway Migrations
  frontend/   React 18 + Vite + TypeScript: Landing page, VIP Consultation, Owner Studio, Guest Menu
  samples/    CC0 photorealistic 3D food model (avocado.glb) for live testing
  docs/       Architecture, AWS CloudFront + S3 + Budget guides, Deployment guides
  docker-compose.yml
```

---

## Key Capabilities & Production Architecture

1. **Direct S3 Presigned PUT Uploads**:
   3D model files (up to 15 MB) are uploaded directly from the browser to Amazon S3 via cryptographically signed presigned PUT URLs (`/api/v1/items/{id}/model-presign`), completely bypassing Render's 512MB RAM and eliminating container out-of-memory crashes.

2. **Global CloudFront CDN & Cold-Start Immunity**:
   When a menu is published, the backend writes a static snapshot `public/{slug}/menu.json` directly to Amazon S3 and CloudFront CDN. Diners scanning QR table stands load menu data from CloudFront Edge within 100ms, completely immune to Render free-tier container sleep. When unpublishing or renaming a slug, the snapshot is automatically deleted from S3 and purged from CloudFront.

3. **Multi-Language Culinary Presentation**:
   Every dish supports bilingual translations with full support for **Urdu (اردو)** and **Arabic (العربية)**, complete with proper RTL font rendering, dietary tags, and localized descriptions.

4. **Direct Table WhatsApp Ordering**:
   Guests can assemble a dining order, enter their table number, and dispatch an order ticket formatted with table details directly to the kitchen or waiter's WhatsApp number.

5. **VIP Hospitality Lead Capture**:
   A dedicated high-conversion lead generation funnel captures multi-branch restaurant group consultations. Submissions are persisted in PostgreSQL and accessible via authenticated `GET /api/v1/leads`.

6. **Relational Schema Hardening & Daily Retention**:
   Full referential integrity with foreign key constraints, `ON DELETE CASCADE` rules, and indexes on `menu_events.item_id`. Raw events older than 90 days are automatically purged daily at 3:15 AM UTC to keep database storage well within Neon's 0.5 GB free-tier limit.

7. **Synchronized Custom Categories**:
   Dish categories are stored in PostgreSQL on the `restaurants` entity and updated via `PATCH /api/v1/restaurant/categories`, keeping categories synchronized across all devices, browsers, and published menus.

---

## Run Locally

### Prerequisites
- **Java 21+**
- **Node.js 20+**
- **No external database required for development**: Uses an embedded H2 file database (`MODE=PostgreSQL`) by default.

```bash
# 1. Start Spring Boot API (port 8080)
cd backend
mvn spring-boot:run

# 2. Start Frontend Dev Server (port 5173)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), create an account, click **Use sample dishes**, and explore the **3D Studio**.

---

## Production Deployment ($0.00 / Month Architecture)

| Component | Service | Cost |
|---|---|---|
| **Frontend** | Cloudflare Pages / Vercel | $0.00 / month |
| **Backend API** | Render / Koyeb Web Service (Docker) | $0.00 / month |
| **Database** | Neon Serverless PostgreSQL | $0.00 / month |
| **Asset Storage** | Amazon S3 + CloudFront CDN (OAC) | $0.00 / month (AWS Free Tier) |

Detailed step-by-step setup guides:
- [Deployment Guide](docs/DEPLOY.md)
- [AWS CloudFront & S3 Zero-Spend Guide](docs/aws/CLOUDFRONT_AND_BUDGETS.md)

---

## Automated Testing Suite

The backend includes automated JUnit 5 test suites covering critical security, snapshot privacy, and asset management:
- **`PublicMenuSnapshotPrivacyTest`**: Verifies that Wi-Fi passwords and unready 3D model URLs are never exposed in public guest snapshots.
- **`ImageOptimizationServiceTest`**: Tests WebP and thumbnail compression pipelines.
- **`S3StorageServiceTest` & `StorageServiceTest`**: Tests asset quotas, presigned URLs, and tenant isolation.

Run tests:
```bash
cd backend
mvn test
```

---

## API Summary (All JSON, Prefix `/api/v1`)

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register`, `/auth/login`, `/auth/me` | POST / GET | User registration, authentication & session profile |
| `/restaurant` | GET / PUT | Restaurant branding, currency, accent, socials, and Wi-Fi |
| `/restaurant/publish?value=` | PATCH | Publish or unpublish menu snapshot on S3/CloudFront |
| `/restaurant/categories` | PATCH | Update and synchronize persistent dish categories |
| `/restaurant/cover` | POST / DELETE | Upload or remove dining cover hero photo |
| `/items` | GET / POST | List dishes or create new dish |
| `/items/{id}` | PUT / DELETE | Update dish metadata or delete dish |
| `/items/{id}/model-presign` | POST | Request S3 presigned PUT URL for direct browser upload |
| `/items/{id}/model-confirm` | POST | Confirm direct S3 upload and activate model |
| `/items/{id}/model-tuning` | PATCH | Adjust AR scaling and plate/slate placement |
| `/items/{id}/available?value=` | PATCH | Toggle sold-out / in-stock status |
| `/analytics/summary?days=7` | GET | Aggregated scan, dish view, and AR launch analytics |
| `/public/menu/{slug}` | GET | Public guest menu snapshot |
| `/public/menu/{slug}/events` | POST | Beacon event ingestion (scans, views, AR launches) |
| `/public/leads` | POST | Submit VIP consultation inquiry from landing page |
| `/leads` | GET | Authenticated lead list for sales follow-up |
