import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateReportDto } from './create-report.dto';

const base = {
  cropType: 'Tomato',
  imageUrl: 'https://cdn/leaf.jpg',
  imagePublicId: 'crop-disease/reports/abc',
  latitude: 12.9,
  longitude: 77.5,
};

function build(extra: Record<string, unknown>) {
  const dto = plainToInstance(CreateReportDto, { ...base, ...extra });
  return validateSync(dto);
}

describe('CreateReportDto diagnosis fields', () => {
  it('accepts a full cloud diagnosis', () => {
    const errors = build({
      disease: 'Late Blight',
      confidence: 90,
      severity: 'HIGH',
      engine: 'cloud',
      advisory: { urgency: 'Act immediately' },
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts no diagnosis fields (backward compatible)', () => {
    expect(build({})).toHaveLength(0);
  });

  it('rejects an invalid engine value', () => {
    const errors = build({ engine: 'quantum' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects confidence out of range', () => {
    const errors = build({ confidence: 150 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid severity value', () => {
    const errors = build({ severity: 'CRITICAL' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-object advisory', () => {
    const errors = build({ advisory: 'not-an-object' });
    expect(errors.length).toBeGreaterThan(0);
  });
});
