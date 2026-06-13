import { Text, View } from '@/tw';

type Tone = 'neutral' | 'danger';

interface SheetStatCardProps {
  value: string;
  label: string;
  tone?: Tone;
}

const TONES: Record<Tone, { bg: string; border: string; value: string; label: string }> = {
  neutral: { bg: '#f6f4ee', border: '#ece6d9', value: '#23291f', label: '#8a8472' },
  danger: { bg: '#fee2e2', border: '#fee2e2', value: '#b91c1c', label: '#b91c1c' },
};

/** Rounded tonal stat card: big number + uppercase caption. Tint conveys status. */
export function SheetStatCard({ value, label, tone = 'neutral' }: SheetStatCardProps) {
  const t = TONES[tone];
  return (
    <View
      style={{
        flex: 1,
        minWidth: 90,
        borderRadius: 16,
        padding: 12,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', lineHeight: 26, color: t.value }}>{value}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: t.label,
          marginTop: 5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
