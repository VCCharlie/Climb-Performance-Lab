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
| **6C** | Dashboard | Jaar-kleur legend compare, YTD gravel vs road volume | Planned |
| **6D** | Bucket ↔ Profiler/Weather | Snellere flows; Done-klim PB vs DB-gradient | Planned |
| **6E** | Sync UX (breed) | Overige sync-status in DataHub | Planned |
| **6F** | Export | Done + PB CSV/JSON | Planned |

---

## Fase 4 — Physics & export

| # | Onderdeel |
|---|-----------|
| 4a | **Multi-climb dag-simulator** in Physics (Tour-stage-achtig) |
| 4b | **Uitgebreide .zwo-export** vanuit coach / bucket list |

---

## Fase 5 — Platform & kwaliteit

| # | Onderdeel |
|---|-----------|
| 5a | **Weather voor alle klimmen** (geocode uit `climbs.js`) |
| 5b | **Sync/component tests** (hooks rond DataHub) |
| 5c | **`App.jsx` opsplitsen** (providers) |
| 5d | Opruimen: dode `SettingsTab.jsx`, `DataHub/` vs `data-hub/` consolidatie |

---

## Technische notities

- **Bucket list schema:** `{ climbStatus: { id → status }, climbPbs: { id → pb } }` — migreert legacy `{ done[], planned[], want[] }`.
- **Bucket list sync:** localStorage (per browser) + **auto Firestore** (`settings/user_{uid}.bucketList`, debounced ~1.5s) wanneer ingelogd.
- **Race → Fueling:** `buildFuelingHandoff()` stuurt duration, IF, carbs/h, altitude door naar Fueling tab.
- **Training-keten:** `localStorage` key `cpl.trainingPlan.v1`.
- **UI-taal:** Engels voor user-facing strings.
- Na elke fase: `npm run lint`, `npm run test:run`, PR naar `main`.
