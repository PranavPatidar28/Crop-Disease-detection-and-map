import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ListNotificationsQueryDto } from './list-notifications-query.dto';

function transform(query: Record<string, unknown>): ListNotificationsQueryDto {
  return plainToInstance(ListNotificationsQueryDto, query, {
    enableImplicitConversion: false,
  });
}

describe('ListNotificationsQueryDto', () => {
  it('defaults limit to 30 and leaves unreadOnly undefined', () => {
    const dto = transform({});
    expect(dto.limit).toBe(30);
    expect(dto.unreadOnly).toBeUndefined();
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('parses unreadOnly="true" as true', () => {
    expect(transform({ unreadOnly: 'true' }).unreadOnly).toBe(true);
  });

  // Regression: @Type(() => Boolean) ran Boolean("false") === true, silently
  // forcing unread-only filtering against the caller's intent.
  it('parses unreadOnly="false" as false (not the coercion trap)', () => {
    const dto = transform({ unreadOnly: 'false' });
    expect(dto.unreadOnly).toBe(false);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('coerces limit and rejects out-of-range values', () => {
    expect(transform({ limit: '15' }).limit).toBe(15);
    expect(validateSync(transform({ limit: '0' })).length).toBeGreaterThan(0);
    expect(validateSync(transform({ limit: '101' })).length).toBeGreaterThan(0);
  });

  it('rejects an invalid notification type', () => {
    expect(validateSync(transform({ type: 'BOGUS' })).length).toBeGreaterThan(0);
  });
});
