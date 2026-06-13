import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react-native';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { lightColors, palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { ExpertReview, ExpertReviewStatus } from '@/features/upload-report/types';
import { timeAgo } from '@/utils/severity';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

interface StatusVisual {
  label: string;
  tone: Tone;
}

const STATUS_VISUALS: Record<Exclude<ExpertReviewStatus, 'PENDING'>, StatusVisual> = {
  APPROVED: { label: 'Approved', tone: 'success' },
  NEEDS_REVISION: { label: 'Needs revision', tone: 'warning' },
  REJECTED: { label: 'Not confirmed', tone: 'danger' },
};

function StatusIcon({ status }: { status: Exclude<ExpertReviewStatus, 'PENDING'> }) {
  const size = 16;
  const strokeWidth = 2.2;
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 size={size} color={palette.status.success} strokeWidth={strokeWidth} />;
    case 'NEEDS_REVISION':
      return <ShieldAlert size={size} color={palette.status.warning} strokeWidth={strokeWidth} />;
    case 'REJECTED':
      return <XCircle size={size} color={palette.status.danger} strokeWidth={strokeWidth} />;
  }
}

/**
 * Farmer-facing professional review of a report. Demo-only data (see
 * expert-review.mock.ts). Two states: awaiting review (PENDING) and reviewed.
 */
export function ExpertReviewCard({ review }: { review: ExpertReview }) {
  if (review.status === 'PENDING') {
    return (
      <Card variant="glow" padding="md">
        <View className="flex-row items-center justify-between">
          <SectionLabel>Expert review</SectionLabel>
          <Chip
            label="Awaiting review"
            tone="neutral"
            leftSlot={<Clock size={12} color={lightColors.textMuted} strokeWidth={2.4} />}
          />
        </View>
        <View className="mt-3 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <Clock size={18} color={palette.brand[600]} strokeWidth={2.2} />
          </View>
          <Text className="flex-1 text-sm leading-5 text-text-muted">
            An agronomist will review your report shortly.
          </Text>
        </View>
      </Card>
    );
  }

  const visual = STATUS_VISUALS[review.status];

  return (
    <Card variant="glow" padding="md">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Expert review</SectionLabel>
        <Chip
          label={visual.label}
          tone={visual.tone}
          leftSlot={<StatusIcon status={review.status} />}
        />
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <Avatar name={review.expert.name} size="md" verified={review.status === 'APPROVED'} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-text">{review.expert.name}</Text>
          <Text className="text-xs text-text-subtle">{review.expert.credential}</Text>
        </View>
      </View>

      {review.adviceNote ? (
        <Text className="mt-3 text-sm leading-5 text-text">{review.adviceNote}</Text>
      ) : null}

      {review.tips.length > 0 ? (
        <View className="mt-4 gap-2">
          <SectionLabel>Expert tips</SectionLabel>
          <View className="mt-1 gap-2">
            {review.tips.map((tip, i) => (
              <View key={`${i}-${tip.slice(0, 20)}`} className="flex-row items-start gap-2.5">
                <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-success-tint">
                  <Text className="text-[10px] font-bold text-success">{i + 1}</Text>
                </View>
                <Text className="flex-1 text-sm leading-5 text-text">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {review.reviewedAt ? (
        <Text className="mt-3 text-[11px] text-text-subtle">
          Reviewed {timeAgo(review.reviewedAt)}
        </Text>
      ) : null}
    </Card>
  );
}
