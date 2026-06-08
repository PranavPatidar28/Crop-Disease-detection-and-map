import type { Severity } from '@/features/upload-report/types';

/**
 * Map-tuned severity fills. Slightly more saturated than the global status
 * tokens so markers stay legible on the light map background. Single source for
 * report markers, outbreak hub markers, and badges.
 */
const SEVERITY_FILL: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#047857',
  MEDIUM: '#d97706',
  HIGH: '#dc2626',
};

export function mapSeverityFill(severity: Severity | null | undefined): string {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  if (norm === 'HIGH') return SEVERITY_FILL.HIGH;
  if (norm === 'MEDIUM') return SEVERITY_FILL.MEDIUM;
  return SEVERITY_FILL.LOW;
}

/** A single concentric ring in the zone glow. */
export interface ZoneGlowStep {
  /** Radius as a fraction (0-1) of the zone's outer radius. */
  radiusFactor: number;
  /** Fill opacity 0-1. */
  opacity: number;
}

/**
 * Builds the stacked-circle radial-gradient approximation for an outbreak zone.
 * Densest/smallest at the core, faint/largest at the boundary. HIGH severity
 * gets a denser core than MEDIUM/LOW. Enough steps that banding is invisible.
 */
export function zoneGlowSteps(severity: Severity | null | undefined): ZoneGlowStep[] {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  const peak = norm === 'HIGH' ? 0.26 : norm === 'MEDIUM' ? 0.2 : 0.16;
  // 6 steps from outer (factor 1.0) to core (factor ~0.18).
  const factors = [1.0, 0.84, 0.66, 0.5, 0.34, 0.18];
  const maxIdx = factors.length - 1;
  return factors.map((radiusFactor, i) => ({
    radiusFactor,
    // opacity rises from a faint floor at the edge to `peak` at the core
    opacity: Number((0.05 + (peak - 0.05) * (i / maxIdx)).toFixed(3)),
  }));
}
