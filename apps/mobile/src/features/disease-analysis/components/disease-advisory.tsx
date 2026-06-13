import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Leaf,
  ListChecks,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react-native';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { ReportAdvisory } from '@/features/upload-report/types';

/** Map the model urgency string to a chip tone. */
function urgencyTone(urgency: string): 'success' | 'warning' | 'danger' | 'info' {
  const u = urgency.toLowerCase();
  if (u.includes('immediately')) return 'danger';
  if (u.includes('soon')) return 'warning';
  if (u.includes('retake')) return 'info';
  return 'success'; // Monitor / default
}

/** Map a High/Medium/Low confidence badge to a chip tone. */
function badgeTone(badge: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (badge.toLowerCase()) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'danger';
    default:
      return 'neutral';
  }
}

interface DiseaseAdvisoryProps {
  advisory: ReportAdvisory;
}

/**
 * Renders the rich farmer-facing advisory returned by the AI RAG pipeline:
 * urgency, summary, symptoms to confirm, step-by-step actions, prevention,
 * alternative diagnoses, expert guidance, and any retake-image prompt.
 *
 * Each section renders only when it has content, so partial payloads degrade
 * gracefully.
 */
export function DiseaseAdvisory({ advisory }: DiseaseAdvisoryProps) {
  const {
    urgency,
    severity,
    symptomsToConfirm,
    whatToDoNow,
    preventionTips,
    possibleOtherDiseases,
    whenToCallExpert,
    retakeImageGuidance,
    rag,
  } = advisory;

  // Prefer the richer RAG lists when present, falling back to the slim fields.
  const actions = whatToDoNow.length ? whatToDoNow : rag.immediateActions;
  const symptoms = symptomsToConfirm.length ? symptomsToConfirm : rag.symptomsToCheck;
  const prevention = preventionTips.length ? preventionTips : rag.prevention;

  return (
    <View className="gap-4">
      {/* Urgency + retake prompt */}
      {(urgency || retakeImageGuidance) && (
        <Card padding="md">
          <View className="flex-row items-center justify-between">
            <SectionLabel>Urgency</SectionLabel>
            {urgency ? (
              <Chip
                label={urgency}
                tone={urgencyTone(urgency)}
                leftSlot={<Clock size={12} color={chipIconColor(urgencyTone(urgency))} strokeWidth={2.4} />}
              />
            ) : null}
          </View>
          {severity?.basis ? (
            <Text className="mt-2 text-sm leading-5 text-text-muted">{severity.basis}</Text>
          ) : null}
          {retakeImageGuidance ? (
            <View className="mt-3 flex-row items-start gap-2.5 rounded-2xl bg-info-tint p-3">
              <RefreshCw size={16} color={palette.status.info} strokeWidth={2.2} />
              <Text className="flex-1 text-sm leading-5 text-text">{retakeImageGuidance}</Text>
            </View>
          ) : null}
        </Card>
      )}

      {/* RAG summary */}
      {rag.summary ? (
        <AdvisorySection
          icon={<Stethoscope size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="What this means"
        >
          <Text className="text-sm leading-5 text-text">{rag.summary}</Text>
        </AdvisorySection>
      ) : null}

      {/* Symptoms to confirm */}
      {symptoms.length ? (
        <AdvisorySection
          icon={<Search size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="Symptoms to confirm"
        >
          <BulletList items={symptoms} />
        </AdvisorySection>
      ) : null}

      {/* What to do now */}
      {actions.length ? (
        <AdvisorySection
          icon={<ListChecks size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="What to do now"
          glow
        >
          <NumberedList items={actions} />
        </AdvisorySection>
      ) : null}

      {/* Precautions */}
      {rag.precautions.length ? (
        <AdvisorySection
          icon={<ShieldCheck size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="Precautions"
        >
          <BulletList items={rag.precautions} />
        </AdvisorySection>
      ) : null}

      {/* Prevention */}
      {prevention.length ? (
        <AdvisorySection
          icon={<Leaf size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="Prevention"
        >
          <BulletList items={prevention} />
        </AdvisorySection>
      ) : null}

      {/* Possible other diseases */}
      {possibleOtherDiseases.length ? (
        <AdvisorySection
          icon={<AlertTriangle size={16} color={palette.status.warning} strokeWidth={2.2} />}
          title="Possible other diseases"
        >
          <Text className="mb-2 text-xs leading-4 text-text-subtle">
            Alternatives to rule out — not the primary diagnosis.
          </Text>
          <View className="gap-2">
            {possibleOtherDiseases.map((p) => (
              <View
                key={`${p.rank}-${p.label}`}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2.5"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                    {p.disease || p.label}
                  </Text>
                  {p.crop ? (
                    <Text className="text-[11px] text-text-subtle">{p.crop}</Text>
                  ) : null}
                </View>
                <View className="items-end gap-1">
                  <Text className="text-xs font-bold text-text-muted">{p.confidence}%</Text>
                  {p.confidenceBadge ? (
                    <Chip label={p.confidenceBadge} tone={badgeTone(p.confidenceBadge)} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </AdvisorySection>
      ) : null}

      {/* When to call expert */}
      {(whenToCallExpert || rag.expertAdvice) && (
        <AdvisorySection
          icon={<Phone size={16} color={palette.brand[700]} strokeWidth={2.2} />}
          title="When to call an expert"
        >
          {whenToCallExpert ? (
            <Text className="text-sm leading-5 text-text">{whenToCallExpert}</Text>
          ) : null}
          {rag.expertAdvice ? (
            <Text className="mt-1 text-sm leading-5 text-text-muted">{rag.expertAdvice}</Text>
          ) : null}
        </AdvisorySection>
      )}

      {/* Safety note */}
      {rag.safetyNote ? (
        <View className="flex-row items-start gap-2.5 rounded-2xl bg-warning-tint p-3">
          <AlertTriangle size={16} color={palette.status.warning} strokeWidth={2.2} />
          <Text className="flex-1 text-xs leading-5 text-text">{rag.safetyNote}</Text>
        </View>
      ) : null}

      {/* Provenance */}
      {rag.source ? (
        <View className="flex-row items-center gap-1.5 px-1">
          <CalendarClock size={11} color={palette.brand[700]} strokeWidth={2.2} />
          <Text className="text-[11px] text-text-subtle">Advisory source: {rag.source}</Text>
        </View>
      ) : null}
    </View>
  );
}

function chipIconColor(tone: 'success' | 'warning' | 'danger' | 'info'): string {
  switch (tone) {
    case 'success':
      return palette.status.success;
    case 'warning':
      return palette.status.warning;
    case 'danger':
      return palette.status.danger;
    case 'info':
      return palette.status.info;
  }
}

function AdvisorySection({
  icon,
  title,
  glow = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  glow?: boolean;
  children: ReactNode;
}) {
  return (
    <Card variant={glow ? 'glow' : 'flat'} padding="md">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-base font-bold tracking-tight text-text">{title}</Text>
      </View>
      <View className="mt-2.5">{children}</View>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View className="gap-2">
      {items.map((item, i) => (
        <View key={`${i}-${item.slice(0, 24)}`} className="flex-row items-start gap-2.5">
          <View className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
          <Text className="flex-1 text-sm leading-5 text-text">{item}</Text>
        </View>
      ))}
    </View>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <View className="gap-2">
      {items.map((item, i) => (
        <View key={`${i}-${item.slice(0, 24)}`} className="flex-row items-start gap-2.5">
          <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-success-tint">
            <Text className="text-[10px] font-bold text-success">{i + 1}</Text>
          </View>
          <Text className="flex-1 text-sm leading-5 text-text">{item}</Text>
        </View>
      ))}
    </View>
  );
}
