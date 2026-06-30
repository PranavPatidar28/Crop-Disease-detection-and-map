import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ListOutbreaksQueryDto } from './list-outbreaks-query.dto';

function transform(query: Record<string, unknown>): ListOutbreaksQueryDto {
  return plainToInstance(ListOutbreaksQueryDto, query, {
    enableImplicitConversion: false,
  });
}

describe('ListOutbreaksQueryDto', () => {
  it('defaults active to true and limit to 200', () => {
    const dto = transform({});
    expect(dto.active).toBe(true);
    expect(dto.limit).toBe(200);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('parses active="true" as true', () => {
    const dto = transform({ active: 'true' });
    expect(dto.active).toBe(true);
  });

  // Regression: @Type(() => Boolean) ran Boolean("false") === true, so resolved
  // (inactive) zones could never be queried. The @Transform must yield false.
  it('parses active="false" as false (not the coercion trap)', () => {
    const dto = transform({ active: 'false' });
    expect(dto.active).toBe(false);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('coerces limit and rejects out-of-range values', () => {
    expect(transform({ limit: '50' }).limit).toBe(50);
    expect(validateSync(transform({ limit: '0' })).length).toBeGreaterThan(0);
    expect(validateSync(transform({ limit: '999' })).length).toBeGreaterThan(0);
  });

  it('rejects an invalid severity', () => {
    const dto = transform({ severity: 'EXTREME' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
