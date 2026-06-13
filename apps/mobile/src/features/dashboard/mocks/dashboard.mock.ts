import type {
  Alert,
  DashboardData,
  Outbreak,
  Report,
  Trend,
} from '../types';
import cropImageUrls from './crop-image-urls.json';

/**
 * Offline fallback data for the dashboard. Images use real Cloudinary URLs
 * (written by the backend `upload:crop-images` script into crop-image-urls.json)
 * keyed by "<crop>/<disease>". Falls back to picsum if a key is missing so the
 * dashboard never breaks. Geography matches the Bhopal-region demo seed.
 */

const urls = cropImageUrls as Record<string, string>;

const cropImage = (key: string): string =>
  urls[key] ??
  `https://picsum.photos/seed/${encodeURIComponent(key.replace('/', '-'))}/640/480`;

const minutesAgo = (mins: number): string =>
  new Date(Date.now() - mins * 60_000).toISOString();

export const mockOutbreaks: Outbreak[] = [
  {
    id: 'out-1',
    disease: 'Yellow Mosaic Virus',
    cropType: 'Soybean',
    affectedVillages: 8,
    severity: 'high',
    district: 'Sehore',
    trendPercent: 24,
  },
  {
    id: 'out-2',
    disease: 'Stripe Rust',
    cropType: 'Wheat',
    affectedVillages: 6,
    severity: 'medium',
    district: 'Vidisha',
    trendPercent: 11,
  },
  {
    id: 'out-3',
    disease: 'Late Blight',
    cropType: 'Tomato',
    affectedVillages: 5,
    severity: 'low',
    district: 'Bhopal',
    trendPercent: -3,
  },
];

export const mockReports: Report[] = [
  {
    id: 'rep-1',
    crop: 'Soybean',
    disease: 'Yellow Mosaic Virus',
    severity: 'high',
    imageUrl: cropImage('soyabean/yellow_mosaic'),
    status: 'flagged',
    createdAt: minutesAgo(120),
    district: 'Sehore',
  },
  {
    id: 'rep-2',
    crop: 'Wheat',
    disease: 'Stripe Rust',
    severity: 'medium',
    imageUrl: cropImage('wheat/stripe_rust'),
    status: 'reviewed',
    createdAt: minutesAgo(280),
    district: 'Vidisha',
  },
  {
    id: 'rep-3',
    crop: 'Tomato',
    disease: 'Late Blight',
    severity: 'high',
    imageUrl: cropImage('tomato/late_blight'),
    status: 'flagged',
    createdAt: minutesAgo(540),
    district: 'Bhopal',
  },
  {
    id: 'rep-4',
    crop: 'Maize',
    disease: 'Common Rust',
    severity: 'medium',
    imageUrl: cropImage('maize/common_rust'),
    status: 'reviewed',
    createdAt: minutesAgo(900),
    district: 'Raisen',
  },
  {
    id: 'rep-5',
    crop: 'Cotton',
    disease: 'Leaf Curl Virus',
    severity: 'high',
    imageUrl: cropImage('cotton/curl_virus'),
    status: 'pending',
    createdAt: minutesAgo(1320),
    district: 'Rajgarh',
  },
  {
    id: 'rep-6',
    crop: 'Chilli',
    disease: 'Bacterial Leaf Spot',
    severity: 'medium',
    imageUrl: cropImage('chilli/bacterial_spot'),
    status: 'reviewed',
    createdAt: minutesAgo(1600),
    district: 'Berasia',
  },
];

export const mockTrends: Trend[] = [
  { id: 'tr-1', disease: 'Yellow Mosaic Virus', deltaPercent: 18, history: [3, 4, 4, 5, 6, 7, 8] },
  { id: 'tr-2', disease: 'Stripe Rust', deltaPercent: -4, history: [6, 6, 5, 5, 4, 5, 4] },
  { id: 'tr-3', disease: 'Late Blight', deltaPercent: 6, history: [2, 3, 3, 4, 4, 5, 5] },
  { id: 'tr-4', disease: 'Common Rust', deltaPercent: 0, history: [3, 3, 3, 3, 3, 3, 3] },
];

export const mockAlerts: Alert[] = [
  {
    id: 'al-1',
    title: 'Soybean Yellow Mosaic outbreak nearby',
    description: '8 villages flagged near Sehore. Immediate field check recommended.',
    severity: 'high',
    unread: true,
    createdAt: minutesAgo(35),
  },
  {
    id: 'al-2',
    title: 'New report verified',
    description: 'A nearby report was reviewed by the district officer.',
    severity: 'medium',
    unread: true,
    createdAt: minutesAgo(180),
  },
  {
    id: 'al-3',
    title: 'Weather advisory',
    description: 'High humidity expected — fungal risk elevated for the next 48h.',
    severity: 'low',
    unread: false,
    createdAt: minutesAgo(420),
  },
  {
    id: 'al-4',
    title: 'Wheat stripe rust trending down',
    description: 'Fewer reports vs last week near Vidisha. Keep monitoring.',
    severity: 'low',
    unread: false,
    createdAt: minutesAgo(720),
  },
];

export const mockDashboard: DashboardData = {
  summary: {
    activeOutbreaks: mockOutbreaks.length + 2,
    highSeverityZones: mockOutbreaks.filter((o) => o.severity === 'high').length + 1,
    reportsThisWeek: 47,
  },
  outbreaks: mockOutbreaks,
  recentReports: mockReports,
  trends: mockTrends,
  alerts: mockAlerts,
};
