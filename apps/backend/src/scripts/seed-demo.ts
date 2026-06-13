/**
 * Demo seed — produces a visually impactful initial state for hackathon demos,
 * centered on Bhopal, Madhya Pradesh.
 *
 * Images come from the committed Cloudinary manifest written by
 * `upload-crop-images.ts`. Disease names + recommendations come from
 * `crop-disease-catalog.ts`. If the manifest is missing (upload not run), the
 * seed falls back to deterministic picsum URLs so it never hard-fails.
 *
 * Behaviour:
 *   - Idempotent: reports keyed by (userId, clientId); plots deduped by name.
 *   - Creates 7 demo users across Bhopal-region towns.
 *   - 3 dense clusters trigger outbreak zones (HIGH Sehore soybean, MEDIUM
 *     Vidisha wheat, LOW/MEDIUM Bhopal tomato); other crops are scattered.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { PrismaClient, ProcessingStatus, Severity } from '@prisma/client';

import { logger } from '../common/utils/logger';
import {
  CatalogSeverity,
  getCatalogEntry,
} from './data/crop-disease-catalog';

const prisma = new PrismaClient();

// --- Image manifest (written by upload-crop-images.ts) ---
interface ManifestImage {
  url: string;
  publicId: string;
}
type Manifest = Record<string, Record<string, ManifestImage[]>>;

const MANIFEST_PATH = join(__dirname, 'data', 'crop-image-manifest.json');

function loadManifest(): Manifest {
  try {
    if (!existsSync(MANIFEST_PATH)) return {};
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  } catch (err) {
    logger.warn(`Could not read manifest: ${(err as Error).message}`);
    return {};
  }
}

const manifest = loadManifest();

/** Returns a real Cloudinary image for a crop/disease folder, or a picsum fallback. */
function imageFor(
  cropFolder: string,
  diseaseFolder: string,
  index: number,
): { imageUrl: string; imagePublicId: string } {
  const images = manifest[cropFolder]?.[diseaseFolder] ?? [];
  if (images.length > 0) {
    const img = images[index % images.length]!;
    return { imageUrl: img.url, imagePublicId: img.publicId };
  }
  const seed = `${cropFolder}-${diseaseFolder}-${index}`;
  return {
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`,
    imagePublicId: `seed-fallback-${seed}`,
  };
}

const SEVERITY_MAP: Record<CatalogSeverity, Severity> = {
  LOW: Severity.LOW,
  MEDIUM: Severity.MEDIUM,
  HIGH: Severity.HIGH,
};

// --- Bhopal region anchors (lat/lng) ---
const BHOPAL = { lat: 23.2599, lng: 77.4126 };
const SEHORE = { lat: 23.202, lng: 77.0857 };
const VIDISHA = { lat: 23.5251, lng: 77.8061 };
const RAISEN = { lat: 23.3306, lng: 77.7859 };
const HOSHANGABAD = { lat: 22.754, lng: 77.73 };
const RAJGARH = { lat: 24.009, lng: 76.73 };
const BERASIA = { lat: 23.63, lng: 77.43 };

function jitter(center: number, radiusKm: number): number {
  const offDeg = (Math.random() - 0.5) * 2 * (radiusKm / 110);
  return center + offDeg;
}

// Display name → folder key, so we can look up catalog + manifest by folder.
interface SeedReport {
  cropType: string; // display crop, e.g. "Soybean"
  cropFolder: string; // /crop-images folder, e.g. "soyabean"
  diseaseFolder: string; // /crop-images disease folder, e.g. "yellow_mosaic"
  severity: Severity;
  confidence: number;
  latitude: number;
  longitude: number;
  ageHours: number;
}

function entryOrThrow(cropFolder: string, diseaseFolder: string) {
  const entry = getCatalogEntry(cropFolder, diseaseFolder);
  if (!entry) {
    throw new Error(`No catalog entry for ${cropFolder}/${diseaseFolder}`);
  }
  return entry;
}

function buildReports(): SeedReport[] {
  const reports: SeedReport[] = [];

  // --- Cluster 1: 8 Soybean Yellow Mosaic in Sehore (HIGH) ---
  for (let i = 0; i < 8; i += 1) {
    reports.push({
      cropType: 'Soybean',
      cropFolder: 'soyabean',
      diseaseFolder: 'yellow_mosaic',
      severity: i < 6 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 84 + Math.floor(Math.random() * 12),
      latitude: jitter(SEHORE.lat, 1.8),
      longitude: jitter(SEHORE.lng, 1.8),
      ageHours: Math.floor(Math.random() * 18),
    });
  }

  // --- Cluster 2: 6 Wheat Stripe Rust in Vidisha (MEDIUM) ---
  for (let i = 0; i < 6; i += 1) {
    reports.push({
      cropType: 'Wheat',
      cropFolder: 'wheat',
      diseaseFolder: 'stripe_rust',
      severity: i < 2 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 78 + Math.floor(Math.random() * 12),
      latitude: jitter(VIDISHA.lat, 1.5),
      longitude: jitter(VIDISHA.lng, 1.5),
      ageHours: Math.floor(Math.random() * 16),
    });
  }

  // --- Cluster 3: 5 Tomato Late Blight near Bhopal (LOW/MEDIUM) ---
  for (let i = 0; i < 5; i += 1) {
    reports.push({
      cropType: 'Tomato',
      cropFolder: 'tomato',
      diseaseFolder: 'late_blight',
      severity: i === 0 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 80 + Math.floor(Math.random() * 12),
      latitude: jitter(BHOPAL.lat, 2.0),
      longitude: jitter(BHOPAL.lng, 2.0),
      ageHours: Math.floor(Math.random() * 20),
    });
  }

  // --- Scattered singletons/pairs (variety, no outbreak) ---
  const scattered: Array<{
    cropType: string;
    cropFolder: string;
    diseaseFolder: string;
    anchor: { lat: number; lng: number };
  }> = [
    { cropType: 'Maize', cropFolder: 'maize', diseaseFolder: 'common_rust', anchor: RAISEN },
    { cropType: 'Maize', cropFolder: 'maize', diseaseFolder: 'blight', anchor: HOSHANGABAD },
    { cropType: 'Cotton', cropFolder: 'cotton', diseaseFolder: 'curl_virus', anchor: RAJGARH },
    { cropType: 'Cotton', cropFolder: 'cotton', diseaseFolder: 'bacterial_blight', anchor: RAJGARH },
    { cropType: 'Chilli', cropFolder: 'chilli', diseaseFolder: 'bacterial_spot', anchor: BERASIA },
    { cropType: 'Sugarcane', cropFolder: 'sugarcane', diseaseFolder: 'redrot', anchor: HOSHANGABAD },
    { cropType: 'Rice', cropFolder: 'rice', diseaseFolder: 'blast', anchor: HOSHANGABAD },
    { cropType: 'Sorghum', cropFolder: 'sorghum', diseaseFolder: 'rust', anchor: RAJGARH },
    { cropType: 'Brinjal', cropFolder: 'brinjal', diseaseFolder: 'cercospora_leaf_spot', anchor: BERASIA },
    { cropType: 'Cauliflower', cropFolder: 'cauliflower', diseaseFolder: 'downy_mildew', anchor: BERASIA },
    { cropType: 'Cabbage', cropFolder: 'cabbage', diseaseFolder: 'black_rot', anchor: BERASIA },
    { cropType: 'Groundnut', cropFolder: 'groundnut', diseaseFolder: 'diseased_leaf', anchor: RAJGARH },
    { cropType: 'Sunflower', cropFolder: 'sunflower', diseaseFolder: 'downy_mildew', anchor: RAISEN },
    { cropType: 'Blackgram', cropFolder: 'blackgram', diseaseFolder: 'anthracnose', anchor: RAISEN },
  ];
  for (const s of scattered) {
    const entry = entryOrThrow(s.cropFolder, s.diseaseFolder);
    reports.push({
      cropType: s.cropType,
      cropFolder: s.cropFolder,
      diseaseFolder: s.diseaseFolder,
      severity: SEVERITY_MAP[entry.defaultSeverity],
      confidence: 74 + Math.floor(Math.random() * 16),
      latitude: jitter(s.anchor.lat, 3),
      longitude: jitter(s.anchor.lng, 3),
      ageHours: Math.floor(Math.random() * 24),
    });
  }

  // --- 3 Healthy reports (green branch). Each crop MUST have a `healthy`
  // folder on disk / catalog entry (soybean/rice/sorghum do not). ---
  const healthy: Array<{ cropType: string; cropFolder: string }> = [
    { cropType: 'Maize', cropFolder: 'maize' },
    { cropType: 'Wheat', cropFolder: 'wheat' },
    { cropType: 'Sugarcane', cropFolder: 'sugarcane' },
  ];
  for (const h of healthy) {
    reports.push({
      cropType: h.cropType,
      cropFolder: h.cropFolder,
      diseaseFolder: 'healthy',
      severity: Severity.LOW,
      confidence: 91,
      latitude: jitter(BHOPAL.lat, 5),
      longitude: jitter(BHOPAL.lng, 5),
      ageHours: Math.floor(Math.random() * 6),
    });
  }

  return reports;
}

const NOTIFICATION_TEMPLATES = [
  {
    type: 'OUTBREAK' as const,
    title: '⚠️ Severe outbreak nearby',
    body: 'Soybean Yellow Mosaic Virus detected near Sehore · 8 reports.',
    severity: Severity.HIGH,
    ageMinutes: 35,
  },
  {
    type: 'WARNING' as const,
    title: 'Outbreak escalated',
    body: 'Soybean Yellow Mosaic Virus outbreak escalated from medium to high severity.',
    severity: Severity.HIGH,
    ageMinutes: 90,
  },
  {
    type: 'REPORT' as const,
    title: 'High-severity report nearby',
    body: 'A Soybean Yellow Mosaic Virus report was filed near your plot.',
    severity: Severity.HIGH,
    ageMinutes: 180,
  },
  {
    type: 'OUTBREAK' as const,
    title: 'Disease outbreak nearby',
    body: 'Wheat Stripe Rust detected near Vidisha · 6 reports.',
    severity: Severity.MEDIUM,
    ageMinutes: 360,
  },
  {
    type: 'SYSTEM' as const,
    title: 'Welcome to AgroRadar',
    body: 'Add a plot to start receiving outbreak alerts in your area.',
    severity: null,
    ageMinutes: 1440,
  },
];

interface SeedUser {
  phone: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
}

const SEED_USERS: SeedUser[] = [
  { phone: '9999999999', name: 'Mahesh Verma', district: 'Bhopal', lat: BHOPAL.lat, lng: BHOPAL.lng },
  { phone: '8888888888', name: 'Sunita Rajput', district: 'Sehore', lat: SEHORE.lat, lng: SEHORE.lng },
  { phone: '7777777777', name: 'Ramesh Patidar', district: 'Vidisha', lat: VIDISHA.lat, lng: VIDISHA.lng },
  { phone: '7766554433', name: 'Lakhan Yadav', district: 'Raisen', lat: RAISEN.lat, lng: RAISEN.lng },
  { phone: '7755443322', name: 'Geeta Lodhi', district: 'Hoshangabad', lat: HOSHANGABAD.lat, lng: HOSHANGABAD.lng },
  { phone: '7744332211', name: 'Devilal Meena', district: 'Rajgarh', lat: RAJGARH.lat, lng: RAJGARH.lng },
  { phone: '7733221100', name: 'Kailash Dangi', district: 'Berasia', lat: BERASIA.lat, lng: BERASIA.lng },
];

async function seed(): Promise<void> {
  logger.info('▶ Starting demo seed (Bhopal region)…');

  const users = [];
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      create: {
        phone: u.phone,
        name: u.name,
        district: u.district,
        state: 'Madhya Pradesh',
        latitude: u.lat,
        longitude: u.lng,
      },
      update: {
        name: u.name,
        district: u.district,
        state: 'Madhya Pradesh',
        latitude: u.lat,
        longitude: u.lng,
      },
    });
    users.push(user);
  }
  const userA = users[0]!; // Mahesh Verma — primary demo login
  logger.info(`✓ ${users.length} users ready`);

  // Plots near each cluster, owned by relevant users. Idempotent on (userId, name).
  const plots = [
    { userId: userA.id, name: 'Bhopal Kolar Soybean', latitude: BHOPAL.lat - 0.05, longitude: BHOPAL.lng - 0.02, cropTypes: ['Soybean'] },
    { userId: userA.id, name: 'Bhopal Berasia Wheat', latitude: BHOPAL.lat + 0.18, longitude: BHOPAL.lng + 0.06, cropTypes: ['Wheat'] },
    { userId: users[1]!.id, name: 'Sehore Soybean Field', latitude: SEHORE.lat + 0.01, longitude: SEHORE.lng - 0.005, cropTypes: ['Soybean'] },
    { userId: users[2]!.id, name: 'Vidisha Wheat Field', latitude: VIDISHA.lat - 0.01, longitude: VIDISHA.lng + 0.01, cropTypes: ['Wheat'] },
  ];
  for (const p of plots) {
    const existing = await prisma.plot.findFirst({ where: { userId: p.userId, name: p.name } });
    if (existing) {
      await prisma.plot.update({ where: { id: existing.id }, data: { ...p, active: true } });
    } else {
      await prisma.plot.create({ data: p });
    }
  }
  logger.info(`✓ ${plots.length} plots seeded`);

  // Reports — keyed by clientId for idempotency; attributed round-robin.
  const reports = buildReports();
  let created = 0;
  let updated = 0;
  for (let i = 0; i < reports.length; i += 1) {
    const r = reports[i]!;
    const entry = entryOrThrow(r.cropFolder, r.diseaseFolder);
    const owner = users[i % users.length]!;
    const clientId = `seed:report:${i}`;
    const createdAt = new Date(Date.now() - r.ageHours * 60 * 60 * 1000);
    const { imageUrl, imagePublicId } = imageFor(r.cropFolder, r.diseaseFolder, i);
    const data = {
      userId: owner.id,
      clientId,
      cropType: r.cropType,
      imageUrl,
      imagePublicId,
      latitude: r.latitude,
      longitude: r.longitude,
      notes: null,
      disease: entry.displayName,
      confidence: r.confidence,
      severity: r.severity,
      recommendations: entry.recommendations,
      processingStatus: ProcessingStatus.SUCCESS,
      processedAt: new Date(createdAt.getTime() + 4_000),
      createdAt,
    };
    const existing = await prisma.report.findUnique({
      where: { userId_clientId: { userId: owner.id, clientId } },
    });
    if (existing) {
      await prisma.report.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.report.create({ data });
      created += 1;
    }
  }
  logger.info(`✓ Reports: ${created} created, ${updated} updated`);

  // Notifications for the primary user. Idempotent: clear all of this user's
  // notifications and re-insert so re-running never accumulates duplicates.
  await prisma.notification.deleteMany({
    where: { userId: userA.id },
  });
  for (let i = 0; i < NOTIFICATION_TEMPLATES.length; i += 1) {
    const t = NOTIFICATION_TEMPLATES[i]!;
    await prisma.notification.create({
      data: {
        userId: userA.id,
        type: t.type,
        title: t.title,
        body: t.body,
        severity: t.severity,
        read: i < 2,
        readAt: i < 2 ? new Date() : null,
        data: {},
        createdAt: new Date(Date.now() - t.ageMinutes * 60 * 1000),
      },
    });
  }
  logger.info(`✓ ${NOTIFICATION_TEMPLATES.length} notifications seeded for primary user`);

  // Outbreak zones — built from contributing cluster reports.
  const zoneSpecs = [
    {
      disease: 'Yellow Mosaic Virus',
      anchor: SEHORE,
      radius: 5000,
      severity: Severity.HIGH,
      crops: ['Soybean'],
      reports: reports.filter(
        (r) => r.cropFolder === 'soyabean' && r.diseaseFolder === 'yellow_mosaic',
      ),
    },
    {
      disease: 'Stripe Rust (Yellow Rust)',
      anchor: VIDISHA,
      radius: 4500,
      severity: Severity.MEDIUM,
      crops: ['Wheat'],
      reports: reports.filter(
        (r) => r.cropFolder === 'wheat' && r.diseaseFolder === 'stripe_rust',
      ),
    },
    {
      disease: 'Late Blight',
      anchor: BHOPAL,
      radius: 4000,
      severity: Severity.LOW,
      crops: ['Tomato'],
      reports: reports.filter(
        (r) => r.cropFolder === 'tomato' && r.diseaseFolder === 'late_blight',
      ),
    },
  ];

  await prisma.outbreakZone.deleteMany({
    where: { disease: { in: zoneSpecs.map((z) => z.disease) } },
  });

  for (const z of zoneSpecs) {
    await prisma.outbreakZone.create({
      data: {
        disease: z.disease,
        latitude: z.anchor.lat,
        longitude: z.anchor.lng,
        radius: z.radius,
        reportCount: z.reports.length,
        highCount: z.reports.filter((r) => r.severity === Severity.HIGH).length,
        severity: z.severity,
        affectedCropTypes: z.crops,
        active: true,
        lastSeenAt: new Date(),
      },
    });
  }
  logger.info('✓ 3 outbreak zones seeded (HIGH Sehore, MEDIUM Vidisha, LOW Bhopal)');

  logger.info('✅ Demo seed complete.');
}

seed()
  .catch((err) => {
    logger.error('Demo seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
