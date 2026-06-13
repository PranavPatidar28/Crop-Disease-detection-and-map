import type { Report, Severity } from '@/features/upload-report/types';

export type SeverityFilter = 'all' | Severity;
export type StatusFilter = 'all' | 'analyzed' | 'processing' | 'failed';

export interface ReportFilter {
  search: string;
  severity: SeverityFilter;
  status: StatusFilter;
}

export const DEFAULT_REPORT_FILTER: ReportFilter = {
  search: '',
  severity: 'all',
  status: 'all',
};

/** Same title resolution as ReportHistoryCard. */
function reportTitle(report: Report): string {
  return report.advisory?.primaryDiagnosis.displayName ?? report.disease ?? '';
}

function matchesStatus(report: Report, status: StatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'analyzed':
      return report.processingStatus === 'SUCCESS';
    case 'processing':
      return (
        report.processingStatus === 'PENDING' ||
        report.processingStatus === 'PROCESSING'
      );
    case 'failed':
      return report.processingStatus === 'FAILED';
  }
}

/**
 * Client-side filter over already-loaded reports. Search matches crop type and
 * disease/title (case-insensitive); severity and status narrow the list.
 */
export function filterReports(reports: Report[], filter: ReportFilter): Report[] {
  const q = filter.search.trim().toLowerCase();
  return reports.filter((report) => {
    if (q) {
      const haystack = `${report.cropType} ${reportTitle(report)}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter.severity !== 'all' && report.severity !== filter.severity) return false;
    if (!matchesStatus(report, filter.status)) return false;
    return true;
  });
}
