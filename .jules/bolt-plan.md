# ⚡ Bolt Master Plan — Climb Performance Lab

> **Status:** Draft v1 — 2026-07-09  
> **Baseline gemeten:** `npm run build` → **één chunk** `index-*.js` = **2.97 MB** (724 KB gzip). Geen `React.lazy`, geen `manualChunks`.  
> **Journal:** Zie `.jules/bolt.md` voor codebase-specifieke learnings.

---

## Meetstrategie (vóór en na elke fase)

| Meting | Commando / methode | Doel |
|--------|-------------------|------|
| Bundle size | `npm run build` → noteer `dist/assets/index-*.js` (raw + gzip) | First-load impact |
| Lint | `npm run lint` | Geen regressies in `src/` |
| Tests | `npm run test:run` | Utility-logica intact |
| Runtime (handmatig) | Chrome DevTools → Performance, record bij: tab-wissel, zoeken in Activity Log, Power sub-tab openen | Main-thread blocking |
| Firestore sync | Open app, wacht op snapshot, tel re-renders (React DevTools Profiler) | Re-render cascade |

**Verwachte totale winst na alle fasen (conservatief):**
- First load: **−50% tot −70%** initial JS (van ~725 KB gzip naar ~200–350 KB)
- DataHub mount met 1500+ activiteiten: **−40%** compute tijd op climb-matching
- Power-tab open: **−60%** tijd tot interactief (anchor-cache)
- Shell re-renders bij Firestore sync: **−30%** (memo + context)

---

## Wat al goed is (niet opnieuw bouwen)

- `@tanstack/react-virtual` in `ActivityTable` / `ActivityCardList` (drempel 60 rijen)
- `React.memo` + custom equality op table rows
- `useActivityFilter` met Bolt-optimalisaties (regex ISO-dates, hoisted `searchLower`, metrics alleen bij filter)
- Firestore listener met `startTransition` in `App.jsx`
- Dashboard datumfilter via ISO-string vergelijking
- `Math.max(...spread)` grotendeels vervangen door `reduce`
- Main tabs **conditioneel gemount** (geen verborgen render van alle tabs tegelijk)
- `dashboardVolumeTotals.js` single-pass aggregatie

---

## Fase 0 — Baseline & governance (optioneel, ~0 code-impact)

**Doel:** Reproduceerbare metingen en PR-ritme vastleggen.

| # | Taak | Bestanden | Impact |
|---|------|-----------|--------|
| 0.1 | Baseline snapshot in dit document bijwerken na elke gemergde fase | `.jules/bolt-plan.md` | Traceerbaarheid |
| 0.2 | PR-template: What / Why / Impact / Measurement | `.github/` (indien gewenst) | Consistente reviews |

**PR:** `⚡ Bolt Phase 0: Performance baseline` (alleen docs, optioneel)

---

## Fase 1 — Quick wins (runtime + kleine bundle)

**Doel:** Lage risico, < 200 regels totaal, meetbaar binnen één PR.  
**Geschatte impact:** Shell re-renders −20–30%; Overview charts iets vloeiender; ~15–30 KB gzip kleiner (framer-motion).

| # | Optimalisatie | Locatie | Probleem | Fix | Verwachte winst |
|---|---------------|---------|----------|-----|-----------------|
| 1.1 | Verwijder ongebruikte dependency | `package.json` | `framer-motion` niet geïmporteerd in `src/` | Dependency verwijderen | Kleinere install + marginale bundle |
| 1.2 | Verwijder dode code | `DataHub/ActivityLogTab.jsx`, `FetchIntervalsPanel`, `SyncPanel` | Niet geïmporteerd / vervangen door `IntervalsSyncPanel` | Bestanden verwijderd (5d) | — |
| 1.3 | Memo chart series | `PerformanceModule.jsx` L226, L271–272, L468 | `new Date()` + dubbele `filter` + inline `.map` elke render | `useMemo` voor `axisTicks`, `indoor/outdoor` split, `chartSeries` | Minder GC bij Overview met 200+ punten |
| 1.4 | Heatmap max | `ActivityHeatmap.jsx` L48 | `Math.max(...Object.values())` | Single-pass `reduce` | Micro; consistent met journal |
| 1.5 | Shell memo | `Header.jsx`, `shell/MainNav.jsx` | Re-render bij elke `activities` sync | `React.memo` | Minder werk buiten actieve tab |
| 1.6 | Stabiele handlers | `DataHub.jsx` L131+ | `handleFindOnStrava` etc. nieuwe ref per render | `useCallback` | Consistentie voor gememoized children |
| 1.7 | `allVisibleSelected` | `DataHub.jsx` L321–322 | O(n) `.every()` elke render | Verplaats naar `useMemo` | Micro bij grote selecties |

**PR:** `⚡ Bolt Phase 1: Quick wins (memo, useMemo, cleanup)`  
**Afhankelijkheden:** 1.1 vereist expliciete goedkeuring (package.json wijziging).  
**Tests:** `npm run lint` + `npm run test:run`

---

## Fase 2 — Data hot paths (grootste runtime-winst)

**Doel:** Main-thread blocking bij grote activity-logs en zware dashboard-subtabs.  
**Geschatte impact:** DataHub −30–50% mount-tijd; Power-tab −50–70% compute.

| # | Optimalisatie | Locatie | Probleem | Fix | Verwachte winst |
|---|---------------|---------|----------|-----|-----------------|
| 2.1 | Climb-match scope | `useDataHubLogDerivations` | Match over all filtered / collapsed rows | Expanded groups only; skip on Import tab | **Hoog** bij grouped log |
| 2.2 | Power anchor cache | `powerDurationTable.js`, `PowerDurationTable.jsx` | 7× `powerCurveWithSources` ≈ 147×N werk | Cache `buildAnchorsForActivity` per `activity.id`; één pass voor overlappende windows | **Hoog** op Power sub-tab |
| 2.3 | Filter vóór enrich | `Dashboard.jsx` | Distance tab enriched full history | Raw activities + window filter (Power tab still needs full enrich) | Medium |
| 2.4 | Gedeelde bucket aggregatie | `OverviewTab.jsx`, `BarChartCard.jsx` | 4× aparte O(n) passes | Eén `useMemo` builder, 4 metrics uit één loop | Medium op Overview |
| 2.5 | ISO-dates in filters | `useActivityFilter.js` L182–188, `AICoach.jsx` L40–43 | `new Date()` in filter loops | String bounds + `normalizeDate` (journal patroon) | Medium bij zoeken/filter |
| 2.6 | ClimbMap clustering | `ClimbMap.jsx` L186–218 | Duizenden `L.marker` zonder clustering | `leaflet.markercluster` of grid-simplificatie | **Hoog** op Map-tab (nieuwe dep → goedkeuring) |
| 2.7 | FormTab dag-loop | `FormTab.jsx` L39–50 | `while (current <= end)` over hele ALL-range | Sparse TSS-map; beperk tot gefilterde periode | Medium bij multi-year ALL |

**PR-strategie:** Eén PR `Phase 2a` (2.1–2.3) en één `Phase 2b` (2.4–2.7), of alles in één PR als review-capaciteit het toelaat (~400–600 regels).

**Tests:** Bestaande utils-tests + handmatig: 1500 activiteiten, open DataHub + Power tab, meet Performance tab.

---

## Fase 3 — Bundle & architectuur (first load)

**Doel:** Van monolith (2.97 MB) naar geladen-wat-je-gebruikt.  
**Dit is de grootste winst voor nieuwe bezoekers en mobiel.**

| # | Optimalisatie | Locatie | Probleem | Fix | Verwachte winst |
|---|---------------|---------|----------|-----|-----------------|
| 3.1 | **Lazy climb database** | `climbs.js`, `climbs_extended.js` (1.6 MB source), `App.jsx` L6 | Extended DB altijd in main chunk | Dynamic `import()`; metadata-chunk + full DB bij Map/Bucket/Profiler | **−40–60%** initial JS (grootste enkele win) |
| 3.2 | Lazy main tabs | `App.jsx` L18–38 | Alle 10+ tabs static import | `React.lazy` + `Suspense` per tab | **−25–40%** initial JS |
| 3.3 | Lazy dashboard sub-tabs | `Dashboard.jsx` L9–13 | Recharts via Power/Form/Volume eager | Lazy `PowerTab`, `FormTab`, `VolumeTotalsTab` | Recharts pas bij sub-tab |
| 3.4 | Lazy Leaflet | `ClimbMap.jsx`, `RacePacingMap.jsx`, `StravaMap.jsx` | Leaflet in main bundle | `import()` bij tab-mount | ~100–150 KB gzip |
| 3.5 | `manualChunks` | `vite.config.js` | Eén vendor blob | Chunks: `firebase`, `recharts`, `leaflet`, `vendor` | Betere cache-hit-rate |
| 3.6 | Activities context | `App.jsx` | Elke sync re-rendert hele tree | `ActivitiesProvider` + selector hooks | Minder cascade |
| 3.7 | DataHub splits | `DataHub.jsx` (~2163 regels) | Monolith | Extract sync shell, filter bar (deels al in subdirs) | Onderhoud + smallere render scope |

**Aanbevolen PR-volgorde (niet alles tegelijk):**
1. `Phase 3a`: 3.1 lazy climbs_extended (hoogste ROI, risico: flash of empty state)
2. `Phase 3b`: 3.2 + 3.3 tab lazy loading
3. `Phase 3c`: 3.4 + 3.5 Leaflet + manualChunks
4. `Phase 3d`: 3.6 + 3.7 architectuur (optioneel, hoger risico)

**PWA-opmerking:** `workbox.maximumFileSizeToCacheInBytes: 4MB` dekt huidige chunk; na splitsing meerdere kleinere precache entries — controleren na 3b.

---

## Fase 4 — Geavanceerd (alleen indien nodig)

| # | Optimalisatie | Wanneer |
|---|---------------|---------|
| 4.1 | Web Worker voor climb matching | Als 2.1 niet genoeg is op 5000+ activiteiten |
| 4.2 | Incremental `enhanceActivity` cache | Als 2.3 + Firestore sync nog steeds zwaar |
| 4.3 | Service Worker chunk prefetch | Na 3.x: prefetch volgende tab op hover nav |
| 4.4 | IndexedDB voor climb index | Als 3.1 lazy load te traag voelt op Map open |

---

## PR-ritme (aanbevolen)

```
main
 ├── cursor/bolt-phase-1-quick-wins-2207      (1 PR)
 ├── cursor/bolt-phase-2a-data-paths-2207       (1 PR)
 ├── cursor/bolt-phase-2b-data-paths-2207       (1 PR, optioneel combineren met 2a)
 ├── cursor/bolt-phase-3a-lazy-climbs-2207      (1 PR) ← grootste first-load win
 ├── cursor/bolt-phase-3b-lazy-tabs-2207        (1 PR)
 ├── cursor/bolt-phase-3c-chunks-leaflet-2207   (1 PR)
 └── cursor/bolt-phase-3d-context-split-2207    (1 PR, optioneel)
```

**Niet doen:** Losse micro-PRs per `useMemo` — bundel per fase zoals hierboven.

**Wel doen:** Elke PR bevat What / Why / Impact / Measurement (Bolt-formaat).

---

## Risico's & aandachtspunten

| Risico | Mitigatie |
|--------|-----------|
| Lazy climbs → lege ClimbSelector bij eerste paint | Loading state + prefetch na login |
| `React.lazy` + base path `/Climb-Performance-Lab/` | Test dev + production build paths |
| package.json wijzigingen (framer-motion, markercluster) | **Altijd eerst vragen** |
| PWA precache groeit met chunks | Na 3b: `globPatterns` / chunk sizes reviewen |
| Firebase + lazy tabs | Firebase blijft in main of eigen chunk; auth flow testen |

---

## Volgende stap

Start met **Fase 1** (laag risico, direct meetbaar) tenzij first-load de pijn is → dan **Fase 3a** eerst.

*Bijgewerkt door Bolt ⚡ — meet eerst, optimaliseer daarna.*
