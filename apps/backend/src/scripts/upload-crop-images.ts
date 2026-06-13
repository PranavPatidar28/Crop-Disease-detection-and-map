/**
 * One-time uploader: pushes every image under /crop-images to Cloudinary and
 * writes two committed files the demo seed + mobile mock consume:
 *
 *   - src/scripts/data/crop-image-manifest.json   (full crop→disease→[urls])
 *   - apps/mobile/.../mocks/crop-image-urls.json  (curated subset for the mock)
 *
 * Run manually with Cloudinary creds in env:
 *   pnpm --filter backend upload:crop-images
 *
 * Deterministic public_ids mean re-runs overwrite rather than duplicate.
 */

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { v2 as cloudinary } from 'cloudinary';

import { logger } from '../common/utils/logger';

const CROP_IMAGES_DIR = join(__dirname, '../../../../crop-images');
const MANIFEST_PATH = join(__dirname, 'data', 'crop-image-manifest.json');
const MOBILE_URLS_PATH = join(
  __dirname,
  '../../../mobile/src/features/dashboard/mocks/crop-image-urls.json',
);
const FOLDER = 'crop-disease/demo-seed';

// Crop/disease pairs surfaced by the mobile mock. Keys are "<crop>/<disease>".
const MOBILE_KEYS = [
  'soyabean/yellow_mosaic',
  'wheat/stripe_rust',
  'tomato/late_blight',
  'maize/common_rust',
  'cotton/curl_virus',
  'chilli/bacterial_spot',
  'soyabean/healthy',
  'wheat/healthy',
];

interface ManifestImage {
  url: string;
  publicId: string;
}
type Manifest = Record<string, Record<string, ManifestImage[]>>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    logger.error(`Missing required env var: ${name}. Set Cloudinary creds and retry.`);
    process.exit(1);
  }
  return value;
}

function isImage(file: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(file);
}

async function run(): Promise<void> {
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  if (!existsSync(CROP_IMAGES_DIR)) {
    logger.error(`crop-images directory not found at ${CROP_IMAGES_DIR}`);
    process.exit(1);
  }

  const manifest: Manifest = {};
  let uploaded = 0;
  let failed = 0;

  for (const crop of readdirSync(CROP_IMAGES_DIR)) {
    const cropPath = join(CROP_IMAGES_DIR, crop);
    if (!statSync(cropPath).isDirectory()) continue;
    manifest[crop] = {};

    for (const disease of readdirSync(cropPath)) {
      const diseasePath = join(cropPath, disease);
      if (!statSync(diseasePath).isDirectory()) continue;

      const images: ManifestImage[] = [];
      const files = readdirSync(diseasePath).filter(isImage).sort();

      for (let i = 0; i < files.length; i += 1) {
        const filePath = join(diseasePath, files[i]!);
        const publicId = `${FOLDER}/${crop}/${disease}-${i}`;
        try {
          const res = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
          });
          images.push({ url: res.secure_url, publicId: res.public_id });
          uploaded += 1;
        } catch (err) {
          failed += 1;
          logger.warn(`Upload failed for ${filePath}: ${(err as Error).message}`);
        }
      }

      manifest[crop]![disease] = images;
    }
  }

  // Guard: never overwrite the committed manifests with empty data when a
  // transient outage made every upload fail.
  if (uploaded === 0 && failed > 0) {
    logger.error('All uploads failed — leaving committed manifests untouched.');
    process.exit(1);
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  logger.info(`Wrote manifest → ${MANIFEST_PATH}`);

  // Curated mobile subset: first image of each MOBILE_KEYS pair.
  const mobileUrls: Record<string, string> = {};
  for (const key of MOBILE_KEYS) {
    const [crop, disease] = key.split('/');
    const first = manifest[crop!]?.[disease!]?.[0];
    if (first) mobileUrls[key] = first.url;
    else logger.warn(`No uploaded image for mobile key "${key}" — left out of url map`);
  }
  if (!existsSync(dirname(MOBILE_URLS_PATH))) {
    logger.warn(`Mobile mocks dir missing; skipping ${MOBILE_URLS_PATH}`);
  } else {
    writeFileSync(MOBILE_URLS_PATH, `${JSON.stringify(mobileUrls, null, 2)}\n`, 'utf8');
    logger.info(`Wrote mobile url map → ${MOBILE_URLS_PATH}`);
  }

  if (failed > 0) {
    process.exitCode = 1;
    logger.warn(`⚠ Upload finished with errors: ${uploaded} uploaded, ${failed} failed.`);
  } else {
    logger.info(`✅ Upload complete: ${uploaded} uploaded, ${failed} failed.`);
  }
}

run().catch((err) => {
  logger.error('Upload script failed', err);
  process.exitCode = 1;
});
