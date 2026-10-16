# Atelier AR: Free-Tier Production Deployment Guide

This guide details how a solo founder can run the complete **Atelier AR** platform with **$0 monthly hosting costs** using modern developer free tiers:

* **Frontend**: Cloudflare Pages (100% Free, Unlimited Bandwidth, Commercial Use Allowed)
* **Storage**: AWS S3 + AWS CloudFront (Free Tier / Always Free 1 TB CDN Transfer)
* **Database**: Neon or Supabase (Free Tier Managed Serverless PostgreSQL)
* **Backend API**: Render, Koyeb, or Fly.io (Free Container / Web Service Tier)

> [!IMPORTANT]
> **Why Cloudflare Pages instead of Vercel?**  
> Vercel's Hobby (Free) plan terms explicitly restrict usage to non-commercial, personal projects. Because Atelier AR is a commercial B2B SaaS platform for restaurants, deploying on Vercel's free plan violates their Terms of Service. **Cloudflare Pages** allows commercial projects on its free plan, provides unlimited free bandwidth, and offers low global latency.

---

## Architecture at a Glance

```
Diners (Mobile Phones) ───────► Cloudflare Pages (Static Frontend HTML/JS/CSS)
                                     │
                                     ├──────► AWS CloudFront / S3 (public/{slug}/menu.json & 3D .glb models)
                                     │
                                     └──────► Render / Koyeb (Spring Boot 3.4 API)
                                                   │
                                                   └──────► Neon / Supabase (PostgreSQL 16)
```

---

## Step 1: Managed PostgreSQL Database (Neon or Supabase)

### Option A: Neon (Recommended for Serverless Postgres)
1. Sign up at [neon.tech](https://neon.tech) (Free Plan: 0.5 GB storage, serverless autoscaling).
2. Create a new project named `atelier-ar-prod`.
3. In the project dashboard, locate the **Connection Details**.
4. Select **Connection string** and choose **Java / JDBC**:
   ```
   jdbc:postgresql://ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Note down your `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.

---

## Step 2: AWS S3 & CloudFront Asset CDN

Follow the step-by-step setup in [`docs/aws/CLOUDFRONT_AND_BUDGETS.md`](file:///d:/downloads/atelier-ar-v2/atelier/docs/aws/CLOUDFRONT_AND_BUDGETS.md):
1. **Create S3 Bucket**: e.g., `atelier-menu-assets-prod`.
2. **Apply CORS Configuration**: Paste [`docs/aws/cors.json`](file:///d:/downloads/atelier-ar-v2/atelier/docs/aws/cors.json) into the S3 CORS tab.
3. **Create IAM User**: Attach [`docs/aws/iam-policy.json`](file:///d:/downloads/atelier-ar-v2/atelier/docs/aws/iam-policy.json). Generate an Access Key ID and Secret Access Key.
4. **Create CloudFront Distribution**: Connect it to your S3 bucket.
5. **Set up AWS Zero-Spend Budget**: Set an alert threshold at `$0.01` so you are emailed if anything incurs charges.

---

## Step 3: Backend API Deployment (Render / Koyeb)

### Deploying on Render (Free Web Service)
1. Fork or push your repository to GitHub.
2. Sign up at [render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   * **Name**: `atelier-ar-api`
   * **Root Directory**: `backend`
   * **Environment**: `Docker` (Render will automatically detect `backend/Dockerfile`)
   * **Instance Type**: `Free` (512 MB RAM, 0.1 CPU)
6. Add **Environment Variables**:
   | Variable | Value | Description |
   |---|---|---|
   | `PORT` | `8080` | Internal container port |
   | `JWT_SECRET` | `(32+ character random hex)` | `openssl rand -hex 32` |
   | `CORS_ORIGINS` | `https://*.pages.dev,http://localhost:5173` | Add your custom domain here once configured |
   | `STORAGE_PROVIDER` | `s3` | Enables cloud asset persistence |
   | `AWS_REGION` | `ap-south-1` | S3 bucket region (Mumbai) |
   | `S3_BUCKET` | `atelier-ar-bucket` | Your S3 bucket name |
   | `S3_PUBLIC_BASE_URL` | `https://d3v0d0550ieqxu.cloudfront.net` | Your CloudFront distribution URL |
   | `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM user access key |
   | `AWS_SECRET_ACCESS_KEY` | `wJalr...` | IAM user secret key |
   | `DB_URL` | `jdbc:postgresql://...` | JDBC URL from Neon or Supabase |
   | `DB_USERNAME` | `neondb_owner` | Postgres user |
   | `DB_PASSWORD` | `...` | Postgres password |
   | `DDL_AUTO` | `validate` | Flyway handles migrations |
7. Click **Create Web Service**. Render will build the Docker container and start your API.
8. Note down your backend URL: e.g. `https://atelier-ar-api.onrender.com`.

---

## Step 4: Frontend Deployment (Cloudflare Pages)

1. Sign up or log into [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository (`3d-menu`).
4. Configure Build Settings:
   * **Project name**: `atelier-ar` (will give `atelier-ar.pages.dev`)
   * **Production branch**: `main`
   * **Framework preset**: `Vite`
   * **Root directory**: `frontend`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
5. Under **Environment variables (Production)**, add:
   * `VITE_API_BASE_URL`: `https://atelier-ar-api.onrender.com` (your backend URL)
   * `VITE_ASSET_BASE_URL`: `https://d3v0d0550ieqxu.cloudfront.net` (your CloudFront URL)
6. Click **Save and Deploy**.
7. Cloudflare Pages automatically detects [`frontend/public/_redirects`](file:///d:/downloads/atelier-ar-v2/atelier/frontend/public/_redirects) for SPA routing and [`frontend/public/_headers`](file:///d:/downloads/atelier-ar-v2/atelier/frontend/public/_headers) for 3D model CORS headers.

---

## Step 5: Cold-Start Immunity Verification

Because free-tier container hosts (Render, Koyeb) sleep after 15 minutes of inactivity, verify that guests scanning a QR code do **not** wait for the server:
1. Open the owner dashboard at `https://atelier-ar.pages.dev/app`.
2. Add a dish or update your menu, then click **Publish**.
3. Verify that your backend automatically published `public/{slug}/menu.json` to S3 / CloudFront.
4. Put your Render backend into sleep mode or pause it.
5. Open `https://atelier-ar.pages.dev/m/{slug}` on your phone.
6. The menu will load instantly in under 150ms from CloudFront/S3 without waking the backend server!

---

## Step 6: Cost-Guard & Security Checklist

- [ ] **AWS Budget Alert**: Verified that a $0.01 threshold budget alert is active in the AWS Billing Console.
- [ ] **S3 Public Write Protection**: Checked that the S3 bucket policy allows public `s3:GetObject` only for `public/*`, `models/*`, and `images/*`, and that write/delete access requires IAM credentials.
- [ ] **JWT Secret**: Confirmed that `JWT_SECRET` is at least 32 random characters and not using the dev default.
- [ ] **Database Connection Limits**: Enabled connection pooling in Neon/Supabase to avoid hitting max connection ceilings on free tiers.
- [ ] **Cloudflare HTTPS**: Enforced "Always Use HTTPS" in Cloudflare SSL/TLS settings (required for WebXR and camera-based AR).
