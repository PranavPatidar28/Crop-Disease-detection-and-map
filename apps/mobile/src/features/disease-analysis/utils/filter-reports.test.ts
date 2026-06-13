import type { Report, ReportAdvisory, Severity } from '@/features/upload-report/types';

import { filterReports, type ReportFilter } from './filter-reports';

function makeAdvisory(displayName: string): ReportAdvisory {
  return {
    cropName: 'Tomato',
    primaryDiagnosis: {
      label: 'tomato_mosaic_virus',
      crop: 'Tomato',
      disease: 'Mosaic Virus',
      displayName,
      isHealthy: false,
      confidence: 92,
      confidenceBadge: 'High',
    },
    top3Predictions: [],
    possibleOtherDiseases: [],
    severity: {
      level: 'HIGH',
      confidence: 90,
      decision: 'auto',
      basis: 'model',
    },
    urgency: 'high',
    symptomsToConfirm: [],
    whatToDoNow: [],
    preventionTips: [],
    whenToCallExpert: 'soon',
    retakeImageGuidance: null,
    rag: {
      status: 'ok',
      source: 'kb',
      summary: '',
      symptomsToCheck: [],
      immediateActions: [],
      precautions: [],
      prevention: [],
      similarDiseases: [],
      expertAdvice: '',
      safetyNote: '',
    },
  };
}

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

  it('status processing includes both PENDING and PROCESSING reports', () => {
    const processingReport = makeReport({ id: 'd', cropType: 'Rice', disease: null, severity: null, processingStatus: 'PROCESSING' });
    expect(filterReports([...list, processingReport], { ...ALL, status: 'processing' }).map((r) => r.id)).toEqual(['c', 'd']);
  });

  it('filters by status analyzed (SUCCESS)', () => {
    expect(filterReports(list, { ...ALL, status: 'analyzed' }).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('filters by status failed (FAILED)', () => {
    const failedReport = makeReport({ id: 'e', cropType: 'Corn', disease: null, severity: null, processingStatus: 'FAILED' });
    expect(filterReports([...list, failedReport], { ...ALL, status: 'failed' }).map((r) => r.id)).toEqual(['e']);
  });

  it('searches against advisory primaryDiagnosis.displayName before disease fallback', () => {
    const advisoryReport = makeReport({
      id: 'f',
      cropType: 'Tomato',
      disease: 'Something else',
      advisory: makeAdvisory('Tomato Mosaic Virus'),
    });
    expect(filterReports([...list, advisoryReport], { ...ALL, search: 'mosaic' }).map((r) => r.id)).toEqual(['f']);
  });

  it('treats whitespace-only search as empty (no filtering)', () => {
    expect(filterReports(list, { ...ALL, search: '   ' }).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
