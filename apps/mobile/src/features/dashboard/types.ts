export type Severity = 'low' | 'medium' | 'high';

export interface Report {
  id: string;
  crop: string;
  disease: string;
  severity: Severity;
  imageUrl: string;
  status: 'reviewed' | 'pending' | 'flagged';
  createdAt: string; // ISO
  district: string;
}

export interface Outbreak {
  id: string;
  disease: string;
  cropType: string;
  affectedVillages: number;
  severity: Severity;
  district: string;
  trendPercent: number; // positive = increase
}

export interface Trend {
  id: string;
  disease: string;
  deltaPercent: number; // positive = increase, negative = decrease
  history: number[]; // last 7 days, normalized
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  unread: boolean;
  createdAt: string; // ISO
}

export interface DashboardSummary {
  activeOutbreaks: number;
  highSeverityZones: number;
  reportsThisWeek: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  outbreaks: Outbreak[];
  recentReports: Report[];
  trends: Trend[];
  alerts: Alert[];
}
