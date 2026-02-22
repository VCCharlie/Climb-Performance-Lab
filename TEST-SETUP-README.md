# Test Setup — Climb Performance Lab

## Quick Start

```bash
# 1. Install test dependencies
npm install -D vitest @vitest/coverage-v8

# 2. Run tests (watch mode)
npm test

# 3. Run tests once (CI mode)
npm run test:run

# 4. Run with coverage report
npm run test:coverage
```

## What's Included

### 151 test cases across 6 files:

| File | Tests | What It Covers |
|------|-------|----------------|
| `calculations.test.js` | 35 | Power zones (Coggan), Bassett altitude correction, Ferrari W/kg, climb categories |
| `parsers.test.js` | 40 | `cleanNumber` (EU/US formats), CSV parsing (`;` and `,`), JSON import, type detection |
| `intervals.test.js` | 23 | Field fallbacks (15+ API key variants), sanity checks, work/kJ calc, distance/speed conversion |
| `formatters.test.js` | 21 | Date normalization (DD/MM/YYYY → ISO), time formatting, duration parsing |
| `dedup.test.js` | 16 | Same-activity detection, Strava/Intervals cross-source matching, false positive prevention |
| `analytics.test.js` | 16 | Rolling averages, linear trend lines, chart data enrichment |

### 4 fixture files:

- `sample-intervals-api.json` — 5 activities with different API field name variants + edge cases
- `sample-garmin-eu.csv` — EU format (semicolons, comma decimals)
- `sample-garmin-us.csv` — US format (commas, period decimals, quoted fields)
- `activities-with-duplicates.json` — 9 activities with known duplicate pairs + unique activities

## Files to merge into your repo

```
vitest.config.js          ← NEW (separate from vite.config.js)
package.json              ← UPDATED (added test scripts)
src/__tests__/
  utils/
    calculations.test.js
    parsers.test.js
    intervals.test.js
    formatters.test.js
    dedup.test.js
    analytics.test.js
  fixtures/
    sample-intervals-api.json
    sample-garmin-eu.csv
    sample-garmin-us.csv
    activities-with-duplicates.json
```

## Coverage Target

Starting thresholds are set to 60% (statements/functions/lines) and 50% (branches). Raise these as you add more tests. Run `npm run test:coverage` to see the HTML report in `coverage/`.

## Notes

- `vitest.config.js` is separate from `vite.config.js` so your build config stays clean
- All tests use fixtures from `src/__tests__/fixtures/` — no network calls needed
- The `duplicateDetection.js` file is not yet covered (it overlaps with `dedup.js` — consider consolidating)
