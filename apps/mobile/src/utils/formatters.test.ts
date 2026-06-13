import { formatDate, sleep } from './formatters';

describe('sleep', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves after the given delay', async () => {
    const spy = jest.fn();
    const promise = sleep(1000).then(spy);
    expect(spy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    await promise;
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('formatDate', () => {
  it('accepts a Date and returns a non-empty string', () => {
    const out = formatDate(new Date('2026-06-10T12:00:00.000Z'));
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('accepts an ISO string', () => {
    const out = formatDate('2026-06-10T12:00:00.000Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});
