# Backend — AgroRadar API

NestJS API with Prisma + Postgres (Neon), Socket.IO, and pino logging.

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL with your Neon connection string

pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

## Scripts

- `pnpm dev` — start in watch mode
- `pnpm build` — compile TypeScript to `dist/`
- `pnpm start:prod` — run compiled output
- `pnpm prisma:generate` — generate Prisma Client
- `pnpm prisma:migrate` — apply migrations in dev mode
- `pnpm prisma:studio` — open Prisma Studio
- `pnpm lint`, `pnpm typecheck`
- `pnpm upload:crop-images` — one-time: upload the repo-root `crop-images/` photos to
  Cloudinary and write `src/scripts/data/crop-image-manifest.json` (+ the mobile
  `crop-image-urls.json`). Requires `CLOUDINARY_*` env vars.
- `pnpm seed:demo` — seed the Bhopal-region demo data (users, reports, outbreak zones).

### Demo data setup

Run once, in order, to get reports whose images match their crop and disease:

```bash
pnpm --filter backend upload:crop-images   # needs CLOUDINARY_* creds
pnpm --filter backend seed:demo            # needs DATABASE_URL
```

If `upload:crop-images` hasn't been run, `seed:demo` still works — it falls back
to placeholder images until the manifest exists.

## Endpoints

| Method | Path     | Description                          |
| ------ | -------- | ------------------------------------ |
| GET    | /health  | Liveness + DB connectivity check     |

Socket.IO is exposed on the same origin (default `ws://localhost:3000`).

## Folder structure

```
src/
├── common/         # filters, interceptors, decorators, guards
├── config/         # Zod env validation + config module
├── modules/
│   ├── prisma/     # PrismaService (lifecycle + healthCheck)
│   ├── health/     # GET /health
│   ├── users/      # UsersService scaffold
│   ├── auth/       # auth scaffold (JWT strategy stub)
│   └── realtime/   # Socket.IO gateway
├── types/
├── app.module.ts
└── main.ts
```
