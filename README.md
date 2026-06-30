# AgroRadar

A monorepo containing the mobile app and backend services for AgroRadar — a crop disease detection and outbreak mapping platform.

Farmers photograph an ailing crop; AgroRadar diagnoses the disease, places the report on a shared live map, and warns nearby farmers when an outbreak is forming around their fields.

## Features

- **AI disease detection** — snap a leaf photo, pick the crop, and get a diagnosis with confidence, severity, and treatment recommendations. The backend routes to a real model service (FastAPI / Hugging Face) or a deterministic mock, processing reports asynchronously so the upload returns instantly.
- **On-device fallback (offline AI)** — a bundled MobileNetV3 TFLite classifier (139 `crop::disease` classes, ~1.2 MB) runs fully on-device when the cloud is unreachable, so a diagnosis is always available even with no signal. Requires a native dev build (not Expo Go).
- **Realtime outbreak map** — all successful reports stream onto a shared map over Socket.IO, clustered by location with a severity heatmap. An outbreak engine groups same-disease reports within a radius into zones, escalates their severity as reports accumulate, and auto-resolves stale zones.
- **Plot-based alerts** — farmers register their fields; when an outbreak forms or escalates near a plot, they get an in-app banner and an Expo push notification (deduped, preference-aware).
- **Offline-first** — uploads queue locally and drain with idempotent retries when connectivity returns; the map and queries hydrate from a persisted cache on cold boot.
- **OTP auth** — phone + OTP login issuing a 7-day JWT; every route is protected by default.

## Stack

**Mobile (`apps/mobile`)**

- Expo + Expo Router (TypeScript)
- NativeWind v5 (Tailwind v4) via `react-native-css`
- Zustand (client state) + TanStack Query (server state)
- Axios (HTTP) + Socket.IO client
- @gorhom/bottom-sheet, expo-secure-store, expo-haptics

**Backend (`apps/backend`)**

- NestJS (TypeScript)
- Prisma ORM + PostgreSQL (Neon)
- Socket.IO via `@nestjs/websockets`
- nestjs-pino (structured logging)
- Zod env validation, helmet, compression, CORS, global validation pipe

**Tooling**

- pnpm workspaces + Turborepo
- TypeScript strict mode shared via `tsconfig.base.json`
- ESLint + Prettier

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)
- A Neon PostgreSQL database

## Quick start

```bash
# 1. Install all dependencies
pnpm install

# 2. Configure environment
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
# Edit apps/backend/.env and set DATABASE_URL (Neon connection string)

# 3. Run the initial database migration
pnpm --filter backend prisma:migrate

# 4. Start everything
pnpm dev
```

The backend runs on `http://localhost:3000` and Expo on its default Metro port.

## Workspace scripts

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Run dev mode for all apps in parallel            |
| `pnpm build`       | Build all apps                                   |
| `pnpm lint`        | Lint all apps                                    |
| `pnpm typecheck`   | Type-check all apps                              |
| `pnpm format`      | Format the entire repo with Prettier             |
| `pnpm clean`       | Remove build artifacts and node_modules          |

Run a script for one app only:

```bash
pnpm --filter mobile dev
pnpm --filter backend start:dev
```

## Folder structure

```
.
├── apps/
│   ├── mobile/      # Expo app
│   └── backend/     # NestJS API
├── package.json     # workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

See each app's README for details.

## Documentation

- [`apps/backend/README.md`](apps/backend/README.md) — backend setup, modules, and API surface
- [`apps/mobile/README.md`](apps/mobile/README.md) — mobile app structure and conventions
- [`PROGRESS.md`](PROGRESS.md) — living build log: per-version detail, end-to-end behavior, and known tech debt
- [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) — demo flow, two-account setup, and a curl cheat sheet
- [`docs/GEO_MAPPING_FLOW.md`](docs/GEO_MAPPING_FLOW.md) — how reports cluster into outbreak zones
- [`docs/METHODOLOGY_WORKFLOW.md`](docs/METHODOLOGY_WORKFLOW.md) — end-to-end methodology and workflow
