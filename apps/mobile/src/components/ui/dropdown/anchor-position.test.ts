import {
  computeAnchorRect,
  estimateContentHeight,
  type AnchorInput,
} from './anchor-position';

const base: AnchorInput = {
  trigger: { x: 40, y: 100, width: 120, height: 40 },
  window: { width: 390, height: 844 },
  contentHeight: 200,
  align: 'start',
  maxPanelHeight: 320,
  triggerVariant: 'field',
};

describe('computeAnchorRect', () => {
  it('places the panel below the trigger when there is room', () => {
    const r = computeAnchorRect(base);
    expect(r.placement).toBe('below');
    expect(r.transformOrigin).toBe('top');
    // 100 + 40 + gap(6)
    expect(r.top).toBe(146);
    expect(r.height).toBe(200);
  });

  it('flips above when there is no room below but room above', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 700, width: 120, height: 40 },
    });
    expect(r.placement).toBe('above');
    expect(r.transformOrigin).toBe('bottom');
    // top = triggerY(700) - gap(6) - height(200)
    expect(r.top).toBe(494);
  });

  it('picks the larger side and clamps height when neither side fits', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 360, width: 120, height: 40 },
      contentHeight: 1000,
      maxPanelHeight: 1000,
      window: { width: 390, height: 700 },
    });
    // spaceBelow = 700 - 400 - 8 - 6 = 286; spaceAbove = 360 - 8 - 6 = 346 → above larger
    expect(r.placement).toBe('above');
    expect(r.height).toBe(346);
    expect(r.top).toBe(8); // 360 - 6 - 346 = 8 (sits at the screen margin)
  });

  it('aligns to the trigger left edge for align=start', () => {
    const r = computeAnchorRect(base);
    expect(r.left).toBe(40);
    // field width = max(triggerWidth 120, MIN_FIELD_WIDTH 180) = 180
    expect(r.width).toBe(180);
  });

  it('uses a minimum width of 180 for field/pill triggers', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 100, width: 90, height: 40 },
    });
    expect(r.width).toBe(180);
  });

  it('uses a fixed intrinsic width for icon triggers', () => {
    const r = computeAnchorRect({ ...base, triggerVariant: 'icon' });
    expect(r.width).toBe(220);
  });

  it('right-aligns the panel to the trigger right edge for align=end', () => {
    const r = computeAnchorRect({
      ...base,
      align: 'end',
      triggerVariant: 'icon',
      trigger: { x: 300, y: 100, width: 40, height: 40 },
    });
    // right edge = 340; left = 340 - 220 = 120
    expect(r.left).toBe(120);
  });

  it('clamps the panel within the left screen margin', () => {
    const r = computeAnchorRect({
      ...base,
      triggerVariant: 'icon',
      align: 'end',
      trigger: { x: 10, y: 100, width: 40, height: 40 },
    });
    // unclamped left = 50 - 220 = -170 → clamp to margin 8
    expect(r.left).toBe(8);
  });

  it('clamps the panel within the right screen margin', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 320, y: 100, width: 120, height: 40 },
    });
    // width = max(120,180)=180; unclamped left=320; max left = 390-8-180=202 → clamp 202
    expect(r.left).toBe(202);
  });
});

describe('estimateContentHeight', () => {
  it('sums padding + rows', () => {
    // pad 12 + 3 rows * 44
    expect(estimateContentHeight({ rowCount: 3, rowsWithDescription: 0, sectionHeaderCount: 0 })).toBe(144);
  });

  it('adds extra height for descriptions and section headers', () => {
    // 12 + 2*44 + 1*18 + 1*30 = 148
    expect(estimateContentHeight({ rowCount: 2, rowsWithDescription: 1, sectionHeaderCount: 1 })).toBe(148);
  });
});
