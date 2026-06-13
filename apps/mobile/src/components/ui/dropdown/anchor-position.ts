/**
 * Pure popover positioning math for <Dropdown>. NO react-native imports — this
 * file must stay runtime-free so it is unit-testable under the repo's
 * babel-jest (node) config, which only matches *.test.ts.
 */

export type Placement = 'below' | 'above';
export type Align = 'start' | 'end';
export type TriggerVariant = 'field' | 'pill' | 'icon';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorInput {
  /** Trigger position in window coordinates (from measureInWindow). */
  trigger: { x: number; y: number; width: number; height: number };
  window: { width: number; height: number };
  /** Estimated content height of the panel (see estimateContentHeight). */
  contentHeight: number;
  align: Align;
  maxPanelHeight: number;
  triggerVariant: TriggerVariant;
  /** Screen edge margin. Default 8. */
  margin?: number;
  /** Gap between trigger and panel. Default 6. */
  gap?: number;
}

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: Placement;
  transformOrigin: 'top' | 'bottom';
}

const MIN_FIELD_WIDTH = 180;
const ICON_PANEL_WIDTH = 220;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeAnchorRect(input: AnchorInput): AnchorRect {
  const { trigger, window, align, maxPanelHeight, triggerVariant } = input;
  const margin = input.margin ?? 8;
  const gap = input.gap ?? 6;

  // Width
  let width =
    triggerVariant === 'icon'
      ? ICON_PANEL_WIDTH
      : Math.max(trigger.width, MIN_FIELD_WIDTH);
  width = Math.min(width, window.width - margin * 2);

  // Vertical placement
  const desired = Math.min(input.contentHeight, maxPanelHeight);
  const spaceBelow = window.height - (trigger.y + trigger.height) - margin - gap;
  const spaceAbove = trigger.y - margin - gap;

  let placement: Placement;
  let height: number;
  let top: number;

  if (desired <= spaceBelow) {
    placement = 'below';
    height = desired;
    top = trigger.y + trigger.height + gap;
  } else if (desired <= spaceAbove) {
    placement = 'above';
    height = desired;
    top = trigger.y - gap - height;
  } else if (spaceBelow >= spaceAbove) {
    placement = 'below';
    height = Math.max(0, spaceBelow);
    top = trigger.y + trigger.height + gap;
  } else {
    placement = 'above';
    height = Math.max(0, spaceAbove);
    top = trigger.y - gap - height;
  }

  // Horizontal placement
  let left = align === 'end' ? trigger.x + trigger.width - width : trigger.x;
  left = clamp(left, margin, window.width - margin - width);

  return {
    top,
    left,
    width,
    height,
    placement,
    transformOrigin: placement === 'below' ? 'top' : 'bottom',
  };
}

export interface ContentEstimate {
  rowCount: number;
  rowsWithDescription: number;
  sectionHeaderCount: number;
}

const PANEL_VPAD = 12;
const ROW_HEIGHT = 44;
const DESCRIPTION_EXTRA = 18;
const SECTION_HEADER = 30;

/** Deterministic height estimate so placement avoids a two-pass layout flicker. */
export function estimateContentHeight(e: ContentEstimate): number {
  return (
    PANEL_VPAD +
    e.rowCount * ROW_HEIGHT +
    e.rowsWithDescription * DESCRIPTION_EXTRA +
    e.sectionHeaderCount * SECTION_HEADER
  );
}
