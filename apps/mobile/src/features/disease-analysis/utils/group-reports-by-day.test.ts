import type { Report } from '@/features/upload-report/types';
import { groupReportsByDay } from './group-reports-by-day';

function makeReport(id: string, isoDate: string): Report {
  return {
    id,
    userId: 'u1',
    cropType: 'Tomato',
    imageUrl: '',
    imagePublicId: '',
    notes: null,
    latitude: 0,
    longitude: 0,
    disease: null,
    confidence: null,
    severity: null,
    recommendations: [],
    advisory: null,
    processingStatus: 'SUCCESS',
    aiError: null,
    processedAt: isoDate,
    createdAt: isoDate,
    updatedAt: isoDate,
  };
}

describe('groupReportsByDay', () => {
  it('buckets reports into today / earlier and drops empty buckets', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const groups = groupReportsByDay([
      makeReport('a', now.toISOString()),
      makeReport('b', old.toISOString()),
    ]);
    expect(groups.map((g) => g.bucket)).toEqual(['today', 'earlier']);
    expect(groups[0].items.map((r) => r.id)).toEqual(['a']);
    expect(groups[1].items.map((r) => r.id)).toEqual(['b']);
  });

  it('falls back to createdAt when processedAt is null', () => {
    const now = new Date().toISOString();
    const r = { ...makeReport('c', now), processedAt: null };
    const groups = groupReportsByDay([r]);
    expect(groups[0].bucket).toBe('today');
  });

  it('returns [] for an empty list', () => {
    expect(groupReportsByDay([])).toEqual([]);
  });
});
