const { CloudFrontClient, CreateOriginAccessControlCommand, CreateDistributionCommand } = require('@aws-sdk/client-cloudfront');
const { S3Client, PutBucketPolicyCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.S3_BUCKET || 'atelier-ar-bucket';
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || '480836974477';

const creds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
};

const cfClient = new CloudFrontClient({ region: 'us-east-1', credentials: creds });
const s3Client = new S3Client({ region: REGION, credentials: creds });

async function main() {
  console.log('=== Atelier AR: Automated AWS CloudFront + S3 Setup ===');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Region: ${REGION}`);
  console.log(`Account ID: ${ACCOUNT_ID}`);

  try {
    // 1. Create OAC (Origin Access Control)
    console.log('\n1. Creating CloudFront Origin Access Control (OAC)...');
    let oacId;
    try {
      const oacRes = await cfClient.send(new CreateOriginAccessControlCommand({
        OriginAccessControlConfig: {
          Name: 'Atelier-S3-OAC',
          Description: 'Origin Access Control for Atelier AR S3 Bucket',
          SigningProtocol: 'sigv4',
          SigningBehavior: 'always',
          OriginAccessControlOriginType: 's3'
        }
      }));
      oacId = oacRes.OriginAccessControl.Id;
      console.log(`   OAC created successfully with ID: ${oacId}`);
    } catch (e) {
      if (e.name === 'OriginAccessControlAlreadyExists') {
        console.log('   OAC "Atelier-S3-OAC" already exists, continuing...');
      } else {
        throw e;
      }
    }

    // 2. Create CloudFront Distribution
    console.log('\n2. Creating CloudFront Distribution for S3 Origin...');
    const originDomain = `${BUCKET}.s3.${REGION}.amazonaws.com`;
    const callerReference = `atelier-${Date.now()}`;

    const distParams = {
      DistributionConfig: {
        CallerReference: callerReference,
        Comment: 'Atelier AR 3D Menu & Asset Distribution CDN',
        Enabled: true,
        Origins: {
          Quantity: 1,
          Items: [
            {
              Id: `S3-${BUCKET}`,
              DomainName: originDomain,
              OriginAccessControlId: oacId,
              S3OriginConfig: {
                OriginAccessIdentity: ''
              }
            }
          ]
        },
        DefaultCacheBehavior: {
          TargetOriginId: `S3-${BUCKET}`,
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 3,
            Items: ['GET', 'HEAD', 'OPTIONS'],
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD']
            }
          },
          // AWS Managed-CachingOptimized Cache Policy ID
          CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
          // AWS Managed-CORS-S3Origin Origin Request Policy ID
          OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf',
          // AWS Managed-CORS-and-SecurityHeadersPolicy Response Headers Policy ID
          ResponseHeadersPolicyId: 'e61eb60c-9c35-4d30-a981-8049ed4a4804',
          Compress: true
        },
        PriceClass: 'PriceClass_100', // North America and Europe edge locations (100% Free Tier covered)
        HttpVersion: 'http2and3'
      }
    };

    const distRes = await cfClient.send(new CreateDistributionCommand(distParams));
    const dist = distRes.Distribution;
    const distributionId = dist.Id;
    const cloudFrontDomain = `https://${dist.DomainName}`;

    console.log(`   CloudFront Distribution Created!`);
    console.log(`   Distribution ID:     ${distributionId}`);
    console.log(`   Distribution Domain: ${cloudFrontDomain}`);

    // 3. Update S3 Bucket Policy with generated Distribution ID
    console.log('\n3. Applying S3 Bucket Policy with OAC and Private Originals Deny Rule...');
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowCloudFrontServicePrincipalReadOnly',
          Effect: 'Allow',
          Principal: {
            Service: 'cloudfront.amazonaws.com'
          },
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET}/*`,
          Condition: {
            StringEquals: {
              'AWS:SourceArn': `arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${distributionId}`
            }
          }
        },
        {
          Sid: 'DenyDirectAccessToPrivateOriginals',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET}/restaurants/*/items/*/original-*.glb`,
          Condition: {
            StringNotLike: {
              'aws:PrincipalArn': `arn:aws:iam::${ACCOUNT_ID}:user/atelier-ar-backend`
            }
          }
        }
      ]
    };

    const policyString = JSON.stringify(bucketPolicy, null, 2);
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: policyString
    }));
    console.log('   Bucket Policy successfully applied!');

    // Write back to docs/aws/bucket-policy.json
    fs.writeFileSync(path.join(__dirname, 'bucket-policy.json'), policyString);
    console.log('   Saved to docs/aws/bucket-policy.json');

    // 4. Apply S3 CORS Configuration
    console.log('\n4. Applying S3 CORS Configuration for 3D model-viewer...');
    const corsRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'cors.json'), 'utf8'));
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: corsRules
      }
    }));
    console.log('   S3 CORS configuration successfully applied!');

    console.log('\n======================================================');
    console.log('ALL AWS INFRASTRUCTURE AUTOMATION COMPLETE!');
    console.log('======================================================');
    console.log(`CloudFront Base URL: ${cloudFrontDomain}`);
    console.log(`Next Step: Set VITE_ASSET_BASE_URL=${cloudFrontDomain} in Cloudflare Pages and S3_PUBLIC_BASE_URL=${cloudFrontDomain} in Render.`);
  } catch (error) {
    console.error('\nFAILED TO COMPLETE SETUP:');
    console.error(`Error: [${error.name}] ${error.message}`);
    if (error.name === 'AccessDenied') {
      console.log('\n[NOTICE] IAM permission boundary detected.');
      console.log('To run this script automatically, attach "CloudFrontFullAccess" and "AmazonS3FullAccess"');
      console.log(`to IAM user "arn:aws:iam::${ACCOUNT_ID}:user/atelier-ar-backend" in the AWS IAM Console.`);
      console.log('Alternatively, perform the 3-minute manual setup in the AWS CloudFront Console.');
    }
    process.exit(1);
  }
}

main();
