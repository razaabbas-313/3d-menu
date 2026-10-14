# AWS CloudFront CDN & Zero-Cost Budget Alert Guide

This guide ensures your 3D models and menu images load instantaneously worldwide using AWS CloudFront's **Always-Free Tier** (1 TB data transfer out per month, 10,000,000 HTTP/HTTPS requests per month), while configuring a zero-dollar budget alert so you never incur unexpected charges.

---

## Part 1: Setting Up AWS CloudFront in Front of S3 (Always Free Tier)

Using CloudFront directly in front of your S3 bucket reduces S3 data retrieval costs to zero (transfers between S3 and CloudFront are free) and provides low-latency edge caching for `.glb` files and public snapshots.

### Step 1: Create an S3 Bucket
1. Open the **AWS S3 Console** (`https://s3.console.aws.amazon.com/s3`).
2. Click **Create bucket**.
3. Name your bucket (e.g., `atelier-menu-assets-prod`).
4. Select your preferred AWS Region (e.g., `us-east-1` or `eu-central-1`).
5. Under **Object Ownership**, choose **ACLs disabled (recommended)**.
6. Under **Block Public Access settings for this bucket**:
   - If serving exclusively through CloudFront with OAC (recommended), you can leave "Block all public access" checked.
   - If serving public URLs directly, uncheck "Block all public access" and apply `docs/aws/bucket-policy.json`.
7. Click **Create bucket**.
8. Go to the **Permissions** tab of your bucket, scroll to **Cross-origin resource sharing (CORS)**, click **Edit**, and paste the contents of [`docs/aws/cors.json`](file:///d:/downloads/atelier-ar-v2/atelier/docs/aws/cors.json).

### Step 2: Create a CloudFront Distribution
1. Open the **AWS CloudFront Console** (`https://us-east-1.console.aws.amazon.com/cloudfront`).
2. Click **Create distribution**.
3. **Origin domain**: Click the input and select your S3 bucket from the dropdown (e.g. `atelier-menu-assets-prod.s3.us-east-1.amazonaws.com`).
4. **Origin access**:
   - Select **Origin access control settings (recommended)**.
   - Click **Create new OAC**, name it `Atelier-S3-OAC`, and select **Sign requests (recommended)**.
   - Copy the policy prompt shown by CloudFront and attach it to your S3 bucket permissions.
5. **Default cache behavior**:
   - **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
   - **Allowed HTTP methods**: Select **GET, HEAD, OPTIONS** (required for CORS 3D model preflights).
   - **Cache policy**: Select **Managed-CachingOptimized** (respects `Cache-Control` max-age headers).
   - **Origin request policy**: Select **Managed-CORS-S3Origin**.
   - **Response headers policy**: Select **Managed-SimpleCORS** or create a policy forwarding CORS headers.
6. Click **Create distribution**.
7. Note down your **Distribution domain name** (e.g., `d111111abcdef8.cloudfront.net`).
8. In your backend `.env` or hosting settings, set:
   ```env
   S3_PUBLIC_BASE_URL=https://d111111abcdef8.cloudfront.net
   ```

---

## Part 2: Setting Up a $0.01 AWS Budget Alert (Zero Surprise Bills)

AWS allows you to set up billing alerts so you are notified via email the moment your monthly usage exceeds $0.01 or approaches free-tier thresholds.

### Step 1: Enable Billing Alerts
1. Open the **AWS Billing and Cost Management Console** (`https://console.aws.amazon.com/billing`).
2. In the navigation pane on the left, click **Billing preferences**.
3. Ensure **Receive Free Tier usage alerts** is checked and enter your email address.
4. Click **Save preferences**.

### Step 2: Create a Zero-Dollar Budget
1. In the left navigation, click **Budgets** (or search for **AWS Budgets**).
2. Click **Create budget**.
3. Choose **Zero spend budget** (or **Cost budget**).
   - If using **Cost budget**:
     - Budget name: `Atelier-Zero-Spend-Guard`
     - Period: `Monthly`
     - Budget renewal type: `Recurring budget`
     - Budgeting method: `Fixed`
     - Enter budget amount: `$1.00` (or `$0.50`)
4. Click **Next** to configure alert thresholds.
5. Add Alert Threshold:
   - Threshold: `1%` of budgeted amount (or `$0.01` actual cost).
   - Trigger: `Actual`.
   - Notification recipients: Enter your personal email address.
6. Add a second Alert Threshold:
   - Threshold: `80%` of budgeted amount (forecasted).
   - Notification recipients: Enter your email address.
7. Click **Next**, review the budget, and click **Create budget**.

You will now receive an instant email alert if any AWS resource generates even 1 cent of usage, allowing you to stop or adjust it before any charges accumulate.
