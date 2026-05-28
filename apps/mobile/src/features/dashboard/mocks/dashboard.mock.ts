import type {
  Alert,
  DashboardData,
  Outbreak,
  Report,
  Trend,
} from '../types';

const cropImage = (seed: string): string =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`;

const minutesAgo = (mins: number): string =>
  new Date(Date.now() - mins * 60_000).toISOString();

export const mockOutbreaks: Outbreak[] = [
  {
    id: 'out-1',
    disease: 'Late Blight',
    cropType: 'Tomato',
    affectedVillages: 12,
    severity: 'high',
    district: 'Pune',
    trendPercent: 24,
  },
  {
    id: 'out-2',
    disease: 'Leaf Spot',
    cropType: 'Rice',
    affectedVillages: 7,
    severity: 'medium',
    district: 'Nashik',
    trendPercent: 11,
  },
  {
    id: 'out-3',
    disease: 'Powdery Mildew',
    cropType: 'Grape',
    affectedVillages: 4,
    severity: 'low',
    district: 'Sangli',
    trendPercent: -3,
  },
];

export const mockReports: Report[] = [
  {
    id: 'rep-1',
    crop: 'Tomato',
    disease: 'Late Blight',
    severity: 'high',
    imageUrl: cropImage('tomato-blight'),
    status: 'flagged',
    createdAt: minutesAgo(120),
    district: 'Pune',
  },
  {
    id: 'rep-2',
    crop: 'Rice',
    disease: 'Leaf Spot',
    severity: 'medium',
    imageUrl: cropImage('rice-leaf-spot'),
    status: 'reviewed',
    createdAt: minutesAgo(280),
    district: 'Nashik',
  },
  {
    id: 'rep-3',
    crop: 'Wheat',
    disease: 'Rust',
    severity: 'medium',
    imageUrl: cropImage('wheat-rust'),
    status: 'pending',
    createdAt: minutesAgo(540),
    district: 'Aurangabad',
  },
  {
    id: 'rep-4',
    crop: 'Grape',
    disease: 'Powdery Mildew',
    severity: 'low',
    imageUrl: cropImage('grape-mildew'),
    status: 'reviewed',
    createdAt: minutesAgo(900),
    district: 'Sangli',
  },
  {
    id: 'rep-5',
    crop: 'Cotton',
    disease: 'Bollworm',
    severity: 'high',
    imageUrl: cropImage('cotton-bollworm'),
    status: 'flagged',
    createdAt: minutesAgo(1320),
    district: 'Yavatmal',
  },
];

export const mockTrends: Trend[] = [
  { id: 'tr-1', disease: 'Late Blight', deltaPercent: 18, history: [3, 4, 4, 5, 6, 7, 8] },
  { id: 'tr-2', disease: 'Leaf Spot', deltaPercent: -4, history: [6, 6, 5, 5, 4, 5, 4] },
  { id: 'tr-3', disease: 'Rust', deltaPercent: 6, history: [2, 3, 3, 4, 4, 5, 5] },
  { id: 'tr-4', disease: 'Powdery Mildew', deltaPercent: 0, history: [3, 3, 3, 3, 3, 3, 3] },
];

export const mockAlerts: Alert[] = [
  {
    id: 'al-1',
    title: 'Tomato Late Blight outbreak nearby',
    description: '12 villages flagged in your district. Immediate field check recommended.',
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
    title: 'Powdery mildew trending down',
    description: 'Fewer reports vs last week in your region. Keep monitoring.',
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
