const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.S3_BUCKET || 'atelier-ar-bucket';
const DOMAIN = process.env.VITE_ASSET_BASE_URL || process.env.S3_PUBLIC_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const creds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
};

const s3 = new S3Client({ region: REGION, credentials: creds });

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          dataLength: data.length
        });
      });
    });
    req.on('error', (err) => {
      resolve({ statusCode: 0, error: err.message });
    });
    req.setTimeout(5000, () => {
      req.abort();
      resolve({ statusCode: 408, error: 'Timeout' });
    });
  });
}

async function run() {
  console.log('================================================================');
  console.log('Atelier AR: Public vs Private Asset Access Verification');
  console.log('Testing Base Target:', DOMAIN);
  console.log('================================================================\n');

  // Test 1: Public Menu Snapshot
  const publicMenuUrl = `${DOMAIN}/public/chai-gpt/menu.json`;
  console.log(`[TEST 1] Guest access to published menu snapshot:`);
  console.log(`URL: ${publicMenuUrl}`);
  const r1 = await checkHttp(publicMenuUrl);
  console.log(`Result: HTTP ${r1.statusCode} ${r1.statusCode === 200 ? 'PASS (Publicly Accessible)' : 'FAIL'}`);
  console.log(`Payload size: ${r1.dataLength} bytes\n`);

  // Test 2: Public Optimized GLB Model
  const publicModelUrl = `${DOMAIN}/restaurants/b6ff4ba5-e2bd-44d9-a240-783b6b2ccd53/items/4441b182-074f-4689-a0fe-ee6d250857d1/e7701bf5-dbea-46a6-8940-9abefd53566b.glb`;
  console.log(`[TEST 2] Guest access to optimized 3D .glb model:`);
  console.log(`URL: ${publicModelUrl}`);
  const r2 = await checkHttp(publicModelUrl);
  console.log(`Result: HTTP ${r2.statusCode} ${r2.statusCode === 200 ? 'PASS (Publicly Accessible for model-viewer)' : 'FAIL'}`);
  console.log(`Payload size: ${r2.dataLength} bytes (${(r2.dataLength / (1024*1024)).toFixed(2)} MB)\n`);

  // Test 3: Anonymous Access to Private Original Model
  const privateModelKey = 'restaurants/test-restaurant-123/items/test-item-456/original-secret.glb';
  const privateAnonymousUrl = `${DOMAIN}/${privateModelKey}`;
  console.log(`[TEST 3] Anonymous direct request to private original GLB:`);
  console.log(`URL: ${privateAnonymousUrl}`);
  const r3 = await checkHttp(privateAnonymousUrl);
  if (r3.statusCode === 403) {
    console.log(`Result: HTTP 403 Forbidden -> PASS (Private original is protected from public/anonymous download)`);
  } else if (r3.statusCode === 200) {
    console.log(`Result: HTTP 200 OK -> ACTION REQUIRED: Bucket policy or S3 Block Public Access is still open.`);
    console.log(`Apply docs/aws/bucket-policy.json to enforce 403 on private originals.`);
  } else {
    console.log(`Result: HTTP ${r3.statusCode}`);
  }
  console.log();

  // Test 4: Authorized Owner Access to Private Original via Presigned GET URL
  console.log(`[TEST 4] Authorized owner access via Backend Presigned GET URL (15-min TTL):`);
  const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: privateModelKey });
  const presignedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 900 });
  console.log(`Generated Presigned URL: ${presignedUrl.substring(0, 80)}...`);
  const r4 = await checkHttp(presignedUrl);
  console.log(`Result: HTTP ${r4.statusCode} ${r4.statusCode === 200 ? 'PASS (Owner can download private original)' : 'FAIL'}`);
  console.log(`Payload size: ${r4.dataLength} bytes\n`);

  console.log('================================================================');
  console.log('Verification Summary Complete.');
  console.log('================================================================');
}

run();
