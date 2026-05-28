# Demo Runbook

A practical guide for running the hackathon demo. Read this front-to-back the morning of, then keep it open on a second screen.

---

## 1. Pre-flight checklist (run 30 min before demo)

```bash
# 1. Pull latest + install
pnpm install

# 2. Verify backend env (Neon URL, Cloudinary creds, AI_PROVIDER, DEMO_MODE)
cat apps/backend/.env

# 3. Apply any new migrations
pnpm --filter backend exec prisma migrate deploy

# 4. Re-seed the demo data (idempotent — run as many times as you want)
pnpm --filter backend seed:demo

# 5. Smoke test
curl http://localhost:3000/health
curl http://localhost:3000/version
```

Expected:
- `/health` → `db: 'up'`
- `/version` → `demoMode: true`, `nodeEnv: 'development'`
- Seed log → `3 plots seeded`, `26 reports`, `5 notifications`, `3 outbreak zones`

---

## 2. Two demo accounts

Both accounts use the same OTP: `123456`

| Phone | Name | Role in demo |
|---|---|---|
| `9999999999` | Ramesh Patil (User A) | Primary farmer; has plots in Pune & Sangli, has historical notifications |
| `8888888888` | Sunita Kale (User B) | Secondary farmer; has a plot in Nashik. Used to demo the live notification fan-out |

---

## 3. The 90-second core flow (memorize this)

> **Goal:** open the app, show every major capability, end with a live realtime notification on a second device.

| # | What you do | What the audience sees |
|---|---|---|
| 1 | Open the app | Splash → onboarding-skipped users land on the dashboard immediately |
| 2 | Dashboard | Greeting, **3 active outbreaks**, real recent reports, "live" connection pill |
| 3 | Tap **Map** tab | Apple/Google Maps, **3 outbreak circles** (HIGH red Pune, MEDIUM amber Nashik, LOW green Sangli), ~25 markers, your plots highlighted |
| 4 | Tap **Pune Tomato outbreak zone** | Detail sheet: severity badge, 8-report stat grid, mini map preview, contributing reports, prevention guidance |
| 5 | Tap **Upload (FAB)** tab | Glass form with photo / crop / location / notes |
| 6 | Pick a Tomato photo, hit **Submit** | Compressing → Uploading 100% → Saving → navigates to result screen |
| 7 | Result screen | Scan-line animation → confidence ring sweeps to ~92%, "Tomato Late Blight, HIGH severity" + recommendations |
| 8 | Switch to second device (User B logged in) | **In-app banner slides in** with "High-severity report nearby", bell tab badge increments, Alerts feed updates |

Total time: 60–90s. Practice it once before showtime.

---

## 4. Demo extensions (use only if you have time)

### Offline resilience
1. With the app on the upload screen, toggle airplane mode
2. Submit a report → watch the **OfflineBanner** slide in from the top, status changes to "Queued"
3. Toggle airplane mode off → banner switches to "Syncing 1 upload…" → drains → "All synced"

### Realtime outbreak escalation
1. From a curl prompt, submit 3 more Tomato Late Blight reports near Pune
2. Watch the open detail sheet update live — `reportCount` ticks up, severity stays HIGH (already there), `outbreak.updated` event arrives over the socket

### Plot-based privacy story
1. Open **Profile** tab on User A → show "Pune North Tomato" + "Pune South Cotton" plots
2. Explain: notifications come from these plots, not GPS tracking. Privacy by design.

---

## 5. Curl cheat sheet (for live debugging)

```bash
# Token for User A
TOKEN=$(curl -sX POST http://localhost:3000/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9999999999"}' >/dev/null && \
  curl -sX POST http://localhost:3000/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9999999999","otp":"123456"}' | jq -r '.data.token')

# List active outbreaks
curl -s http://localhost:3000/outbreaks?active=true \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Submit a HIGH-severity report from User A near Pune (will trigger fan-out to User B's plot if you place it there)
curl -sX POST http://localhost:3000/reports \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clientId": "live-demo-1",
    "cropType": "Tomato",
    "imageUrl": "https://picsum.photos/seed/live-demo/640",
    "imagePublicId": "live-demo-1",
    "latitude": 19.997,
    "longitude": 73.789
  }' | jq

# User A notifications
curl -s http://localhost:3000/notifications \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items | map({type, title})'
```

Idempotency: every report has a `clientId`. Re-running the curl above returns the **same row**, no duplicates.

---

## 6. If something breaks during the demo

### Symptom → Fix

| Symptom | Quick fix |
|---|---|
| Map shows no outbreaks | `pnpm --filter backend seed:demo` (idempotent) |
| Backend returns 500 | Check Neon is awake — first request after idle takes ~5 s |
| In-app banner doesn't appear on User B | Make sure User B's app is open AND foregrounded; OS push only fires when backgrounded |
| Upload stuck on "uploading" | Cloudinary signature expired (5 min TTL) — re-tap submit; `clientId` makes this safe |
| `/health` shows `db: 'down'` | Neon went idle. First request usually wakes it. Wait 5 s and retry. |
| Mobile app crashes | The `AppErrorBoundary` shows "Something went wrong → Try again" instead of a white screen. Tap, continue. |

---

## 7. What to call out verbally during the demo

**Methodology talking points** (one slide before the live demo):
> "Five pillars: plot-anchored privacy, async-first AI, heuristic outbreak engine, realtime everywhere, resilient by default."

**During the upload flow**:
> "We compress on-device to keep uploads fast on rural networks, then go straight to Cloudinary using a server-signed signature so the API secret never leaves the server."

**During the result screen**:
> "The AI runs fire-and-forget on the backend — the upload returned in 50ms, and the result polls every 3 seconds. This is critical because the real model can take 25+ seconds."

**During the map**:
> "The outbreak engine runs a heuristic clustering rule: 5+ same-disease reports within 3 km in 24 hours create a zone. Severity escalates to HIGH at 20 reports OR 5 high-severity contributing reports. Resolution after 48 hours of silence."

**During the notification fan-out**:
> "Notifications target plots, not live GPS. We don't track farmers — we track their fields. Multi-plot ready, privacy by design."

**During the offline demo**:
> "Every report carries a client-side UUID. The server is idempotent — same UUID, same row. So our offline queue can retry as many times as it needs to without ever creating duplicates."

---

## 8. Pre-recorded fallback

If the live network is unreliable:
1. Have a screen recording of the 90-second flow ready
2. Open it in QuickTime / VLC at 1× speed
3. Narrate alongside the recording — same story, no risk

---

## 9. Build info to know

- **Backend:** http://localhost:3000
- **Mobile:** `pnpm --filter mobile dev` → scan QR with Expo Go (iOS) or build dev client (Android, needs Google Maps key)
- **DB:** Neon Postgres (production-grade, awakens on first hit after idle)
- **Image hosting:** Cloudinary (rotate creds before any public release)
- **AI:** mock provider (fast 0.5–0.8 s in DEMO_MODE; biased toward HIGH severity)

---

## 10. After the demo

```bash
# Reset to a clean demo state
pnpm --filter backend seed:demo
```

The seed is fully idempotent — run before every demo session.
