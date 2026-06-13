import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreatePlotDto, UpdatePlotDto } from './plot.dto';

function makeCreate(overrides: Record<string, unknown> = {}): CreatePlotDto {
  return plainToInstance(CreatePlotDto, {
    name: 'North Field',
    latitude: 18.52,
    longitude: 73.85,
    ...overrides,
  });
}

describe('CreatePlotDto', () => {
  it('accepts a valid plot', () => {
    expect(validateSync(makeCreate())).toHaveLength(0);
  });

  it('accepts an optional cropTypes array within bounds', () => {
    expect(validateSync(makeCreate({ cropTypes: ['Tomato', 'Potato'] }))).toHaveLength(0);
  });

  it('rejects a missing name', () => {
    expect(validateSync(makeCreate({ name: '' })).length).toBeGreaterThan(0);
  });

  it('rejects an over-long name (>60)', () => {
    expect(validateSync(makeCreate({ name: 'x'.repeat(61) })).length).toBeGreaterThan(0);
  });

  it('rejects an invalid latitude/longitude', () => {
    expect(validateSync(makeCreate({ latitude: 200 })).length).toBeGreaterThan(0);
    expect(validateSync(makeCreate({ longitude: -200 })).length).toBeGreaterThan(0);
  });

  // Regression: cropTypes was unbounded — oversized arrays could be persisted.
  it('rejects more than 20 cropTypes', () => {
    const cropTypes = Array.from({ length: 21 }, (_, i) => `crop-${i}`);
    expect(validateSync(makeCreate({ cropTypes })).length).toBeGreaterThan(0);
  });

  it('rejects an individual cropType longer than 40 chars', () => {
    expect(validateSync(makeCreate({ cropTypes: ['x'.repeat(41)] })).length).toBeGreaterThan(0);
  });

  // Regression: areaAcres was @IsNumber() only — negative / absurd values passed.
  it('rejects a negative areaAcres', () => {
    expect(validateSync(makeCreate({ areaAcres: -1 })).length).toBeGreaterThan(0);
  });

  it('rejects an absurdly large areaAcres', () => {
    expect(validateSync(makeCreate({ areaAcres: 1_000_000 })).length).toBeGreaterThan(0);
  });

  it('accepts a sane areaAcres', () => {
    expect(validateSync(makeCreate({ areaAcres: 12.5 }))).toHaveLength(0);
  });
});

describe('UpdatePlotDto', () => {
  it('accepts an empty patch (all optional)', () => {
    expect(validateSync(plainToInstance(UpdatePlotDto, {}))).toHaveLength(0);
  });

  it('accepts a boolean active flag', () => {
    expect(validateSync(plainToInstance(UpdatePlotDto, { active: true }))).toHaveLength(0);
  });

  it('enforces the same cropTypes bound', () => {
    const cropTypes = Array.from({ length: 21 }, (_, i) => `crop-${i}`);
    expect(validateSync(plainToInstance(UpdatePlotDto, { cropTypes })).length).toBeGreaterThan(0);
  });
});
