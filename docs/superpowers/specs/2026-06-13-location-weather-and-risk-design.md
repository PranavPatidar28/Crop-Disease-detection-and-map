# Location-Based Weather & Disease Risk — Design

> **Date:** 2026-06-13
> **Status:** Approved (brainstorming) — pending implementation plan
> **Feature area:** AgroRadar (NestJS backend + Expo mobile)

## Summary

Add location-based, real weather to AgroRadar and use it to drive crop-disease
risk advisories and alerts. Weather is displayed on the Home dashboard (current
GPS location) and per registered plot. A crop/disease-aware rule engine turns
the forecast into per-plot risk, and HIGH-risk transitions are delivered through
the existing notification stack (in-app banner + push).

The feature is built in **two phases inside this one spec**:

- **Phase 1 — Display:** weather module, Open-Meteo client, caching, display
  endpoints, dashboard weather card, per-plot weather card.
- **Phase 2 — Risk + Alerts:** crop/disease-aware risk engine, risk endpoints,
  `WEATHER` notification type, and a cron that evaluates active plots and fans
  out HIGH-risk transitions.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Role of weather | Display **and** disease-risk advisories/alerts |
| Provider | **Open-Meteo** (free, no API key, exposes humidity/precip/temp/soil) |
| Location anchoring | **Both** — current GPS on dashboard + per-plot (plots carry crop context) |
| Risk logic | **Crop/disease-aware rules** keyed on `disease-catalog.ts`, explainable, no ML |
| Alert delivery | **In-app + push** via existing `NotificationsFanoutService` + a cron; kept separate from the outbreak engine |
| Architecture | **Backend weather proxy + risk engine**; mobile stays provider-agnostic |
| Persistence | **None in v1** — in-memory caching only; history table deferred (YAGNI) |

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │  Open-Meteo API (free, no key)           │
                    │  /v1/forecast → current + hourly + daily │
                    └───────────────────┬─────────────────────┘
                                        │ (axios, short-TTL cache)
        ┌───────────────────────────────▼──────────────────────────┐
        │  Backend: modules/weather/                                 │
        │  • WeatherClient      → fetch + normalize Open-Meteo       │
        │  • WeatherService     → in-memory cache (geo-rounded key)  │
        │  • WeatherRiskService → forecast × crop disease profiles   │
        │  • WeatherController  → GET /weather/current, /forecast    │
        │  • WeatherScheduler   → @Cron: evaluate plots → fan-out    │
        └───────┬───────────────────────────────────┬───────────────┘
                │ (display endpoints)                │ (risk → existing
                │                                    │  NotificationsFanout)
        ┌───────▼────────────┐            ┌──────────▼──────────────┐
        │ Mobile             │            │ Notification (WEATHER)  │
        │ • Dashboard card   │            │ + push (Expo) + in-app  │
        │ • Plot detail card │            │   banner (all reused)   │
        └────────────────────┘            └─────────────────────────┘
```

**Principles carried from the existing codebase:**

- Backend owns external integrations; mobile stays provider-agnostic (matches
  the Cloudinary / AI client pattern).
- Env-driven config validated by Zod with sane defaults; no secrets required
  (Open-Meteo is keyless).
- Reuse `NotificationsFanoutService`, push, the 24h dedup window, and
  preferences — no new notification plumbing.
- No new persistence in v1; caching is in-memory.

## Data Flow

### Display flow (Phase 1)

1. Mobile requests `GET /weather/current?lat&lng` — lat/lng from
   `useUserLocation` for the dashboard, or `plot.latitude/longitude` for a plot.
2. `WeatherService` rounds coordinates to ~2 decimals (~1 km grid) to build a
   cache key and checks the in-memory cache (TTL ~15 min current, ~60 min
   forecast).
3. On miss, `WeatherClient` calls Open-Meteo `/v1/forecast` requesting the
   fields we need (`temperature_2m`, `relative_humidity_2m`, `precipitation`,
   `precipitation_probability`, `weather_code`, `wind_speed_10m`, plus `daily`
   min/max/precip), normalizes the raw response into our own DTO, caches it,
   and returns.
4. Mobile renders a clean typed shape — it never sees Open-Meteo's wire format.

### Normalized shape (provider-agnostic)

```
WeatherCurrent  { tempC, humidity, precipitationMm, precipProbability,
                  windKph, weatherCode, condition, isDay, observedAt }
WeatherDaily[]  { date, tMinC, tMaxC, precipitationMm, precipProbability,
                  humidityMean, weatherCode, condition }
WeatherSnapshot { location {lat,lng}, current, hourly?, daily[] }
```

`weatherCode` (WMO) maps to a small `condition` enum
(`clear | cloudy | rain | thunderstorm | fog | snow`) plus an icon key the
mobile side renders.

### Risk + alert flow (Phase 2)

1. `WeatherScheduler` (`@Cron`, configurable, default every 6h) walks active
   plots.
2. For each plot it fetches the forecast (cache-shared with display) and calls
   `WeatherRiskService` with the plot's `cropTypes`.
3. On a LOW/MEDIUM → HIGH transition, it calls a new
   `NotificationsFanoutService.handleWeatherRisk(plot, risk)`, which builds a
   `weatherRiskTemplate` and routes through `createForUsers` for the plot owner.
4. Dedup uses the existing 24h window keyed on `plotId + risk signature`, so a
   plot that stays HIGH does not re-notify every tick.

## Backend Module (`apps/backend/src/modules/weather/`)

**Phase 1:**

- `weather.module.ts` — wires controller + services; imports
  `NotificationsModule` (fan-out) and `PrismaModule` (read plots in the cron).
- `clients/weather.client.ts` — Open-Meteo HTTP + normalization. The single
  place that knows the provider. Timeout + typed failure
  (`TIMEOUT | UPSTREAM_ERROR | INVALID_RESPONSE`), mirroring `fastapi.client.ts`.
- `weather.service.ts` — caching facade (`getCurrent`, `getForecast`,
  `getSnapshot`).
- `weather.cache.ts` — tiny TTL map (geo-rounded key), size-capped, no external
  dependency.
- `dto/weather-query.dto.ts` — `lat`, `lng` validated and range-checked
  (class-validator).
- `weather.controller.ts` — `GET /weather/current`, `GET /weather/forecast`
  (Phase 1); `GET /weather/risk` + plot-scoped risk (Phase 2). All
  JWT-protected.

**Phase 2:**

- `weather-risk.profiles.ts` — favorable-condition profiles per crop+disease,
  derived from `disease-catalog.ts`, keyed by crop name to match plot
  `cropTypes`.
- `weather-risk.service.ts` — given a plot's `cropTypes` + a `WeatherSnapshot`,
  returns `{ level, factors[], topRisks: [{ crop, disease, level, reason }] }`.
- `weather.scheduler.ts` — `@Cron` (configurable). Per-plot try/catch; logs and
  continues on failure (mirrors `OutbreakScheduler`).
- `templates.ts` — `weatherRiskTemplate` (severity-aware copy).

## Risk Rules (Phase 2)

Each disease in `disease-catalog.ts` gets a favorable-conditions profile,
evaluated against the forecast window (next ~48–72h). Examples:

| Disease | Favorable conditions |
| --- | --- |
| Tomato / Potato Late Blight | humidity ≥ 85%, temp 10–24°C, rain expected |
| Tomato Early Blight | humidity ≥ 80%, temp 24–29°C, leaf-wetness / rain |
| Rice Blast | humidity ≥ 90%, temp 20–28°C, overcast |
| Grape Powdery Mildew | humidity 60–80%, temp 20–27°C, low rain (dry-warm) |
| Wheat Leaf Rust | humidity ≥ 70%, temp 15–22°C, dew / rain |

**Scoring:** each profile contributes a 0–3 score based on how many conditions
are met over how many forecast hours. Per plot, take the **max** risk across its
crops' diseases:

- **HIGH** — a disease's favorable window is strongly met (core conditions met
  over a sustained block).
- **MEDIUM** — partial match.
- **LOW** — no meaningful match.

Output per plot: `{ level, topRisks: [{ crop, disease, level, reason }] }`, where
`reason` is human copy, e.g. *"High humidity (88%) and warm temps favor Late
Blight over the next 2 days."* Profiles live in one file, are explainable, and
reuse disease names verbatim from the catalog so messaging stays consistent with
AI diagnosis results.

## Mobile Feature (`apps/mobile/src/features/weather/`)

- `api/weather.api.ts` — typed `getCurrent({lat,lng})`, `getForecast({lat,lng})`,
  `getPlotRisk(plotId)`.
- `hooks/use-current-weather.ts` — TanStack Query keyed by rounded lat/lng,
  `staleTime` ~15 min (matches backend cache); reuses `useUserLocation` on the
  dashboard.
- `hooks/use-plot-weather.ts` — weather + risk for one plot.
- `components/weather-card.tsx` — dashboard card: condition icon, temp, humidity,
  precip probability, compact 3-day strip. Glass styling consistent with
  existing dashboard cards; skeleton while loading; fail-soft "weather
  unavailable" state.
- `components/forecast-strip.tsx` — horizontal daily forecast.
- `components/weather-icon.tsx` — maps the `condition` enum to a lucide icon +
  tint.
- `components/risk-badge.tsx` (Phase 2) — LOW/MEDIUM/HIGH pill + reason, reusing
  the app's severity color language.
- `types.ts` — mirrors the backend normalized DTOs.

**Wiring:**

- Dashboard (`app/(app)/index.tsx`) — insert `<WeatherCard>` as a new animated
  section between `OutbreakSummary` and `QuickUploadCTA` (staggered `FadeInDown`).
  Uses current GPS location; if permission is denied the card shows a
  tap-to-enable prompt rather than disappearing.
- Plot detail / edit surface — per-plot weather + risk card using the plot's
  coordinates and crops.

## Error Handling & Resilience

- **Open-Meteo down / timeout:** `WeatherClient` returns a typed failure;
  controller responds `503` with the standard error envelope. Mobile shows a
  retry state — never crashes, never blocks the dashboard.
- **Stale-while-error:** if a refresh fails but a recent cached snapshot exists,
  serve the cached value rather than erroring.
- **Cron robustness:** each plot evaluation is wrapped in try/catch and logged;
  a single bad plot or provider blip never kills the sweep. Disable via
  `WEATHER_RISK_ENABLED=false`.
- **Rate-limit safety:** geo-rounded cache key means nearby plots/users share one
  upstream fetch; the cron reuses the same cache, keeping us under Open-Meteo's
  free limits.
- **Location permission denied:** dashboard card prompts to enable; plot weather
  always works (plots carry coordinates).
- **Dedup:** weather alerts dedup against the existing 24h window keyed on
  `plotId + risk signature`.

## Environment Variables (Zod, defaults — no secrets)

| Var | Default | Purpose |
| --- | --- | --- |
| `WEATHER_PROVIDER` | `openmeteo` | Provider swap point |
| `OPENMETEO_BASE_URL` | `https://api.open-meteo.com` | Upstream base URL |
| `WEATHER_CACHE_CURRENT_MINUTES` | `15` | Current-weather cache TTL |
| `WEATHER_CACHE_FORECAST_MINUTES` | `60` | Forecast cache TTL |
| `WEATHER_RISK_CRON` | every 6h | Risk evaluation schedule |
| `WEATHER_RISK_ENABLED` | `true` | Master switch for the risk cron |

## Testing

**Backend (Jest, `.spec.ts`):**

- `weather.client.spec.ts` — normalization of a sample Open-Meteo payload;
  failure mapping (timeout / upstream / invalid).
- `weather.cache.spec.ts` — TTL expiry, geo-rounding key collisions, size cap.
- `weather-risk.service.spec.ts` — profile matching: fabricated forecasts that
  should yield LOW/MEDIUM/HIGH per crop; max-across-crops logic.
- `env.schema.spec.ts` — extend with new weather env vars + defaults.

**Mobile (Jest, `*.test.ts`):**

- condition→icon mapping and a risk-reason formatter test.

**Manual verification:**

- `curl GET /weather/current` and `/forecast` against a real lat/lng.
- Seed a plot at favorable-condition coordinates; with a short dev cron + a test
  fixture forecast, confirm a `WEATHER` notification is emitted and deduped.

## File Summary

**Backend — new:**

- `modules/weather/weather.module.ts`
- `modules/weather/clients/weather.client.ts`
- `modules/weather/weather.service.ts`
- `modules/weather/weather.cache.ts`
- `modules/weather/weather.controller.ts`
- `modules/weather/dto/weather-query.dto.ts`
- `modules/weather/weather-risk.profiles.ts` (P2)
- `modules/weather/weather-risk.service.ts` (P2)
- `modules/weather/weather.scheduler.ts` (P2)
- `modules/weather/templates.ts` (P2)
- `*.spec.ts` for client, cache, risk

**Backend — edited:**

- `config/env.schema.ts` (+ weather vars), `config/env.schema.spec.ts`
- `app.module.ts` (register `WeatherModule`)
- `prisma/schema.prisma` (+ `WEATHER` on `NotificationType`) + migration
- `modules/notifications/notifications-fanout.service.ts` (+ `handleWeatherRisk`)

**Mobile — new:** `features/weather/` (api, hooks, components, types).

**Mobile — edited:** `app/(app)/index.tsx` (+ `WeatherCard`), plot detail surface
(+ per-plot weather / risk card).

## Out of Scope (YAGNI)

- Weather history persistence (`WeatherSnapshot` table) and trend charts.
- A weather layer on the map.
- Severe-weather (storm / frost) alerts beyond disease risk.
- Feeding weather into the outbreak detection engine.
