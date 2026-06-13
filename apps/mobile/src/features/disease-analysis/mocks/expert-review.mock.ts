import type {
  ExpertReview,
  ExpertReviewStatus,
  ExpertReviewer,
  Report,
} from '@/features/upload-report/types';

/**
 * DEMO-ONLY. There is no expert-review backend yet. This derives a plausible,
 * STABLE professional review from a report so the farmer-facing UI is always
 * populated. Determinism matters: the report detail screen refetches every 3s
 * while processing, and the card must not flicker or change between refetches —
 * so every choice is driven purely by a hash of `report.id`.
 */

/** FNV-1a 32-bit hash → unsigned int. Pure, stable for a given string. */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const EXPERTS: ExpertReviewer[] = [
  { name: 'Dr. Anil Kanade', credential: 'Agronomist, KVK Pune' },
  { name: 'Dr. Meera Joshi', credential: 'Plant Pathologist, MPKV Rahuri' },
  { name: 'Sunil Patil', credential: 'Extension Officer, Dept. of Agriculture' },
  { name: 'Dr. Rekha Naik', credential: 'Crop Scientist, ICAR' },
  { name: 'Vikram Deshmukh', credential: 'Senior Agronomist, KVK Nashik' },
];

/** Reports newer than this are still "awaiting" a reviewer. */
const PENDING_WINDOW_MS = 10 * 60 * 1000;

function pickStatus(hash: number): Exclude<ExpertReviewStatus, 'PENDING'> {
  const bucket = hash % 10;
  if (bucket <= 6) return 'APPROVED'; // 70%
  if (bucket <= 8) return 'NEEDS_REVISION'; // 20%
  return 'REJECTED'; // 10%
}

function buildNote(
  status: Exclude<ExpertReviewStatus, 'PENDING'>,
  report: Report,
): string {
  const disease = report.disease ?? 'the reported issue';
  const high = report.severity === 'HIGH';
  switch (status) {
    case 'APPROVED':
      return high
        ? `I've reviewed your photo and the AI diagnosis of ${disease} looks correct. This is a high-severity case — act quickly to stop it spreading to neighbouring plants.`
        : `I've reviewed your photo and agree with the AI diagnosis of ${disease}. It's at an early, manageable stage. Follow the steps below and monitor over the next few days.`;
    case 'NEEDS_REVISION':
      return `The symptoms are consistent with ${disease}, but the photo isn't fully conclusive. Please share a clearer close-up of an affected leaf (top and underside) so I can confirm before you start treatment.`;
    case 'REJECTED':
      return `I'm not able to confirm ${disease} from this image. The pattern looks more like a nutrient or watering issue. Hold off on spraying and check the recommendations below first.`;
  }
}

function buildTips(
  status: Exclude<ExpertReviewStatus, 'PENDING'>,
  report: Report,
): string[] {
  const high = report.severity === 'HIGH';
  switch (status) {
    case 'APPROVED':
      return high
        ? [
            'Remove and destroy badly affected plants today to limit spread.',
            'Apply the recommended fungicide early morning or late evening.',
            'Isolate this plot — avoid moving tools or water runoff to healthy fields.',
            'Re-photograph and report again in 3 days to track the response.',
          ]
        : [
            'Remove visibly affected leaves and dispose of them away from the field.',
            'Improve airflow — avoid overhead watering that keeps foliage wet.',
            'Apply the suggested treatment at the labelled dose; do not over-spray.',
            'Recheck the plot after 4–5 days.',
          ];
    case 'NEEDS_REVISION':
      return [
        'Take a sharp close-up of one affected leaf, both sides, in daylight.',
        'Include a wider shot showing how many plants are affected.',
        'Note when symptoms first appeared and recent weather.',
        'Avoid spraying until the diagnosis is confirmed.',
      ];
    case 'REJECTED':
      return [
        'Check soil moisture — both waterlogging and drought can mimic disease.',
        'Inspect for nutrient deficiency (yellowing patterns, leaf margins).',
        'Submit a fresh report if symptoms worsen or spread.',
      ];
  }
}

/**
 * Returns a stable mock expert review for a report. Same `report.id` always
 * yields the same review. Reports created within the last ~10 minutes are
 * returned as PENDING (no reviewer assigned yet).
 */
export function getExpertReview(report: Report): ExpertReview {
  const hash = hashString(report.id);
  const expert = EXPERTS[hash % EXPERTS.length] as ExpertReviewer;

  const ageMs = Date.now() - new Date(report.createdAt).getTime();
  if (ageMs < PENDING_WINDOW_MS) {
    return {
      status: 'PENDING',
      expert,
      adviceNote: '',
      tips: [],
      reviewedAt: null,
    };
  }

  const status = pickStatus(hash);
  // Reviewed 5–125 minutes ago, derived from the hash so it stays stable.
  const reviewedMinsAgo = 5 + (hash % 120);
  return {
    status,
    expert,
    adviceNote: buildNote(status, report),
    tips: buildTips(status, report),
    reviewedAt: new Date(Date.now() - reviewedMinsAgo * 60_000).toISOString(),
  };
}
