# Climb Performance Lab — Implementatieroadmap

Planmatige uitrol van verbeteringen (juli 2026). Volgorde volgt impact en afhankelijkheden: eerst betrouwbare data-import, daarna gekoppelde features.

## Fase 1 — Intervals-pariteit & sync-UX (huidige fase)

**Doel:** Eén consistent activiteitobject, ongeacht importroute (direct API of cloud), plus één duidelijke sync-flow in de Activity Log.

| # | Onderdeel | Status |
|---|-----------|--------|
| 1a | Cloud + direct via `normalizeIntervalsActivityFromAny()` | In uitvoering |
| 1b | Unified `IntervalsSyncPanel` (datumbereik, sportfilters, fetch vs. refresh selected) | In uitvoering |
| 1c | Toast-feedback i.p.v. `alert()` voor sync-resultaten | In uitvoering |
| 1d | Contract/integration tests sync-pijplijn | In uitvoering |

**Risico als we dit overslaan:** Kolommen kloppen maar waarden verschillen per sync-route; gebruikers weten niet welke knop ze moeten gebruiken.

---

## Fase 2 — Dashboard & training-keten

| # | Onderdeel |
|---|-----------|
| 2a | **Climbing readiness** op Dashboard (hoogtemeters, Z2, TSS, TSB → badge) |
| 2b | **Training-keten:** `TrainingGoalPlanner` → week-TSS in AI Coach → taper-waarschuwing in Recovery Advisor |
| 2c | **Activity → Profiler** one-click (“lijkt op Alpe d'Huez”) |

---

## Fase 3 — Race & bucket list

| # | Onderdeel |
|---|-----------|
| 3a | **Race Pacing → Fueling** workflow (fuelingplan uit raceprofiel) |
| 3b | **Bucket List + Map + Weather** (planned climbs + weerverwachting) |
| 3c | **Persoonlijke klim-PB's** per bucket-list-klim |

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

- **Intervals routes:** A = direct API + JS normalizer; B = cloud function + JS re-normalizer; C = nightly (Python → Firestore, zelfde contract als B).
- **UI-taal:** Engels voor alle user-facing strings.
- **Datums in UI:** `NlDateInput` (dd/mm/jjjj).
- Na elke fase: `npm run lint`, `npm run test:run`, PR naar `main`.
