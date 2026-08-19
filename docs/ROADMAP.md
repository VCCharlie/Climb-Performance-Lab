# Climb Performance Lab — Implementatieroadmap

Planmatige uitrol van verbeteringen (juli 2026). Volgorde volgt impact en afhankelijkheden: eerst betrouwbare data-import, daarna gekoppelde features.

## Fase 1 — Intervals-pariteit & sync-UX ✅

**Doel:** Eén consistent activiteitobject, ongeacht importroute (direct API of cloud), plus één duidelijke sync-flow in de Activity Log.

| # | Onderdeel | Status |
|---|-----------|--------|
| 1a | Cloud + direct via `normalizeIntervalsActivityFromAny()` | Done |
| 1b | Unified `IntervalsSyncPanel` (datumbereik, sportfilters, fetch vs. refresh selected) | Done |
| 1c | Toast-feedback i.p.v. `alert()` voor sync-resultaten | Done |
| 1d | Contract/integration tests sync-pijplijn | Done |

---

## Fase 2 — Dashboard & training-keten ✅

| # | Onderdeel | Status |
|---|-----------|--------|
| 2a | **Climbing readiness** op Dashboard (`ClimbingReadinessCard` + `climbingReadiness.js`) | Done |
| 2b | **Training-keten:** Goal Planner → week-TSS in AI Coach → taper-waarschuwing in Recovery | Done |
| 2c | **Activity → Profiler** label “Similar to [climb]” | Done |

---

## Fase 3 — Race & bucket list ✅

| # | Onderdeel | Status |
|---|-----------|--------|
| 3a | **Race Pacing → Fueling** (`raceFuelingHandoff.js`, carbs/h + altitude) | Done |
| 3b | **Bucket List + Map + Weather** (schema-fix, planned panel, weather link) | Done |
| 3c | **Persoonlijke klim-PB's** (`climbPersonalBests.js`, scan uit activities) | Done |

---

## Fase 6 — Product backlog (juli 2026)

Grote thema’s uit gebruikersfeedback; uitrol in deel-fases (A–F).

| Fase | Thema | Onderdelen | Status |
|------|--------|------------|--------|
| **6A** | PB-trust & sync-UX | “Why this PB”, Remove PB, filter PB not Done, bulk Mark PB as Done, sync-statusregel, “Saved to cloud” na scan | Done (PR #388) |
| **6B** | Activity Log | Filter presets, MTB-icoon, filter-by-bike van rij, EBike-chip | Done (PR) |
| **6C** | Dashboard | Jaar-kleur legend compare, YTD gravel vs road volume | Done (PR) |
| **6D** | Bucket ↔ Profiler/Weather | Snellere flows; Done-klim PB vs DB-gradient | Done (PR) |
| **6E** | Sync UX (breed) | Overige sync-status in DataHub | Done (PR) |
| **6F** | Export | Done + PB CSV/JSON | Done (PR) |

---

## Strategische audit — rollout (aug 2026)

Parallel aan de product-fases hierboven loopt een UX/design rollout:

| Fase | Thema | Status |
|------|--------|--------|
| **Audit 1** | Quick wins (CSV weg, sync-toasts, a11y tabpanels) | Done |
| **Audit 2** | Daily Home, ride insights, sync-pariteit, import-guard | Done |
| **Audit 3** | Design system: `SubTabNav`, `cd*` tokens, DataHub-consolidatie | Done |
| **Audit 3B** | Mobile Activity Log filters + desktop 4-hub nav | Done |
| **Audit 3C** | Filters & Bulk typography (dense chips) | Done (PR #503) |
| **Audit 3D** | `yellow-400` → `cd*` token sweep (DataHub) | Done (PR #504) |
| **Audit 3E** | `yellow-400` → `cd*` token sweep (Physics, Race, Bucket) | Done (PR #505) |
| **Audit 3F** | `yellow-400` → `cd*` token sweep (Gear, Map, Dashboard, Coach, Settings) | Done (PR #506) |
| **Hotfix** | Activity Detail peak power curve (`cdprimary` alpha) | Done (PR #508) |
| **Later** | Training calendar / decoupling engine | → Fase 8 (ROADMAP) |

---

## Fase 4 — Physics & export

| # | Onderdeel | Status |
|---|-----------|--------|
| 4a | **Multi-climb dag-simulator** in Physics (Tour-stage-achtig) | Done (`PhysicsStagePanel`) |
| 4b | **Uitgebreide .zwo-export** vanuit coach / bucket list | Done (PR #507) |

---

## Fase 5 — Platform & kwaliteit

| # | Onderdeel | Status |
|---|-----------|--------|
| 5a | **Weather voor alle klimmen** (geocode uit `climbs.js`) | Done (PR #509) |
| 5b | **Sync/component tests** (hooks rond DataHub) | Done (PR #510) |
| 5c | **`App.jsx` opsplitsen** (providers) | Done (`AppProviders`, `AppShellHelpers`) |
| 5d | Opruimen: dode `SettingsTab.jsx`, `DataHub/` vs `data-hub/` consolidatie | Done |

---

## Fase 7 — Performance (Bolt plan)

Zie `.jules/bolt-plan.md` voor detail. Veel is al gedaan (lazy tabs, virtualized log, `ActivitiesProvider`).

| Fase | Thema | Status |
|------|--------|--------|
| Bolt 1 | Quick wins (memo, cleanup) | Partial (lazy tabs, heatmap, Header memo al live) |
| Bolt 2 | Data hot paths (climb match scope, power cache, filter vóór enrich) | Done (incl. 2.6 map clustering) |
| Bolt 3 | Bundle (lazy climbs DB, manualChunks, Leaflet lazy) | Done |
| Bolt 4 | Advanced (workers, prefetch, IndexedDB climb cache) | Done |

---

## Fase 8 — Training calendar (backlog)

| # | Onderdeel | Status |
|---|-----------|--------|
| 8a | Week-plan kalenderweergave (Coach week → calendar UI) | Done |
| 8b | Aerobic decoupling engine (HR drift / decoupling metrics) | Backlog |

---

## Technische notities

- **Bucket list schema:** `{ climbStatus: { id → status }, climbPbs: { id → pb } }` — migreert legacy `{ done[], planned[], want[] }`.
- **Bucket list sync:** localStorage (per browser) + **auto Firestore** (`settings/user_{uid}.bucketList`, debounced ~1.5s) wanneer ingelogd.
- **Race → Fueling:** `buildFuelingHandoff()` stuurt duration, IF, carbs/h, altitude door naar Fueling tab.
- **Training-keten:** `localStorage` key `cpl.trainingPlan.v1`.
- **UI-taal:** Engels voor user-facing strings.
- Na elke fase: `npm run lint`, `npm run test:run`, PR naar `main`.
