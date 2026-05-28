import { Button } from '@/components/ui/button';

interface GradientButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** @deprecated Use <Button variant="gradient" /> directly. Kept for diff continuity. */
export function GradientButton({ label, loading, disabled, onPress }: GradientButtonProps) {
  return (
    <Button
      label={label}
      variant="gradient"
      size="lg"
      loading={loading}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
