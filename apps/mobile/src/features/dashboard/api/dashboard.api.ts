import { outbreakApi } from '@/features/outbreak-system/api/outbreak.api';
import { reportsApi } from '@/features/upload-report/api/reports.api';
import type { Report as BackendReport } from '@/features/upload-report/types';
import { sleep } from '@/utils/formatters';

import { mockDashboard } from '../mocks/dashboard.mock';
import type { DashboardData, Report as DashboardReport, Severity } from '../types';

/**
 * Dashboard service. As of v7:
 *   - `recentReports` reads real reports from the backend (`scope=mine`).
 *   - `summary.activeOutbreaks` and `summary.highSeverityZones` read real
 *     `OutbreakZone` rows from `/outbreaks?active=true`.
 *   - Trends and alerts remain mocked — they need their own aggregation
 *     endpoints which land in v8+.
 *
 * Falls back to mock seed data on any failure so the dashboard never breaks.
 */
export const dashboardApi = {
  async fetchDashboard(): Promise<DashboardData> {
    await sleep(400); // shimmer-friendly minimum

    let recentReports: DashboardReport[] = mockDashboard.recentReports;
    let summary = { ...mockDashboard.summary };

    try {
      const response = await reportsApi.list({ scope: 'mine', limit: 5 });
      const real = response.items
        .filter((r) => r.processingStatus === 'SUCCESS' && r.disease)
        .map(toDashboardReport);
      if (real.length > 0) recentReports = real;
    } catch {
      // ignore — mocks stay
    }

    try {
      const zones = await outbreakApi.list({ active: true, limit: 200 });
      if (zones.length > 0) {
        summary = {
          ...summary,
          activeOutbreaks: zones.length,
          highSeverityZones: zones.filter((z) => z.severity === 'HIGH').length,
        };
      }
    } catch {
      // ignore — mocks stay
    }

    return { ...mockDashboard, summary, recentReports };
  },
};

function toDashboardReport(r: BackendReport): DashboardReport {
  return {
    id: r.id,
    crop: r.cropType,
    disease: r.disease ?? 'Unknown',
    severity: severityToLower(r.severity),
    imageUrl: r.imageUrl,
    status: 'reviewed',
    createdAt: r.createdAt,
    district: '—',
  };
}

function severityToLower(severity: BackendReport['severity']): Severity {
  switch (severity) {
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    default:
      return 'low';
  }
}
