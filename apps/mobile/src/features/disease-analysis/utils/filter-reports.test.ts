import type { Report, Severity } from '@/features/upload-report/types';

import { filterReports, type ReportFilter } from './filter-reports';

function makeReport(overrides: Partial<Report>): Report {
  return {
    id: 'x',
    userId: 'u1',
    cropType: 'Tomato',
    imageUrl: '',
    imagePublicId: '',
    notes: null,
    latitude: 0,
    longitude: 0,
    disease: 'Early blight',
    confidence: 0.9,
    severity: 'HIGH' as Severity,
    recommendations: [],
    advisory: null,
    processingStatus: 'SUCCESS',
    aiError: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const ALL: ReportFilter = { search: '', severity: 'all', status: 'all' };

describe('filterReports', () => {
  const tomato = makeReport({ id: 'a', cropType: 'Tomato', disease: 'Early blight', severity: 'HIGH' });
  const potato = makeReport({ id: 'b', cropType: 'Potato', disease: 'Late blight', severity: 'LOW', processingStatus: 'SUCCESS' });
  const pending = makeReport({ id: 'c', cropType: 'Wheat', disease: null, severity: null, processingStatus: 'PENDING' });
  const list = [tomato, potato, pending];

  it('returns all reports for the default filter', () => {
    expect(filterReports(list, ALL).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('matches search against crop type (case-insensitive)', () => {
    expect(filterReports(list, { ...ALL, search: 'pot' }).map((r) => r.id)).toEqual(['b']);
  });

  it('matches search against disease/title', () => {
    expect(filterReports(list, { ...ALL, search: 'early' }).map((r) => r.id)).toEqual(['a']);
  });

  it('filters by severity', () => {
    expect(filterReports(list, { ...ALL, severity: 'LOW' }).map((r) => r.id)).toEqual(['b']);
  });

  it('filters by status (processing groups PENDING + PROCESSING)', () => {
    expect(filterReports(list, { ...ALL, status: 'processing' }).map((r) => r.id)).toEqual(['c']);
  });

  it('combines search + severity', () => {
    expect(filterReports(list, { ...ALL, search: 'blight', severity: 'HIGH' }).map((r) => r.id)).toEqual(['a']);
  });
});
