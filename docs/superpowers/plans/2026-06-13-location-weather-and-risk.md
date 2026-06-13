# Location-Based Weather & Disease Risk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add location-based real weather (Open-Meteo) to AgroRadar — displayed on the dashboard and per-plot — and drive crop/disease-aware risk advisories delivered through the existing notification stack.

**Architecture:** A new backend `weather` module proxies Open-Meteo with short-TTL in-memory caching and exposes display + risk endpoints; the mobile app consumes provider-agnostic shapes. A crop/disease-aware rule engine turns the forecast into per-plot risk, and a cron fans HIGH-risk transitions through the existing `NotificationsService.createForUsers`.

**Tech Stack:** NestJS 10, Prisma 5, Zod env, class-validator DTOs, `@nestjs/schedule` cron, axios; Expo SDK 56, Expo Router, TanStack Query, NativeWind v5, lucide-react-native.

**Spec:** `docs/superpowers/specs/2026-06-13-location-weather-and-risk-design.md`

**Phasing:** Tasks 1–10 = Phase 1 (display). Tasks 11–19 = Phase 2 (risk + alerts). Phase 1 is independently shippable.

---

## Phase 1 — Weather Display

### Task 1: Add weather env vars + tests

**Files:**
- Modify: `apps/backend/src/config/env.schema.ts`
- Test: `apps/backend/src/config/env.schema.spec.ts`

- [ ] **Step 1: Add the failing test**

In `apps/backend/src/config/env.schema.spec.ts`, inside the `describe('numeric coercion', ...)` block (after the `applies outbreak threshold defaults` test), add:

```typescript
    it('applies weather defaults', () => {
      const env = validateEnv({ ...base });
      expect(env.WEATHER_PROVIDER).toBe('openmeteo');
      expect(env.OPENMETEO_BASE_URL).toBe('https://api.open-meteo.com');
      expect(env.WEATHER_CACHE_CURRENT_MINUTES).toBe(15);
      expect(env.WEATHER_CACHE_FORECAST_MINUTES).toBe(60);
      expect(env.WEATHER_RISK_CRON).toBe('0 */6 * * *');
      expect(env.WEATHER_RISK_ENABLED).toBe(true);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/config/env.schema.spec.ts -t "weather defaults"`
Expected: FAIL — `env.WEATHER_PROVIDER` is `undefined`.

- [ ] **Step 3: Add the env fields**

In `apps/backend/src/config/env.schema.ts`, add inside the `z.object({ ... })` (after the Notifications block, before `DEMO_MODE`):

```typescript
  // Weather (Open-Meteo). No API key required.
  WEATHER_PROVIDER: z.enum(['openmeteo']).default('openmeteo'),
  OPENMETEO_BASE_URL: z.string().url().default('https://api.open-meteo.com'),
  WEATHER_CACHE_CURRENT_MINUTES: z.coerce.number().min(1).default(15),
  WEATHER_CACHE_FORECAST_MINUTES: z.coerce.number().min(1).default(60),
  /** Cron expression for the per-plot risk sweep. Default: every 6 hours. */
  WEATHER_RISK_CRON: z.string().default('0 */6 * * *'),
  WEATHER_RISK_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec jest src/config/env.schema.spec.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/config/env.schema.ts apps/backend/src/config/env.schema.spec.ts
git commit -m "feat(backend): add weather env config"
```

---

### Task 2: Weather DTOs + normalized types

**Files:**
- Create: `apps/backend/src/modules/weather/dto/weather-query.dto.ts`
- Create: `apps/backend/src/modules/weather/weather.types.ts`

- [ ] **Step 1: Create the query DTO**

Create `apps/backend/src/modules/weather/dto/weather-query.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class WeatherQueryDto {
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  lng!: number;
}
```

- [ ] **Step 2: Create the normalized types**

Create `apps/backend/src/modules/weather/weather.types.ts`:

```typescript
export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'fog'
  | 'snow';

export interface WeatherCurrent {
  tempC: number;
  humidity: number; // %
  precipitationMm: number;
  precipProbability: number; // %
  windKph: number;
  weatherCode: number; // WMO code
  condition: WeatherCondition;
  isDay: boolean;
  observedAt: string; // ISO
}

export interface WeatherDaily {
  date: string; // ISO date (yyyy-mm-dd)
  tMinC: number;
  tMaxC: number;
  precipitationMm: number;
  precipProbability: number;
  humidityMean: number;
  weatherCode: number;
  condition: WeatherCondition;
}

export interface WeatherHourly {
  time: string; // ISO
  tempC: number;
  humidity: number;
  precipitationMm: number;
  precipProbability: number;
  weatherCode: number;
}

export interface WeatherSnapshot {
  location: { lat: number; lng: number };
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}

export type WeatherErrorCode = 'TIMEOUT' | 'UPSTREAM_ERROR' | 'INVALID_RESPONSE';

export type WeatherFetchResult =
  | { ok: true; snapshot: WeatherSnapshot }
  | { ok: false; error: string; errorCode: WeatherErrorCode };
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS (no errors from the new files).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/weather/dto/weather-query.dto.ts apps/backend/src/modules/weather/weather.types.ts
git commit -m "feat(backend): add weather dto and normalized types"
```

---

### Task 3: WeatherCache (TTL, geo-rounded key) + test

**Files:**
- Create: `apps/backend/src/modules/weather/weather.cache.ts`
- Test: `apps/backend/src/modules/weather/weather.cache.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/weather/weather.cache.spec.ts`:

```typescript
import { WeatherCache, geoKey } from './weather.cache';

describe('geoKey', () => {
  it('rounds coordinates to ~1km grid (2 decimals)', () => {
    expect(geoKey(18.5204, 73.8567)).toBe('18.52,73.86');
    expect(geoKey(18.5249, 73.8512)).toBe('18.52,73.85');
  });

  it('collapses nearby coordinates onto the same key', () => {
    expect(geoKey(18.521, 73.857)).toBe(geoKey(18.5234, 73.8589));
  });
});

describe('WeatherCache', () => {
  it('returns a stored value before TTL expiry', () => {
    const cache = new WeatherCache<number>(60_000, 100);
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
  });

  it('returns undefined after TTL expiry', () => {
    let now = 1_000;
    const cache = new WeatherCache<number>(500, 100, () => now);
    cache.set('a', 42);
    now = 2_000;
    expect(cache.get('a')).toBeUndefined();
  });

  it('evicts the oldest entry when over capacity', () => {
    const cache = new WeatherCache<number>(60_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/modules/weather/weather.cache.spec.ts`
Expected: FAIL — `Cannot find module './weather.cache'`.

- [ ] **Step 3: Implement the cache**

Create `apps/backend/src/modules/weather/weather.cache.ts`:

```typescript
/** Rounds lat/lng to 2 decimals (~1km) so nearby requests share a cache entry. */
export function geoKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Tiny insertion-ordered TTL cache. No external dependency. Size-capped with
 * oldest-first eviction (Map preserves insertion order).
 */
export class WeatherCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec jest src/modules/weather/weather.cache.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/weather/weather.cache.ts apps/backend/src/modules/weather/weather.cache.spec.ts
git commit -m "feat(backend): add weather ttl cache"
```

---

### Task 4: WeatherClient (Open-Meteo fetch + normalization) + test

**Files:**
- Create: `apps/backend/src/modules/weather/clients/weather.client.ts`
- Test: `apps/backend/src/modules/weather/clients/weather.client.spec.ts`

This is the ONLY file that knows Open-Meteo's wire format. It mirrors the typed-failure pattern in `apps/backend/src/modules/ai/clients/fastapi.client.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/weather/clients/weather.client.spec.ts`:

```typescript
import { codeToCondition, normalizeOpenMeteo } from './weather.client';

// A trimmed but realistic Open-Meteo /v1/forecast payload.
const SAMPLE = {
  latitude: 18.52,
  longitude: 73.86,
  current: {
    time: '2026-06-13T09:00',
    temperature_2m: 27.4,
    relative_humidity_2m: 81,
    precipitation: 0.2,
    weather_code: 61,
    wind_speed_10m: 12.6,
    is_day: 1,
  },
  hourly: {
    time: ['2026-06-13T09:00', '2026-06-13T10:00'],
    temperature_2m: [27.4, 28.1],
    relative_humidity_2m: [81, 78],
    precipitation: [0.2, 0.0],
    precipitation_probability: [40, 20],
    weather_code: [61, 3],
  },
  daily: {
    time: ['2026-06-13', '2026-06-14'],
    temperature_2m_min: [22.1, 23.0],
    temperature_2m_max: [31.5, 32.2],
    precipitation_sum: [4.2, 0.0],
    precipitation_probability_max: [60, 15],
    weather_code: [61, 1],
  },
};

describe('codeToCondition', () => {
  it('maps WMO codes to the condition enum', () => {
    expect(codeToCondition(0)).toBe('clear');
    expect(codeToCondition(3)).toBe('cloudy');
    expect(codeToCondition(45)).toBe('fog');
    expect(codeToCondition(61)).toBe('rain');
    expect(codeToCondition(75)).toBe('snow');
    expect(codeToCondition(95)).toBe('thunderstorm');
  });
});

describe('normalizeOpenMeteo', () => {
  it('normalizes a valid payload into a WeatherSnapshot', () => {
    const snap = normalizeOpenMeteo(SAMPLE, 18.52, 73.86);
    expect(snap).not.toBeNull();
    expect(snap!.current.tempC).toBe(27.4);
    expect(snap!.current.humidity).toBe(81);
    expect(snap!.current.condition).toBe('rain');
    expect(snap!.current.isDay).toBe(true);
    expect(snap!.hourly).toHaveLength(2);
    expect(snap!.hourly[0]!.precipProbability).toBe(40);
    expect(snap!.daily).toHaveLength(2);
    expect(snap!.daily[0]!.tMaxC).toBe(31.5);
    expect(snap!.daily[0]!.precipProbability).toBe(60);
    expect(snap!.daily[0]!.condition).toBe('rain');
  });

  it('returns null when the current block is missing', () => {
    expect(normalizeOpenMeteo({ daily: {} }, 1, 2)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/modules/weather/clients/weather.client.spec.ts`
Expected: FAIL — `Cannot find module './weather.client'`.

- [ ] **Step 3: Implement the client**

Create `apps/backend/src/modules/weather/clients/weather.client.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, type AxiosInstance } from 'axios';

import type { Env } from '@/config/env.schema';

import type {
  WeatherCondition,
  WeatherDaily,
  WeatherFetchResult,
  WeatherHourly,
  WeatherSnapshot,
} from '../weather.types';

const TIMEOUT_MS = 10_000;

/** WMO weather-code → coarse condition enum. */
export function codeToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'thunderstorm';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 61 ||
    code === 63 ||
    code === 65
  ) {
    return 'rain';
  }
  return 'cloudy';
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Pure normalizer (exported for unit testing). Returns null when the payload is
 * missing the required `current` block.
 */
export function normalizeOpenMeteo(
  payload: any,
  lat: number,
  lng: number,
): WeatherSnapshot | null {
  if (!payload || typeof payload !== 'object' || !payload.current) return null;

  const c = payload.current;
  const currentCode = num(c.weather_code);

  const hourly: WeatherHourly[] = Array.isArray(payload.hourly?.time)
    ? payload.hourly.time.map((time: string, i: number) => ({
        time,
        tempC: num(payload.hourly.temperature_2m?.[i]),
        humidity: num(payload.hourly.relative_humidity_2m?.[i]),
        precipitationMm: num(payload.hourly.precipitation?.[i]),
        precipProbability: num(payload.hourly.precipitation_probability?.[i]),
        weatherCode: num(payload.hourly.weather_code?.[i]),
      }))
    : [];

  const daily: WeatherDaily[] = Array.isArray(payload.daily?.time)
    ? payload.daily.time.map((date: string, i: number) => {
        const code = num(payload.daily.weather_code?.[i]);
        return {
          date,
          tMinC: num(payload.daily.temperature_2m_min?.[i]),
          tMaxC: num(payload.daily.temperature_2m_max?.[i]),
          precipitationMm: num(payload.daily.precipitation_sum?.[i]),
          precipProbability: num(payload.daily.precipitation_probability_max?.[i]),
          humidityMean: num(payload.daily.relative_humidity_2m_mean?.[i]),
          weatherCode: code,
          condition: codeToCondition(code),
        };
      })
    : [];

  return {
    location: { lat, lng },
    current: {
      tempC: num(c.temperature_2m),
      humidity: num(c.relative_humidity_2m),
      precipitationMm: num(c.precipitation),
      precipProbability: num(payload.hourly?.precipitation_probability?.[0]),
      windKph: num(c.wind_speed_10m),
      weatherCode: currentCode,
      condition: codeToCondition(currentCode),
      isDay: num(c.is_day, 1) === 1,
      observedAt: typeof c.time === 'string' ? c.time : new Date().toISOString(),
    },
    hourly,
    daily,
  };
}

@Injectable()
export class WeatherClient {
  private readonly logger = new Logger(WeatherClient.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService<Env, true>) {
    this.http = axios.create({
      baseURL: config.get('OPENMETEO_BASE_URL', { infer: true }),
      timeout: TIMEOUT_MS,
    });
  }

  async fetch(lat: number, lng: number): Promise<WeatherFetchResult> {
    try {
      const { data } = await this.http.get('/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lng,
          current:
            'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day',
          hourly:
            'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code',
          daily:
            'temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean,weather_code',
          forecast_days: 7,
          timezone: 'auto',
        },
      });

      const snapshot = normalizeOpenMeteo(data, lat, lng);
      if (!snapshot) {
        return {
          ok: false,
          error: 'Open-Meteo returned an unexpected payload shape',
          errorCode: 'INVALID_RESPONSE',
        };
      }
      return { ok: true, snapshot };
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.code === 'ECONNABORTED' || err.message.toLowerCase().includes('timeout')) {
          this.logger.warn(`Open-Meteo timeout after ${TIMEOUT_MS}ms`);
          return { ok: false, error: 'Weather service timed out', errorCode: 'TIMEOUT' };
        }
        this.logger.warn(`Open-Meteo error: ${err.message}`);
        return {
          ok: false,
          error: err.response?.statusText ?? err.message,
          errorCode: 'UPSTREAM_ERROR',
        };
      }
      this.logger.error('Unknown Open-Meteo error', err as Error);
      return { ok: false, error: 'Unknown weather error', errorCode: 'UPSTREAM_ERROR' };
    }
  }
}
```

Note: the spec test uses `any` for the sample payload — the `normalizeOpenMeteo` signature uses `any` deliberately so the normalizer can defensively read an untrusted external shape. This matches the tolerant approach in `fastapi.client.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec jest src/modules/weather/clients/weather.client.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/weather/clients/weather.client.ts apps/backend/src/modules/weather/clients/weather.client.spec.ts
git commit -m "feat(backend): add open-meteo weather client"
```

---

### Task 5: WeatherService (caching facade)

**Files:**
- Create: `apps/backend/src/modules/weather/weather.service.ts`

- [ ] **Step 1: Implement the service**

Create `apps/backend/src/modules/weather/weather.service.ts`:

```typescript
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';

import { WeatherClient } from './clients/weather.client';
import { geoKey, WeatherCache } from './weather.cache';
import type { WeatherSnapshot } from './weather.types';

const MAX_CACHE_ENTRIES = 500;

/**
 * Caching facade over WeatherClient. Snapshots are cached by geo-rounded key.
 * Both current + forecast come from a single Open-Meteo call, so we cache one
 * snapshot per location and serve the shorter of the two TTLs.
 *
 * Stale-while-error: if a refresh fails but a recent snapshot exists, that
 * snapshot is returned instead of throwing.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache: WeatherCache<WeatherSnapshot>;
  /** Long-lived fallback store (forecast TTL) for stale-while-error. */
  private readonly fallback: WeatherCache<WeatherSnapshot>;

  constructor(
    private readonly client: WeatherClient,
    config: ConfigService<Env, true>,
  ) {
    const currentMin = config.get('WEATHER_CACHE_CURRENT_MINUTES', { infer: true });
    const forecastMin = config.get('WEATHER_CACHE_FORECAST_MINUTES', { infer: true });
    this.cache = new WeatherCache<WeatherSnapshot>(currentMin * 60_000, MAX_CACHE_ENTRIES);
    this.fallback = new WeatherCache<WeatherSnapshot>(forecastMin * 60_000, MAX_CACHE_ENTRIES);
  }

  async getSnapshot(lat: number, lng: number): Promise<WeatherSnapshot> {
    const key = geoKey(lat, lng);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const result = await this.client.fetch(lat, lng);
    if (result.ok) {
      this.cache.set(key, result.snapshot);
      this.fallback.set(key, result.snapshot);
      return result.snapshot;
    }

    // Stale-while-error: serve a recent snapshot if we have one.
    const stale = this.fallback.get(key);
    if (stale) {
      this.logger.warn(`Serving stale weather for ${key} after ${result.errorCode}`);
      return stale;
    }

    throw new ServiceUnavailableException(result.error);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/weather/weather.service.ts
git commit -m "feat(backend): add weather caching service"
```

---

### Task 6: WeatherController + WeatherModule + register in AppModule

**Files:**
- Create: `apps/backend/src/modules/weather/weather.controller.ts`
- Create: `apps/backend/src/modules/weather/weather.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create the controller**

Create `apps/backend/src/modules/weather/weather.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';

import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';
import type { WeatherCurrent, WeatherSnapshot } from './weather.types';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get('current')
  async current(@Query() query: WeatherQueryDto): Promise<WeatherCurrent> {
    const snapshot = await this.weather.getSnapshot(query.lat, query.lng);
    return snapshot.current;
  }

  @Get('forecast')
  async forecast(@Query() query: WeatherQueryDto): Promise<WeatherSnapshot> {
    return this.weather.getSnapshot(query.lat, query.lng);
  }
}
```

- [ ] **Step 2: Create the module**

Create `apps/backend/src/modules/weather/weather.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { WeatherClient } from './clients/weather.client';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  controllers: [WeatherController],
  providers: [WeatherClient, WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
```

- [ ] **Step 3: Register in AppModule**

In `apps/backend/src/app.module.ts`, add the import (alphabetical, after `UsersModule` import line):

```typescript
import { WeatherModule } from './modules/weather/weather.module';
```

And add `WeatherModule` to the `imports` array (after `RealtimeModule`, before `ScheduleModule.forRoot()`):

```typescript
    RealtimeModule,
    WeatherModule,
    ScheduleModule.forRoot(),
```

- [ ] **Step 4: Build to verify wiring**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Start the backend (`pnpm --filter backend dev`), obtain a JWT (login with `9999999999` / OTP `123456` via the auth endpoints), then:

Run: `curl -H "Authorization: Bearer <JWT>" "http://localhost:3000/weather/current?lat=18.52&lng=73.86"`
Expected: `{ "success": true, "data": { "tempC": ..., "humidity": ..., "condition": ... }, "timestamp": ... }`.

Run: `curl -H "Authorization: Bearer <JWT>" "http://localhost:3000/weather/forecast?lat=18.52&lng=73.86"`
Expected: snapshot with `current`, `hourly`, and a 7-entry `daily` array.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/weather/weather.controller.ts apps/backend/src/modules/weather/weather.module.ts apps/backend/src/app.module.ts
git commit -m "feat(backend): expose weather endpoints"
```

---

### Task 7: Mobile weather types + API client

**Files:**
- Create: `apps/mobile/src/features/weather/types.ts`
- Create: `apps/mobile/src/features/weather/api/weather.api.ts`

- [ ] **Step 1: Create the types**

Create `apps/mobile/src/features/weather/types.ts` (mirrors the backend normalized shapes):

```typescript
export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'fog'
  | 'snow';

export interface WeatherCurrent {
  tempC: number;
  humidity: number;
  precipitationMm: number;
  precipProbability: number;
  windKph: number;
  weatherCode: number;
  condition: WeatherCondition;
  isDay: boolean;
  observedAt: string;
}

export interface WeatherDaily {
  date: string;
  tMinC: number;
  tMaxC: number;
  precipitationMm: number;
  precipProbability: number;
  humidityMean: number;
  weatherCode: number;
  condition: WeatherCondition;
}

export interface WeatherHourly {
  time: string;
  tempC: number;
  humidity: number;
  precipitationMm: number;
  precipProbability: number;
  weatherCode: number;
}

export interface WeatherSnapshot {
  location: { lat: number; lng: number };
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}
```

- [ ] **Step 2: Create the API client**

Create `apps/mobile/src/features/weather/api/weather.api.ts` (matches the `reportsApi` pattern):

```typescript
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

import type { WeatherCurrent, WeatherSnapshot } from '../types';

interface WeatherParams {
  lat: number;
  lng: number;
}

export const weatherApi = {
  async current(params: WeatherParams): Promise<WeatherCurrent> {
    const { data } = await apiClient.get<ApiResponse<WeatherCurrent>>('/weather/current', {
      params,
    });
    return data.data;
  },

  async forecast(params: WeatherParams): Promise<WeatherSnapshot> {
    const { data } = await apiClient.get<ApiResponse<WeatherSnapshot>>('/weather/forecast', {
      params,
    });
    return data.data;
  },
};
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/weather/types.ts apps/mobile/src/features/weather/api/weather.api.ts
git commit -m "feat(mobile): add weather types and api client"
```

---

### Task 8: Mobile weather hooks

**Files:**
- Create: `apps/mobile/src/features/weather/hooks/use-current-weather.ts`
- Create: `apps/mobile/src/features/weather/hooks/use-plot-weather.ts`

`useUserLocation` lives at `@/features/map-system/hooks/use-user-location` and returns `{ location: { latitude, longitude } | null, permission, refresh }`.

- [ ] **Step 1: Create useCurrentWeather**

Create `apps/mobile/src/features/weather/hooks/use-current-weather.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

import { weatherApi } from '../api/weather.api';

const STALE_MS = 15 * 60 * 1000; // matches backend current-weather cache TTL

/**
 * Fetches current weather for a coordinate. Coordinates are rounded to 2
 * decimals in the query key so small GPS jitter doesn't refetch.
 */
export function useCurrentWeather(coords: { latitude: number; longitude: number } | null) {
  const lat = coords ? Number(coords.latitude.toFixed(2)) : null;
  const lng = coords ? Number(coords.longitude.toFixed(2)) : null;

  return useQuery({
    queryKey: ['weather', 'current', lat, lng],
    queryFn: () => weatherApi.forecast({ lat: lat as number, lng: lng as number }),
    enabled: lat !== null && lng !== null,
    staleTime: STALE_MS,
    refetchIntervalInBackground: false,
  });
}
```

(We call `forecast` so the card has both current + the 3-day strip from a single request, served from one cached snapshot.)

- [ ] **Step 2: Create usePlotWeather**

Create `apps/mobile/src/features/weather/hooks/use-plot-weather.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

import { weatherApi } from '../api/weather.api';

const STALE_MS = 15 * 60 * 1000;

/**
 * Weather forecast for a single plot's coordinates. Risk for the plot is added
 * in Phase 2 via a dedicated endpoint; this hook handles the display side.
 */
export function usePlotWeather(coords: { latitude: number; longitude: number } | null) {
  const lat = coords ? Number(coords.latitude.toFixed(2)) : null;
  const lng = coords ? Number(coords.longitude.toFixed(2)) : null;

  return useQuery({
    queryKey: ['weather', 'plot', lat, lng],
    queryFn: () => weatherApi.forecast({ lat: lat as number, lng: lng as number }),
    enabled: lat !== null && lng !== null,
    staleTime: STALE_MS,
    refetchIntervalInBackground: false,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/weather/hooks/use-current-weather.ts apps/mobile/src/features/weather/hooks/use-plot-weather.ts
git commit -m "feat(mobile): add weather query hooks"
```

---

### Task 9: Weather icon + condition mapping (with test)

**Files:**
- Create: `apps/mobile/src/features/weather/components/weather-icon.tsx`
- Create: `apps/mobile/src/features/weather/utils/condition.ts`
- Test: `apps/mobile/src/features/weather/utils/condition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/weather/utils/condition.test.ts`:

```typescript
import { conditionLabel } from './condition';

describe('conditionLabel', () => {
  it('returns human-readable labels for each condition', () => {
    expect(conditionLabel('clear')).toBe('Clear');
    expect(conditionLabel('cloudy')).toBe('Cloudy');
    expect(conditionLabel('rain')).toBe('Rain');
    expect(conditionLabel('thunderstorm')).toBe('Thunderstorm');
    expect(conditionLabel('fog')).toBe('Fog');
    expect(conditionLabel('snow')).toBe('Snow');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile exec jest src/features/weather/utils/condition.test.ts`
Expected: FAIL — `Cannot find module './condition'`.

- [ ] **Step 3: Implement the condition util**

Create `apps/mobile/src/features/weather/utils/condition.ts`:

```typescript
import type { WeatherCondition } from '../types';

const LABELS: Record<WeatherCondition, string> = {
  clear: 'Clear',
  cloudy: 'Cloudy',
  rain: 'Rain',
  thunderstorm: 'Thunderstorm',
  fog: 'Fog',
  snow: 'Snow',
};

export function conditionLabel(condition: WeatherCondition): string {
  return LABELS[condition];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile exec jest src/features/weather/utils/condition.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the icon component**

Create `apps/mobile/src/features/weather/components/weather-icon.tsx` (uses `lucide-react-native`, already a dependency):

```typescript
import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Zap,
} from 'lucide-react-native';

import type { WeatherCondition } from '../types';

interface WeatherIconProps {
  condition: WeatherCondition;
  isDay?: boolean;
  size?: number;
  color?: string;
}

export function WeatherIcon({ condition, isDay = true, size = 28, color }: WeatherIconProps) {
  switch (condition) {
    case 'clear':
      return isDay ? <Sun size={size} color={color} /> : <CloudSun size={size} color={color} />;
    case 'cloudy':
      return <Cloud size={size} color={color} />;
    case 'rain':
      return <CloudRain size={size} color={color} />;
    case 'thunderstorm':
      return <Zap size={size} color={color} />;
    case 'fog':
      return <CloudFog size={size} color={color} />;
    case 'snow':
      return <CloudSnow size={size} color={color} />;
    default:
      return <Cloud size={size} color={color} />;
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/weather/components/weather-icon.tsx apps/mobile/src/features/weather/utils/condition.ts apps/mobile/src/features/weather/utils/condition.test.ts
git commit -m "feat(mobile): add weather icon and condition util"
```

---

### Task 10: WeatherCard + ForecastStrip + dashboard wiring

**Files:**
- Create: `apps/mobile/src/features/weather/components/forecast-strip.tsx`
- Create: `apps/mobile/src/features/weather/components/weather-card.tsx`
- Create: `apps/mobile/src/features/weather/index.ts`
- Modify: `apps/mobile/src/app/(app)/index.tsx`

Styling reuses existing primitives: `Card` from `@/components/ui/card`, `Skeleton` from `@/components/ui/skeleton`, `SectionLabel` from `@/components/ui/section-label`, `Text`/`View` from `@/tw` — see `apps/mobile/src/features/dashboard/components/outbreak-summary.tsx` for the pattern.

- [ ] **Step 1: Create the forecast strip**

Create `apps/mobile/src/features/weather/components/forecast-strip.tsx`:

```typescript
import { ScrollView } from 'react-native';

import { Text, View } from '@/tw';

import type { WeatherDaily } from '../types';
import { WeatherIcon } from './weather-icon';

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function ForecastStrip({ daily }: { daily: WeatherDaily[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 14, paddingTop: 12 }}
    >
      {daily.slice(0, 5).map((day) => (
        <View key={day.date} className="items-center gap-1">
          <Text className="text-xs text-text-muted">{shortDay(day.date)}</Text>
          <WeatherIcon condition={day.condition} size={22} />
          <Text className="text-xs font-semibold text-text">
            {Math.round(day.tMaxC)}°
          </Text>
          <Text className="text-[10px] text-text-muted">{Math.round(day.tMinC)}°</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Create the weather card**

Create `apps/mobile/src/features/weather/components/weather-card.tsx`:

```typescript
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { Skeleton } from '@/components/ui/skeleton';
import { Text, View } from '@/tw';

import type { WeatherSnapshot } from '../types';
import { conditionLabel } from '../utils/condition';
import { ForecastStrip } from './forecast-strip';
import { WeatherIcon } from './weather-icon';

interface WeatherCardProps {
  snapshot?: WeatherSnapshot;
  loading?: boolean;
  /** When true, shows a tap-to-enable prompt instead of weather. */
  needsLocation?: boolean;
  onRequestLocation?: () => void;
  unavailable?: boolean;
  onRetry?: () => void;
}

export function WeatherCard({
  snapshot,
  loading,
  needsLocation,
  onRequestLocation,
  unavailable,
  onRetry,
}: WeatherCardProps) {
  if (needsLocation) {
    return (
      <Card padding="lg">
        <SectionLabel>Weather</SectionLabel>
        <Text className="mt-2 text-sm text-text-muted">
          Enable location to see local weather and disease risk.
        </Text>
        <Text
          accessibilityRole="button"
          onPress={onRequestLocation}
          className="mt-3 text-sm font-semibold text-brand-700"
        >
          Enable location
        </Text>
      </Card>
    );
  }

  if (unavailable) {
    return (
      <Card padding="lg">
        <SectionLabel>Weather</SectionLabel>
        <Text className="mt-2 text-sm text-text-muted">Weather is unavailable right now.</Text>
        <Text
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-3 text-sm font-semibold text-brand-700"
        >
          Retry
        </Text>
      </Card>
    );
  }

  if (loading || !snapshot) {
    return <Skeleton height={150} rounded="xl" />;
  }

  const { current, daily } = snapshot;

  return (
    <Card padding="lg">
      <SectionLabel>Weather now</SectionLabel>
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <WeatherIcon condition={current.condition} isDay={current.isDay} size={36} />
          <View>
            <Text
              className="font-extrabold text-text"
              style={{ fontSize: 34, lineHeight: 38, letterSpacing: -1 }}
            >
              {Math.round(current.tempC)}°
            </Text>
            <Text className="text-xs text-text-muted">{conditionLabel(current.condition)}</Text>
          </View>
        </View>
        <View className="items-end gap-1">
          <Text className="text-xs text-text-muted">{`Humidity ${Math.round(current.humidity)}%`}</Text>
          <Text className="text-xs text-text-muted">{`Rain ${Math.round(current.precipProbability)}%`}</Text>
          <Text className="text-xs text-text-muted">{`Wind ${Math.round(current.windKph)} kph`}</Text>
        </View>
      </View>
      <ForecastStrip daily={daily} />
    </Card>
  );
}
```

- [ ] **Step 3: Create the barrel file**

Create `apps/mobile/src/features/weather/index.ts`:

```typescript
export { WeatherCard } from './components/weather-card';
export { useCurrentWeather } from './hooks/use-current-weather';
export { usePlotWeather } from './hooks/use-plot-weather';
export type { WeatherSnapshot } from './types';
```

- [ ] **Step 4: Wire into the dashboard**

In `apps/mobile/src/app/(app)/index.tsx`:

Add imports near the other feature imports:

```typescript
import { useUserLocation } from '@/features/map-system/hooks/use-user-location';
import { WeatherCard, useCurrentWeather } from '@/features/weather';
```

Inside `HomeScreen`, after the existing hook calls, add:

```typescript
  const { location, permission, refresh: refreshLocation } = useUserLocation();
  const weather = useCurrentWeather(location);
```

Add a new animated section between the `OutbreakSummary` block and the `QuickUploadCTA` block:

```tsx
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <WeatherCard
              snapshot={weather.data}
              loading={weather.isPending && !!location}
              needsLocation={permission === 'denied' || (!location && !weather.isPending)}
              onRequestLocation={refreshLocation}
              unavailable={weather.isError}
              onRetry={() => weather.refetch()}
            />
          </Animated.View>
```

Bump the subsequent siblings' `FadeInDown.delay` so the stagger stays ordered: `QuickUploadCTA` → `delay(200)`, `RecentReports` → `delay(280)`.

- [ ] **Step 5: Typecheck + bundle**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

Run the app (`pnpm --filter mobile dev`) and confirm the dashboard shows the weather card with current temp + a daily strip; deny location and confirm the tap-to-enable prompt appears.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/weather/ apps/mobile/src/app/\(app\)/index.tsx
git commit -m "feat(mobile): add weather card to dashboard"
```

---

## Phase 2 — Disease Risk + Alerts

### Task 11: Schema — add `WEATHER` type + `weatherAlerts` preference

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration via Prisma CLI

- [ ] **Step 1: Add `WEATHER` to the `NotificationType` enum**

In `apps/backend/prisma/schema.prisma`, find `enum NotificationType` and add `WEATHER`:

```prisma
enum NotificationType {
  OUTBREAK
  REPORT
  WARNING
  SYSTEM
  WEATHER
}
```

- [ ] **Step 2: Add `weatherAlerts` to `NotificationPreferences`**

In the `model NotificationPreferences` block, add the field after `resolvedAlerts`:

```prisma
  resolvedAlerts      Boolean  @default(true)
  weatherAlerts       Boolean  @default(true)
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm --filter backend exec prisma migrate dev --name add_weather_notifications`
Expected: a new migration directory is created under `apps/backend/prisma/migrations/` and the Prisma client regenerates without error.

- [ ] **Step 4: Verify the client picks up the enum value**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS (the generated `NotificationType.WEATHER` is now available).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(backend): add WEATHER notification type and weatherAlerts pref"
```

---

### Task 12: Weather risk profiles

**Files:**
- Create: `apps/backend/src/modules/weather/weather-risk.profiles.ts`

Profiles are keyed by crop name (matching `Plot.cropTypes`, which mirror the mobile crop catalog and `DISEASE_CATALOG` keys in `apps/backend/src/modules/ai/disease-catalog.ts`). Disease names match `DISEASE_CATALOG` verbatim so risk copy is consistent with AI diagnoses.

- [ ] **Step 1: Create the profiles**

Create `apps/backend/src/modules/weather/weather-risk.profiles.ts`:

```typescript
/**
 * Favorable-condition profile for a single crop disease. A day "matches" when
 * its humidity, temperature range, and (optionally) expected rain all align.
 * Risk is derived from how many of the next forecast days match.
 */
export interface RiskProfile {
  crop: string;
  disease: string;
  humidityMin: number; // %
  tempMinC: number;
  tempMaxC: number;
  /** When true, the day must also have meaningful rain probability/precip. */
  needsRain: boolean;
}

/** Disease names are verbatim from DISEASE_CATALOG. */
export const RISK_PROFILES: RiskProfile[] = [
  { crop: 'Tomato', disease: 'Tomato Late Blight', humidityMin: 85, tempMinC: 10, tempMaxC: 24, needsRain: true },
  { crop: 'Tomato', disease: 'Tomato Early Blight', humidityMin: 80, tempMinC: 24, tempMaxC: 29, needsRain: true },
  { crop: 'Potato', disease: 'Potato Late Blight', humidityMin: 85, tempMinC: 10, tempMaxC: 24, needsRain: true },
  { crop: 'Rice', disease: 'Rice Blast', humidityMin: 90, tempMinC: 20, tempMaxC: 28, needsRain: false },
  { crop: 'Rice', disease: 'Rice Bacterial Leaf Blight', humidityMin: 85, tempMinC: 25, tempMaxC: 34, needsRain: true },
  { crop: 'Wheat', disease: 'Wheat Leaf Rust', humidityMin: 70, tempMinC: 15, tempMaxC: 22, needsRain: true },
  { crop: 'Maize', disease: 'Maize Common Rust', humidityMin: 75, tempMinC: 16, tempMaxC: 25, needsRain: true },
  { crop: 'Grape', disease: 'Grape Powdery Mildew', humidityMin: 60, tempMinC: 20, tempMaxC: 27, needsRain: false },
  { crop: 'Chili', disease: 'Chili Anthracnose', humidityMin: 80, tempMinC: 22, tempMaxC: 30, needsRain: true },
  { crop: 'Onion', disease: 'Onion Purple Blotch', humidityMin: 80, tempMinC: 18, tempMaxC: 30, needsRain: true },
];

export function profilesForCrops(cropTypes: string[]): RiskProfile[] {
  const wanted = new Set(cropTypes.map((c) => c.toLowerCase()));
  return RISK_PROFILES.filter((p) => wanted.has(p.crop.toLowerCase()));
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/weather/weather-risk.profiles.ts
git commit -m "feat(backend): add weather risk profiles"
```

---

### Task 13: WeatherRiskService + test

**Files:**
- Create: `apps/backend/src/modules/weather/weather-risk.service.ts`
- Test: `apps/backend/src/modules/weather/weather-risk.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/weather/weather-risk.service.spec.ts`:

```typescript
import { WeatherRiskService } from './weather-risk.service';
import type { WeatherDaily, WeatherSnapshot } from './weather.types';

function daily(overrides: Partial<WeatherDaily>): WeatherDaily {
  return {
    date: '2026-06-13',
    tMinC: 18,
    tMaxC: 22,
    precipitationMm: 0,
    precipProbability: 0,
    humidityMean: 50,
    weatherCode: 1,
    condition: 'clear',
    ...overrides,
  };
}

function snapshot(days: WeatherDaily[]): WeatherSnapshot {
  return {
    location: { lat: 18.52, lng: 73.86 },
    current: {
      tempC: 20,
      humidity: 50,
      precipitationMm: 0,
      precipProbability: 0,
      windKph: 5,
      weatherCode: 1,
      condition: 'clear',
      isDay: true,
      observedAt: '2026-06-13T09:00',
    },
    hourly: [],
    daily: days,
  };
}

describe('WeatherRiskService', () => {
  const service = new WeatherRiskService();

  it('returns LOW when no crop profiles match the forecast', () => {
    const snap = snapshot([daily({}), daily({})]);
    const result = service.evaluate(['Tomato'], snap);
    expect(result.level).toBe('LOW');
    expect(result.topRisks).toHaveLength(0);
  });

  it('returns HIGH when blight-favorable conditions persist over multiple days', () => {
    const wet = daily({ humidityMean: 90, tMinC: 12, tMaxC: 22, precipProbability: 80, precipitationMm: 6 });
    const snap = snapshot([wet, wet, wet]);
    const result = service.evaluate(['Tomato'], snap);
    expect(result.level).toBe('HIGH');
    expect(result.topRisks[0]!.disease).toBe('Tomato Late Blight');
    expect(result.topRisks[0]!.reason).toContain('humidity');
  });

  it('returns MEDIUM when conditions match on a single day only', () => {
    const wet = daily({ humidityMean: 90, tMinC: 12, tMaxC: 22, precipProbability: 80, precipitationMm: 6 });
    const dry = daily({ humidityMean: 40, tMinC: 20, tMaxC: 30 });
    const snap = snapshot([wet, dry, dry]);
    const result = service.evaluate(['Tomato'], snap);
    expect(result.level).toBe('MEDIUM');
  });

  it('takes the max risk across multiple crops on a plot', () => {
    const wet = daily({ humidityMean: 92, tMinC: 12, tMaxC: 22, precipProbability: 80, precipitationMm: 6 });
    const snap = snapshot([wet, wet, wet]);
    const result = service.evaluate(['Wheat', 'Tomato'], snap);
    expect(result.level).toBe('HIGH');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/modules/weather/weather-risk.service.spec.ts`
Expected: FAIL — `Cannot find module './weather-risk.service'`.

- [ ] **Step 3: Implement the service**

Create `apps/backend/src/modules/weather/weather-risk.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Severity } from '@prisma/client';

import { profilesForCrops, type RiskProfile } from './weather-risk.profiles';
import type { WeatherDaily, WeatherSnapshot } from './weather.types';

export interface CropRisk {
  crop: string;
  disease: string;
  level: Severity;
  reason: string;
}

export interface PlotRisk {
  level: Severity;
  topRisks: CropRisk[];
}

/** How many of the forecast days are evaluated for risk. */
const FORECAST_DAYS = 3;

function dayMatches(day: WeatherDaily, profile: RiskProfile): boolean {
  const humidityOk = day.humidityMean >= profile.humidityMin;
  const tempOk = day.tMaxC >= profile.tempMinC && day.tMinC <= profile.tempMaxC;
  const rainOk = !profile.needsRain || day.precipProbability >= 50 || day.precipitationMm >= 2;
  return humidityOk && tempOk && rainOk;
}

@Injectable()
export class WeatherRiskService {
  /**
   * Evaluates per-plot disease risk from a forecast. For each crop's diseases,
   * counts how many of the next FORECAST_DAYS match the favorable profile:
   *   2+ matching days  → HIGH
   *   1 matching day    → MEDIUM
   *   0 matching days   → LOW
   * The plot's overall level is the max across all its crops' diseases.
   */
  evaluate(cropTypes: string[], snapshot: WeatherSnapshot): PlotRisk {
    const profiles = profilesForCrops(cropTypes);
    const window = snapshot.daily.slice(0, FORECAST_DAYS);
    const risks: CropRisk[] = [];

    for (const profile of profiles) {
      const matchingDays = window.filter((d) => dayMatches(d, profile)).length;
      const level =
        matchingDays >= 2 ? Severity.HIGH : matchingDays === 1 ? Severity.MEDIUM : Severity.LOW;
      if (level === Severity.LOW) continue;

      const peak = window.find((d) => dayMatches(d, profile));
      const humidity = peak ? Math.round(peak.humidityMean) : profile.humidityMin;
      risks.push({
        crop: profile.crop,
        disease: profile.disease,
        level,
        reason: `High humidity (${humidity}%) and ${profile.tempMinC}-${profile.tempMaxC}°C temperatures favor ${profile.disease} over the next ${matchingDays === 1 ? 'day' : `${matchingDays} days`}.`,
      });
    }

    risks.sort((a, b) => severityRank(b.level) - severityRank(a.level));
    const level = risks[0]?.level ?? Severity.LOW;
    return { level, topRisks: risks };
  }
}

function severityRank(s: Severity): number {
  return s === Severity.HIGH ? 3 : s === Severity.MEDIUM ? 2 : 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec jest src/modules/weather/weather-risk.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/weather/weather-risk.service.ts apps/backend/src/modules/weather/weather-risk.service.spec.ts
git commit -m "feat(backend): add weather disease-risk engine"
```

---

### Task 14: Weather risk notification template + fan-out method

**Files:**
- Modify: `apps/backend/src/modules/notifications/templates.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.fanout.service.ts`

The fan-out method mirrors `handleHighSeverityReport` but is plot-scoped (the plot owner is the recipient, no geo search needed) and deduped on `plotId` within the existing window.

- [ ] **Step 1: Add the template**

In `apps/backend/src/modules/notifications/templates.ts`, append:

```typescript
export interface WeatherRiskInfo {
  plotId: string;
  plotName: string;
  disease: string;
  crop: string;
  severity: Severity;
  reason: string;
}

export function weatherRiskTemplate(info: WeatherRiskInfo): NotificationTemplate {
  return {
    type: 'WEATHER',
    title: `Weather raises ${info.disease} risk`,
    body: `${info.plotName}: ${info.reason}`,
    severity: info.severity,
    data: {
      plotId: info.plotId,
      crop: info.crop,
      disease: info.disease,
      kind: 'weather.risk',
      riskLevel: info.severity,
    },
  };
}
```

- [ ] **Step 2: Add the fan-out method**

In `apps/backend/src/modules/notifications/notifications.fanout.service.ts`:

Add to the existing `templates` import block:

```typescript
import {
  highSeverityReportTemplate,
  outbreakCreatedTemplate,
  outbreakEscalatedTemplate,
  outbreakResolvedTemplate,
  weatherRiskTemplate,
  type WeatherRiskInfo,
} from './templates';
```

Add a `Plot` import from `@prisma/client` (extend the existing import):

```typescript
import { NotificationType, type OutbreakZone, type Plot, type Report, Severity } from '@prisma/client';
```

Add this method after `handleHighSeverityReport` (and before the private helpers):

```typescript
  /**
   * Fired by WeatherScheduler when a plot's disease risk transitions UP to HIGH.
   * Recipient is the plot owner. Deduped on (userId, plotId) within the standard
   * dedup window so a plot that stays HIGH doesn't re-notify every sweep.
   */
  async handleWeatherRisk(
    plot: Plot,
    risk: { disease: string; crop: string; reason: string },
  ): Promise<void> {
    const allowed = await this.filterByPreference([plot.userId], 'weatherAlerts');
    if (allowed.length === 0) return;

    const notDeduped = await this.dedupForPlotWeather(plot.userId, plot.id);
    if (notDeduped.length === 0) return;

    const info: WeatherRiskInfo = {
      plotId: plot.id,
      plotName: plot.name,
      disease: risk.disease,
      crop: risk.crop,
      severity: Severity.HIGH,
      reason: risk.reason,
    };
    await this.notifications.createForUsers([plot.userId], weatherRiskTemplate(info));
  }
```

Add the dedup helper alongside the other private helpers:

```typescript
  private async dedupForPlotWeather(userId: string, plotId: string): Promise<string[]> {
    const cutoff = new Date(Date.now() - this.dedupHours * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.WEATHER,
        createdAt: { gte: cutoff },
        data: { path: ['plotId'], equals: plotId },
      },
      select: { id: true },
    });
    return recent ? [] : [userId];
  }
```

Update `filterByPreference`'s `prefKey` union type to include `'weatherAlerts'` (two occurrences — the param type in `findUsersWithPlotsNear` and in `filterByPreference`):

```typescript
    prefKey: 'outbreakAlerts' | 'reportAlerts' | 'severityEscalations' | 'resolvedAlerts' | 'weatherAlerts',
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/notifications/templates.ts apps/backend/src/modules/notifications/notifications.fanout.service.ts
git commit -m "feat(backend): add weather-risk notification fan-out"
```

---

### Task 15: Plot-scoped risk endpoint

**Files:**
- Modify: `apps/backend/src/modules/weather/weather.controller.ts`
- Modify: `apps/backend/src/modules/weather/weather.module.ts`

`GET /weather/plot/:id` returns weather + computed risk for one of the caller's plots. Reuses `PlotsService.findById` (ownership-checked) and `WeatherRiskService`.

- [ ] **Step 1: Wire PlotsModule + WeatherRiskService into WeatherModule**

In `apps/backend/src/modules/weather/weather.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { PlotsModule } from '../plots/plots.module';
import { WeatherClient } from './clients/weather.client';
import { WeatherController } from './weather.controller';
import { WeatherRiskService } from './weather-risk.service';
import { WeatherService } from './weather.service';

@Module({
  imports: [PlotsModule],
  controllers: [WeatherController],
  providers: [WeatherClient, WeatherService, WeatherRiskService],
  exports: [WeatherService, WeatherRiskService],
})
export class WeatherModule {}
```

`PlotsModule` already exports `PlotsService` (verified in `apps/backend/src/modules/plots/plots.module.ts`), so no change is needed there.

- [ ] **Step 2: Add the endpoint**

The codebase uses `@CurrentUser() user: User` (from `@/common/decorators/current-user.decorator`), which yields the full `User` object — read the id as `user.id` (verified in `apps/backend/src/modules/plots/plots.controller.ts`).

Rewrite `apps/backend/src/modules/weather/weather.controller.ts`:

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { PlotsService } from '../plots/plots.service';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherRiskService, type PlotRisk } from './weather-risk.service';
import { WeatherService } from './weather.service';
import type { WeatherCurrent, WeatherSnapshot } from './weather.types';

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weather: WeatherService,
    private readonly risk: WeatherRiskService,
    private readonly plots: PlotsService,
  ) {}

  @Get('current')
  async current(@Query() query: WeatherQueryDto): Promise<WeatherCurrent> {
    const snapshot = await this.weather.getSnapshot(query.lat, query.lng);
    return snapshot.current;
  }

  @Get('forecast')
  async forecast(@Query() query: WeatherQueryDto): Promise<WeatherSnapshot> {
    return this.weather.getSnapshot(query.lat, query.lng);
  }

  @Get('plot/:id')
  async plot(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ weather: WeatherSnapshot; risk: PlotRisk }> {
    const plot = await this.plots.findById(user.id, id);
    const weather = await this.weather.getSnapshot(plot.latitude, plot.longitude);
    const risk = this.risk.evaluate(plot.cropTypes, weather);
    return { weather, risk };
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

With the backend running and a JWT, create a plot (`POST /plots` with `cropTypes: ["Tomato"]` near `18.52,73.86`), note its id, then:

Run: `curl -H "Authorization: Bearer <JWT>" "http://localhost:3000/weather/plot/<plotId>"`
Expected: `{ success: true, data: { weather: {...}, risk: { level, topRisks } } }`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/weather/weather.controller.ts apps/backend/src/modules/weather/weather.module.ts
git commit -m "feat(backend): add plot-scoped weather risk endpoint"
```

---

### Task 16: WeatherScheduler (env-configurable cron) + register

**Files:**
- Create: `apps/backend/src/modules/weather/weather.scheduler.ts`
- Modify: `apps/backend/src/modules/weather/weather.module.ts`

The cron expression is env-driven (`WEATHER_RISK_CRON`), so we register the job dynamically via `SchedulerRegistry` in `onModuleInit` rather than the static `@Cron` decorator (which can't read runtime config). `@nestjs/schedule` ships the `cron` package — `CronJob` is imported from `'cron'`. The sweep is gated by `WEATHER_RISK_ENABLED`. Each plot evaluation is wrapped in try/catch so one failure never kills the batch (mirrors `OutbreakScheduler`).

Notifying only on the HIGH state (combined with the fan-out's 24h dedup on `plotId`) gives transition-like behavior: a plot that's already HIGH was notified within the window and is deduped; a plot that newly turns HIGH has no recent WEATHER notification and fires.

- [ ] **Step 1: Implement the scheduler**

Create `apps/backend/src/modules/weather/weather.scheduler.ts`:

```typescript
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Severity } from '@prisma/client';
import { CronJob } from 'cron';

import type { Env } from '@/config/env.schema';
import { NotificationsFanoutService } from '@/modules/notifications/notifications.fanout.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { WeatherRiskService } from './weather-risk.service';
import { WeatherService } from './weather.service';

const JOB_NAME = 'weather-risk-sweep';

@Injectable()
export class WeatherScheduler implements OnModuleInit {
  private readonly logger = new Logger(WeatherScheduler.name);
  private readonly cronExpr: string;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly weather: WeatherService,
    private readonly risk: WeatherRiskService,
    private readonly fanout: NotificationsFanoutService,
    private readonly registry: SchedulerRegistry,
    config: ConfigService<Env, true>,
  ) {
    this.cronExpr = config.get('WEATHER_RISK_CRON', { infer: true });
    this.enabled = config.get('WEATHER_RISK_ENABLED', { infer: true });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Weather risk sweep disabled (WEATHER_RISK_ENABLED=false)');
      return;
    }
    const job = new CronJob(this.cronExpr, () => {
      void this.sweep();
    });
    this.registry.addCronJob(JOB_NAME, job as unknown as Parameters<SchedulerRegistry['addCronJob']>[1]);
    job.start();
    this.logger.log(`Weather risk sweep scheduled: ${this.cronExpr}`);
  }

  /** Evaluates every active plot's disease risk and fans out HIGH risk. */
  async sweep(): Promise<void> {
    const plots = await this.prisma.plot.findMany({
      where: { active: true, cropTypes: { isEmpty: false } },
    });
    this.logger.log(`Weather risk sweep: evaluating ${plots.length} plots`);

    for (const plot of plots) {
      try {
        const snapshot = await this.weather.getSnapshot(plot.latitude, plot.longitude);
        const result = this.risk.evaluate(plot.cropTypes, snapshot);
        if (result.level !== Severity.HIGH) continue;

        const top = result.topRisks[0];
        if (!top) continue;
        await this.fanout.handleWeatherRisk(plot, {
          disease: top.disease,
          crop: top.crop,
          reason: top.reason,
        });
      } catch (err) {
        this.logger.warn(`Weather risk eval failed for plot=${plot.id}: ${String(err)}`);
      }
    }
  }
}
```

- [ ] **Step 2: Register the scheduler + NotificationsModule in WeatherModule**

Update `apps/backend/src/modules/weather/weather.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PlotsModule } from '../plots/plots.module';
import { WeatherClient } from './clients/weather.client';
import { WeatherController } from './weather.controller';
import { WeatherRiskService } from './weather-risk.service';
import { WeatherScheduler } from './weather.scheduler';
import { WeatherService } from './weather.service';

@Module({
  imports: [PlotsModule, NotificationsModule],
  controllers: [WeatherController],
  providers: [WeatherClient, WeatherService, WeatherRiskService, WeatherScheduler],
  exports: [WeatherService, WeatherRiskService],
})
export class WeatherModule {}
```

`NotificationsModule` exports `NotificationsFanoutService` (verified). `PrismaService` and `SchedulerRegistry` are available globally (`PrismaModule` is global; `ScheduleModule.forRoot()` is registered in `AppModule`).

- [ ] **Step 3: Typecheck + boot**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

Start the backend and confirm the log line `Weather risk sweep scheduled: 0 */6 * * *` appears on boot.

- [ ] **Step 4: Manual sweep verification**

Temporarily set `WEATHER_RISK_CRON="*/1 * * * *"` (every minute) in `.env`, create an active plot with `cropTypes: ["Tomato"]` at coordinates currently experiencing high humidity + rain (or temporarily relax the profile thresholds), and confirm a `WEATHER` notification row is created for the owner within ~1 minute and is NOT duplicated on the next tick. Restore the cron afterward.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/weather/weather.scheduler.ts apps/backend/src/modules/weather/weather.module.ts
git commit -m "feat(backend): add weather risk cron sweep"
```

---

### Task 17: Expose `weatherAlerts` in the preferences DTO

**Files:**
- Modify: `apps/backend/src/modules/notifications/dto/update-preferences.dto.ts`

- [ ] **Step 1: Inspect the existing DTO**

Open `apps/backend/src/modules/notifications/dto/update-preferences.dto.ts`. It contains optional boolean fields for `outbreakAlerts`, `reportAlerts`, `severityEscalations`, `resolvedAlerts` (each `@IsOptional() @IsBoolean()`).

- [ ] **Step 2: Add `weatherAlerts`**

Add the field following the exact same decorator pattern as the sibling booleans:

```typescript
  @IsOptional()
  @IsBoolean()
  weatherAlerts?: boolean;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS. (`NotificationPreferencesService.update` upserts via `{ ...dto }` spread — verified — so the new optional field flows through with no service change.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/notifications/dto/update-preferences.dto.ts
git commit -m "feat(backend): allow toggling weather alerts in preferences"
```

---

### Task 18: Mobile — risk badge + plot weather/risk hook

**Files:**
- Modify: `apps/mobile/src/features/weather/api/weather.api.ts`
- Modify: `apps/mobile/src/features/weather/types.ts`
- Modify: `apps/mobile/src/features/weather/hooks/use-plot-weather.ts`
- Create: `apps/mobile/src/features/weather/components/risk-badge.tsx`

- [ ] **Step 1: Add risk types**

Append to `apps/mobile/src/features/weather/types.ts`:

```typescript
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CropRisk {
  crop: string;
  disease: string;
  level: RiskLevel;
  reason: string;
}

export interface PlotRisk {
  level: RiskLevel;
  topRisks: CropRisk[];
}

export interface PlotWeatherResponse {
  weather: WeatherSnapshot;
  risk: PlotRisk;
}
```

- [ ] **Step 2: Add the API method**

In `apps/mobile/src/features/weather/api/weather.api.ts`, extend imports and add `plotRisk`:

```typescript
import type { PlotWeatherResponse, WeatherCurrent, WeatherSnapshot } from '../types';
```

```typescript
  async plotRisk(plotId: string): Promise<PlotWeatherResponse> {
    const { data } = await apiClient.get<ApiResponse<PlotWeatherResponse>>(
      `/weather/plot/${plotId}`,
    );
    return data.data;
  },
```

- [ ] **Step 3: Rewrite usePlotWeather to fetch weather + risk**

Replace `apps/mobile/src/features/weather/hooks/use-plot-weather.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

import { weatherApi } from '../api/weather.api';

const STALE_MS = 15 * 60 * 1000;

/** Weather + computed disease risk for a single plot, keyed by plot id. */
export function usePlotWeather(plotId: string | undefined) {
  return useQuery({
    queryKey: ['weather', 'plot', plotId],
    queryFn: () => weatherApi.plotRisk(plotId as string),
    enabled: !!plotId,
    staleTime: STALE_MS,
    refetchIntervalInBackground: false,
  });
}
```

- [ ] **Step 4: Create the risk badge**

Create `apps/mobile/src/features/weather/components/risk-badge.tsx`. Reuse the app's existing `Chip` (`@/components/ui/chip`), whose `tone` accepts `'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'` (verified in `chip.tsx`):

```typescript
import { Chip } from '@/components/ui/chip';

import type { RiskLevel } from '../types';

const TONE: Record<RiskLevel, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

const LABEL: Record<RiskLevel, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Moderate risk',
  HIGH: 'High risk',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Chip label={LABEL[level]} tone={TONE[level]} />;
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/weather/
git commit -m "feat(mobile): add plot weather risk hook and badge"
```

---

### Task 19: Mobile — per-plot weather/risk card in the plot edit sheet

**Files:**
- Create: `apps/mobile/src/features/weather/components/plot-weather-card.tsx`
- Modify: `apps/mobile/src/features/weather/index.ts`
- Modify: `apps/mobile/src/features/plots/components/plot-form-sheet.tsx`

The card renders only in edit mode (a saved plot id is required for the `/weather/plot/:id` endpoint). It shows current weather, the risk badge, and the top risk's reason.

- [ ] **Step 1: Create the plot weather card**

Create `apps/mobile/src/features/weather/components/plot-weather-card.tsx`:

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Text, View } from '@/tw';

import { usePlotWeather } from '../hooks/use-plot-weather';
import { conditionLabel } from '../utils/condition';
import { RiskBadge } from './risk-badge';
import { WeatherIcon } from './weather-icon';

export function PlotWeatherCard({ plotId }: { plotId: string }) {
  const { data, isPending, isError } = usePlotWeather(plotId);

  if (isPending) return <Skeleton height={120} rounded="xl" />;
  if (isError || !data) {
    return (
      <View className="rounded-xl border border-border bg-surface p-3">
        <Text className="text-sm text-text-muted">Weather unavailable right now.</Text>
      </View>
    );
  }

  const { weather, risk } = data;
  const top = risk.topRisks[0];

  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <WeatherIcon condition={weather.current.condition} isDay={weather.current.isDay} size={26} />
          <Text className="text-base font-bold text-text">
            {Math.round(weather.current.tempC)}° · {conditionLabel(weather.current.condition)}
          </Text>
        </View>
        <RiskBadge level={risk.level} />
      </View>
      <Text className="text-xs text-text-muted">
        {`Humidity ${Math.round(weather.current.humidity)}% · Rain ${Math.round(weather.current.precipProbability)}%`}
      </Text>
      {top ? <Text className="text-xs text-text">{top.reason}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 2: Export from the barrel**

Add to `apps/mobile/src/features/weather/index.ts`:

```typescript
export { PlotWeatherCard } from './components/plot-weather-card';
```

- [ ] **Step 3: Wire into the plot edit sheet**

In `apps/mobile/src/features/plots/components/plot-form-sheet.tsx`:

Add the import near the other feature imports:

```typescript
import { PlotWeatherCard } from '@/features/weather';
```

Inside the `BottomSheetScrollView`, after the "Location" `Section` block and before the "Crops grown here" `Section`, add a weather section that only renders in edit mode:

```tsx
          {isEdit && plot ? (
            <Section label="Weather & risk">
              <PlotWeatherCard plotId={plot.id} />
            </Section>
          ) : null}
```

- [ ] **Step 4: Typecheck + bundle**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS.

Run the app, open an existing plot in the Profile tab's plot list, and confirm the "Weather & risk" section shows current weather + a risk badge.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/weather/ apps/mobile/src/features/plots/components/plot-form-sheet.tsx
git commit -m "feat(mobile): show per-plot weather and disease risk"
```

---

## Final Verification

- [ ] **Backend test suite**

Run: `pnpm --filter backend exec jest`
Expected: all suites pass (weather cache, client, risk, env schema + existing suites).

- [ ] **Backend typecheck + lint**

Run: `pnpm --filter backend exec tsc --noEmit`
Run: `pnpm --filter backend lint`
Expected: clean.

- [ ] **Mobile test suite + typecheck**

Run: `pnpm --filter mobile exec jest`
Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: clean (1 pre-existing cosmetic axios warning is acceptable).

- [ ] **End-to-end smoke**

1. Dashboard shows the weather card for current GPS location; denying permission shows the enable prompt.
2. `GET /weather/forecast?lat&lng` returns a 7-day forecast.
3. A plot with `cropTypes: ["Tomato"]` shows weather + a risk badge in its edit sheet.
4. With a short cron + favorable conditions, a `WEATHER` notification is delivered once (deduped on subsequent ticks) and appears in the in-app banner + notifications list.

---

## Notes for the Implementer

- **Open-Meteo is keyless** — no secret to configure. The base URL default works out of the box.
- **Provider isolation:** only `weather.client.ts` knows Open-Meteo's wire format. Everything downstream uses the normalized `WeatherSnapshot`.
- **Risk transitions:** notifying only on HIGH + the 24h `plotId` dedup approximates "transition into HIGH" without persisting prior state. If you later want true transition tracking, that's a follow-up (a `lastRiskLevel` column on `Plot`), explicitly out of scope here.
- **Expo SDK 56:** before touching mobile code, check the versioned docs at https://docs.expo.dev/versions/v56.0.0/ (per `apps/mobile/AGENTS.md`). `expo-location` and `lucide-react-native` are already installed — no new native deps are added by this plan.
- **No new persistence:** caching is in-memory. A weather history table is deliberately deferred (YAGNI, per the spec).
