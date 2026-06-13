import { severityVisuals, timeAgo } from './severity';

describe('severityVisuals', () => {
  it('maps uppercase backend severities', () => {
    expect(severityVisuals('HIGH').label).toBe('High');
    expect(severityVisuals('MEDIUM').label).toBe('Medium');
    expect(severityVisuals('LOW').label).toBe('Low');
  });

  it('maps lowercase mock severities (case-insensitive)', () => {
    expect(severityVisuals('high' as never).label).toBe('High');
    expect(severityVisuals('medium' as never).label).toBe('Medium');
  });

  it('defaults null / undefined to Low', () => {
    expect(severityVisuals(null).label).toBe('Low');
    expect(severityVisuals(undefined).label).toBe('Low');
  });

  it('returns distinct colors per severity', () => {
    const high = severityVisuals('HIGH').rawColor;
    const medium = severityVisuals('MEDIUM').rawColor;
    const low = severityVisuals('LOW').rawColor;
    expect(new Set([high, medium, low]).size).toBe(3);
  });

  it('returns matching tailwind classes for HIGH', () => {
    const v = severityVisuals('HIGH');
    expect(v.textClass).toContain('danger');
    expect(v.bgClass).toContain('danger');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-06-10T12:00:00.000Z').getTime();

  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(now));
  afterEach(() => jest.restoreAllMocks());

  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it('shows "just now" for < 30 seconds (rounds to 0 minutes)', () => {
    expect(timeAgo(at(20_000))).toBe('just now');
  });

  it('shows minutes for < 1 hour', () => {
    expect(timeAgo(at(5 * 60_000))).toBe('5m ago');
  });

  it('shows hours for < 1 day', () => {
    expect(timeAgo(at(3 * 60 * 60_000))).toBe('3h ago');
  });

  it('shows days beyond 24 hours', () => {
    expect(timeAgo(at(2 * 24 * 60 * 60_000))).toBe('2d ago');
  });
});
