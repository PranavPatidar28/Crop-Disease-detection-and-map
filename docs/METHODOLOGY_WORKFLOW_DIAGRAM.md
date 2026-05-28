# Methodology + Implementation Workflow — Combined Diagram

A single horizontal Mermaid diagram that captures the methodology pillars, the recurring build loop, and the eight-phase implementation workflow — all connected so the audience sees how the methodology drives the implementation.

Paste into [mermaid.live](https://mermaid.live), export as PNG/SVG, drop into your slide.

---

## Combined horizontal diagram

```mermaid
flowchart LR
  %% ============== METHODOLOGY PILLARS ==============
  subgraph METHOD[" 🎯 Methodology — five pillars "]
    direction TB
    M1[🔒 Plot-anchored<br/>privacy-first]
    M2[⚡ Async-first AI<br/>fire-and-forget]
    M3[🧮 Heuristic engine<br/>swappable to ML]
    M4[📡 Realtime<br/>per-user rooms]
    M5[🛡️ Resilient<br/>by default]
  end

  %% ============== BUILD LOOP ==============
  subgraph LOOP[" 🔁 Disciplined build loop — every version "]
    direction TB
    L1[1. SCOPE<br/>read spec<br/>surface tradeoffs<br/>user picks]
    L2[2. PLAN<br/>phased checklist<br/>decisions logged]
    L3[3. BUILD<br/>backend → mobile<br/>type-safe E2E]
    L4[4. VERIFY<br/>curl smoke<br/>typecheck + lint<br/>expo bundle]
    L5[5. DOCUMENT<br/>PROGRESS.md<br/>+ decisions log]
    L1 --> L2 --> L3 --> L4 --> L5
    L5 -.next.-> L1
  end

  %% ============== IMPLEMENTATION PHASES ==============
  subgraph IMPL[" 🛠️ Implementation workflow — 8 versions "]
    direction LR

    subgraph V1G["v1 · Foundation"]
      direction TB
      V1d[Monorepo · NestJS · Prisma · Neon<br/>Expo SDK 56 · NativeWind v5<br/>8 reusable UI primitives<br/>Socket.IO scaffold]
      V1g[✓ /health db:up<br/>✓ 8 components render]
      V1d --> V1g
    end

    subgraph V2G["v2 · Auth"]
      direction TB
      V2d[Mock OTP DB-backed TTL'd<br/>passport-jwt · Global guard<br/>Zustand auth store<br/>Glass login + OTP screens]
      V2g[✓ 7 curl tests<br/>✓ JWT round-trip]
      V2d --> V2g
    end

    subgraph V3G["v3 · Dashboard"]
      direction TB
      V3d[5-tab nav · FAB upload<br/>Glass tab bar<br/>Reusable cards · Skeleton<br/>Pull-to-refresh]
      V3g[✓ 6.6 MB bundle<br/>✓ 3 826 modules]
      V3d --> V3g
    end

    subgraph V4G["v4 · Upload"]
      direction TB
      V4d[Cloudinary signed direct upload<br/>Compression ≤1600px JPEG q=0.7<br/>GPS + map picker · 25 crops<br/>Offline queue with backoff]
      V4g[✓ 5 backend curls<br/>✓ Bundle 6.9 MB]
      V4d --> V4g
    end

    subgraph V5G["v5 · AI"]
      direction TB
      V5d[Provider abstraction env-flag<br/>Mock + FastAPI clients<br/>Fire-and-forget processor<br/>SVG ring · Scan-line UI]
      V5g[✓ Pending → Success 3.5 s<br/>✓ Reprocess works]
      V5d --> V5g
    end

    subgraph V6G["v6 · Map"]
      direction TB
      V6d[react-native-maps · Supercluster<br/>Severity heatmap · WS live<br/>Filter sheet<br/>Detail sheet reuse]
      V6g[✓ Realtime live<br/>✓ Cluster + heatmap]
      V6d --> V6g
    end

    subgraph V7G["v7 · Outbreak"]
      direction TB
      V7d[OutbreakProcessor<br/>Running-avg centroid<br/>Cron deactivation<br/>4 lifecycle events]
      V7g[✓ 11 reports → 1 zone<br/>✓ HIGH severity]
      V7d --> V7g
    end

    subgraph V8G["v8 · Notifications"]
      direction TB
      V8d[Plot model + CRUD<br/>Per-user socket rooms<br/>NotificationsFanout · Expo push<br/>In-app banners · Onboarding]
      V8g[✓ 2-user fan-out<br/>✓ Bundle 7.2 MB]
      V8d --> V8g
    end

    V1G --> V2G --> V3G --> V4G --> V5G --> V6G --> V7G --> V8G
  end

  %% ============== METHODOLOGY → BUILD LOOP → IMPLEMENTATION ==============
  METHOD ==drives==> LOOP
  LOOP ==governs==> IMPL

  %% Specific pillar → version emphasis arrows
  M1 -.-> V8G
  M2 -.-> V5G
  M3 -.-> V7G
  M4 -.-> V6G
  M5 -.-> V4G

  %% ============== STYLES ==============
  classDef pillar fill:#dcfce7,stroke:#10b981,stroke-width:3px,color:#0b1220,font-weight:bold
  classDef loop fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#0b1220,font-weight:bold
  classDef detail fill:#f1f5f9,stroke:#cbd5e1,color:#0b1220
  classDef gate fill:#fef3c7,stroke:#f59e0b,color:#0b1220,font-style:italic

  class M1,M2,M3,M4,M5 pillar
  class L1,L2,L3,L4,L5 loop
  class V1d,V2d,V3d,V4d,V5d,V6d,V7d,V8d detail
  class V1g,V2g,V3g,V4g,V5g,V6g,V7g,V8g gate

  style METHOD fill:#f0fdf4,stroke:#10b981,stroke-width:3px
  style LOOP fill:#eff6ff,stroke:#3b82f6,stroke-width:3px
  style IMPL fill:#fafafa,stroke:#64748b,stroke-width:3px
  style V1G fill:#10b981,stroke:#047857,color:#fff
  style V2G fill:#10b981,stroke:#047857,color:#fff
  style V3G fill:#10b981,stroke:#047857,color:#fff
  style V4G fill:#10b981,stroke:#047857,color:#fff
  style V5G fill:#10b981,stroke:#047857,color:#fff
  style V6G fill:#10b981,stroke:#047857,color:#fff
  style V7G fill:#10b981,stroke:#047857,color:#fff
  style V8G fill:#10b981,stroke:#047857,color:#fff
```

---

## Reading the diagram

**Left to right flow** (the horizontal narrative):
1. **Methodology** — the five pillars set the design principles
2. **Build loop** — every version is governed by the same disciplined 5-step process
3. **Implementation** — eight versions executed in order, each with its scope and verification gate

**The thick double arrows (`==>`)** show the top-level flow: methodology drives the loop, which governs implementation.

**The dotted arrows (`-.->`)** from pillars to specific versions show which methodology principle most embodies that phase:
- Plot-anchored → v8 Notifications
- Async AI → v5 AI
- Heuristic engine → v7 Outbreak
- Realtime → v6 Map
- Resilient → v4 Upload (offline queue)

---

## Slide presentation tips

- **Aspect ratio:** horizontal layout fits 16:9 slides cleanly. Export at 2× or 3× density for crisp text on projectors.
- **Splitting if needed:** if the full diagram is too wide, the eight versions naturally split into two halves (v1–v4 foundation + features, v5–v8 intelligence + delivery) on consecutive slides while keeping the methodology + loop as a header band.
- **Color legend** (small caption under the diagram on your slide):
  - 🟢 Green — methodology pillars / version titles
  - 🔵 Blue — build loop steps
  - ⚪ Gray — version scope
  - 🟡 Amber — verification gates
- **Talking track** (left to right):
  > "We anchored the system on five methodology pillars. Every version went through the same disciplined five-step loop — scope, plan, build, verify, document. We executed eight versions in order, each with its own scope and verification gate. The dotted arrows show which pillar drove which version most directly."

---

## Compact alternative (if the full one is too dense for one slide)

```mermaid
flowchart LR
  subgraph M[Methodology]
    direction TB
    M1[Plot-anchored]
    M2[Async AI]
    M3[Heuristic engine]
    M4[Realtime]
    M5[Resilient]
  end

  subgraph L[Build loop]
    direction TB
    L1[Scope] --> L2[Plan] --> L3[Build] --> L4[Verify] --> L5[Document]
    L5 -.-> L1
  end

  subgraph W[Implementation Workflow]
    direction LR
    W1[v1<br/>Foundation] --> W2[v2<br/>Auth] --> W3[v3<br/>Dashboard] --> W4[v4<br/>Upload]
    W4 --> W5[v5<br/>AI] --> W6[v6<br/>Map] --> W7[v7<br/>Outbreak] --> W8[v8<br/>Notifications]
  end

  M ==drives==> L
  L ==governs==> W

  classDef m fill:#dcfce7,stroke:#10b981,stroke-width:2px,color:#0b1220
  classDef l fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#0b1220
  classDef w fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,font-weight:bold
  class M1,M2,M3,M4,M5 m
  class L1,L2,L3,L4,L5 l
  class W1,W2,W3,W4,W5,W6,W7,W8 w
```
