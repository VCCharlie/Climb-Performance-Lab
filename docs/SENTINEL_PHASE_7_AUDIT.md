# Sentinel Phase 7 — Full security audit report

**Date:** 2026-07-08  
**Auditor:** Cursor Cloud Agent (automated + code review)  
**Scope:** Phases 1–4.2 deployed; Phase 4.3 / 5 deferred by owner  
**Production:** https://vccharlie.github.io/Climb-Performance-Lab/

---

## Executive summary

Sentinel hardening **Phases 1–4.2 are complete** in code and production (owner confirmed Cloud Run deploy revision `sync-intervals-00017-9sn`, Firestore rules pasted in Console).

| Area | Result |
|------|--------|
| Client logging / ErrorBoundary | ✅ Improved |
| Secrets stripped from Firestore writes | ✅ |
| CSP enforced | ✅ |
| Logout + SignInGate + bare signed-out shell | ✅ |
| Firestore rules (auth-only) | ✅ deployed |
| Cloud sync auth (Firebase ID token + automation secret) | ✅ deployed |
| **Overall** | **Accept with documented residual risks** |

---

## 7.1 Automated checks (2026-07-08)

| Check | Command | Result |
|-------|---------|--------|
| Production build | `npm run build` | ✅ Pass |
| Firestore rules tests | `npm run test:rules` | ✅ 6/6 pass |
| Unit tests | `npm run test:run` | ⚠️ **444 pass / 3 fail** (pre-existing, see below) |
| Lint (`src/`) | `npx eslint src/` | ⚠️ Pre-existing warnings/errors (not Sentinel regressions) |
| Dependency audit | `npm audit` | ⚠️ 19 advisories — mostly **dev** tooling (`firebase-tools`, eslint chain) |

### Pre-existing test failures (not blocking Sentinel)

| Test | File |
|------|------|
| `haversineDistance` date-line edge case | `calculations.test.js` |
| `stravaGearEnrich` detail-fetch mock | `stravaGearEnrich.test.js` |
| `calendarElapsedRatio` at period start | `volumeGoals.test.js` |

### npm audit note

Runtime browser bundle is **not** affected by most CVEs (grpc-js, firebase-tools, etc.). Track under **Phase 6** — run `npm audit fix` on a maintenance PR; avoid `--force` without review.

---

## 7.2 Manual smoke checklist (owner)

Complete in the live app and tick when done. Automated checks cannot replace these.

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Google **sign-in** → dashboard loads with your data | ✅ | Owner confirmed 2026-08-21 |
| 2 | **Sign-out** → bare landing (logo + sign-in only, no tabs/time range) | ✅ | PR #282 |
| 3 | Sign-in again → **volume goals** still correct (no zero wipe) | ✅ | |
| 4 | **Settings** save + hard refresh → values persist | ✅ | |
| 5 | **JSON backup** export → import round-trip | ✅ | |
| 6 | **Intervals sync** (cloud, signed in, no local API key) | ✅ | Phase 4.2 |
| 7 | **Intervals sync** signed out → blocked / sign-in prompt | ✅ | |
| 8 | **Strava** connect + enrich one activity | ✅ | |
| 9 | **Nightly Intervals Sync** GitHub Action → green | ✅ | |
| 10 | DevTools **Console**: no CSP violations in normal use | ✅ | |
| 11 | DevTools **Console**: no raw API keys during save/sync | ✅ | `safeLog` / redaction |

---

## 7.3 Configuration review (owner / browser)

| Item | Where to verify | Status |
|------|-----------------|--------|
| Firestore rules match `firestore.rules` | [Firebase Console → Rules](https://console.firebase.google.com/project/climb-performance-lab/firestore/rules) | ✅ Owner confirmed paste |
| Firebase API key **HTTP referrer** restrictions | [GCP Credentials](https://console.cloud.google.com/apis/credentials?project=climb-performance-lab) | ✅ Restrict to GitHub Pages + localhost |
| Cloud Run `sync-intervals` auth live | Revision `00017+` with `auth_gate.py` | ✅ Owner deploy 2026-07-08 |
| `AUTOMATION_SHARED_SECRET` aligned | Cloud Run env + GitHub Actions secret | ✅ |
| GitHub `FIREBASE_SERVICE_ACCOUNT` valid | Nightly sync + rules deploy workflows | ✅ |

### Quick cloud-function auth test (optional)

Signed out (expect **401**):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://sync-intervals-97555677694.europe-west1.run.app \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2026-01-01","end_date":"2026-01-07"}'
```

Expected: `401`

---

## 7.4 Residual risk register

See also `.jules/sentinel.md` (journal + register).

| ID | Risk | Severity | Disposition | Notes |
|----|------|----------|-------------|-------|
| R1 | **Tailwind CDN** + `'unsafe-inline'` in CSP | Medium | **Accepted** | Supply-chain trust in cdn.tailwindcss.com; bundling is Phase 6 initiative |
| R2 | **OAuth tokens / API keys in localStorage** | High (XSS) | **Accepted** | Mitigated: not in Firestore; SignInGate; explicit logout wipe; Phase 5 optional |
| R3 | **Firebase Web API key** in `firebase.js` fallback | Low | **Accepted** | Public client id; mitigate via GCP referrer restrictions |
| R4 | **`activities` collection** — any signed-in user RW | Low | **Accepted** | Single-owner app; multi-tenant needs `ownerId` + rules change |
| R5 | **Firebase App Check** not enabled | Low | **Open (deferred)** | Phase 4.3 — reduces API key abuse |
| R6 | **Strava PKCE / backend token exchange** | Medium | **Open (deferred)** | Phase 5 — best practice for OAuth |
| R7 | **npm audit** dev dependency CVEs | Low | **Open (Phase 6)** | `npm audit fix` on maintenance cadence |
| R8 | **Session expiry** without explicit sign-out keeps local keys | Low | **Accepted** | Documented in Phase 4.0.1; Firestore rules block cloud reads |
| R9 | Cloud Run **edge** still `allow-unauthenticated` | Low | **Accepted** | App-layer auth in `auth_gate.py`; standard for Firebase token verification |
| R10 | Backup JSON contains **plaintext secrets** if exported | Medium | **Accepted** | User-controlled file; document in Settings |

---

## 7.5 What improved (Sentinel 1–4.2)

- Central secret redaction in logs (`safeLog.js`)
- Production ErrorBoundary hides stack traces
- ESLint noopener rule for external links
- Fetch timeouts on external APIs
- OAuth tokens no longer written to Firestore
- Backup schema validation
- CSP report-only → **enforce**
- Logout session wipe + SignInGate + bare signed-out UI
- Firestore rules: auth-only `settings` + `activities`
- Cloud Intervals sync: Firebase ID token + nightly automation secret
- CORS whitelist on cloud function (no `*`)

---

## 7.6 Owner sign-off

When manual smoke (§7.2) and configuration (§7.3) are complete, reply on the closing PR or issue:

> **Sentinel complete — accepted residual risks**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Owner | VCCharlie | 2026-08-21 | Accepted residual risks R1–R10 |

---

## Related

- Master plan: `.jules/sentinel-plan.md`
- Critical learnings journal: `.jules/sentinel.md`
- Firestore deploy: `docs/FIRESTORE_RULES.md`
- Cloud auth setup: `docs/CLOUD_FUNCTION_AUTH.md`
