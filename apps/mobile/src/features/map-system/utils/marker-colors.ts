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
 * Builds a stacked-circle radial-gradient approximation for an outbreak zone.
 * Densest/smallest at the core, faint/largest at the boundary. HIGH severity
 * gets a denser core than MEDIUM/LOW.
 *
 * Only 3 layers (down from 6): on a real map each translucent Circle composites
 * over the ones beneath it, so 3 well-spaced layers already read as a smooth
 * glow while keeping the per-zone overlay count low. The `opacity` here is the
 * PER-LAYER alpha; the visible core is the composite of all three.
 */
export function zoneGlowSteps(severity: Severity | null | undefined): ZoneGlowStep[] {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  // Per-layer core alpha. Composite core ≈ 0.40 (HIGH) → still translucent.
  const core = norm === 'HIGH' ? 0.2 : norm === 'MEDIUM' ? 0.16 : 0.12;
  // boundary (faint, full radius) → mid → core (dense, small)
  return [
    { radiusFactor: 1.0, opacity: Number((core * 0.55).toFixed(3)) },
    { radiusFactor: 0.62, opacity: Number((core * 0.8).toFixed(3)) },
    { radiusFactor: 0.32, opacity: Number(core.toFixed(3)) },
  ];
}
