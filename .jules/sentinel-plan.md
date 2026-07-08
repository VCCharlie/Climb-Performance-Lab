# 🛡️ Sentinel Security Roadmap — Climb Performance Lab

**Status:** Living document — master plan for phased security hardening  
**Last audit:** 2026-07-07  
**Progress:** Phase 0–4.1 ✅ · Phase 4.2 in repo (merge + GHA deploy pending) · Phase 4.3–7 pending  
**Scope:** Client SPA (`src/`), PWA (`index.html`, Workbox), Cloud Function (`cloud-function/`), CI (`.github/workflows/`)  
**Constraint (owner):** No changes that risk locking the owner out of Firebase/Google OAuth or existing cloud data without an explicit backup + rollback plan.

---

## Executive summary

Climb Performance Lab is a **client-side SPA** with Firebase sync, direct Intervals.icu API calls, Strava OAuth, and an optional Cloud Function proxy. Several Sentinel fixes are already merged (XSS in `FlagIcon`, OAuth `state` CSRF, CORS whitelist, console redaction for some secrets, `rel="noopener noreferrer"` on most external links).

Remaining risk clusters:

| Cluster | Severity | Primary risk |
|---------|----------|--------------|
| Secrets in Firestore / localStorage | **High** | OAuth tokens & API keys exposed to cloud DB, backups, XSS |
| Unauthenticated Cloud Function | **High** | Credential relay / abuse as open proxy |
| No Content Security Policy | **High** | Supply-chain via Tailwind CDN + third-party scripts |
| Backup import without validation | **Medium** | Malformed or malicious JSON corrupts app state |
| ErrorBoundary info disclosure | **Medium** | Component stacks visible to end users |
| Production debug logging | **Low–Medium** | Sync metadata in browser console |

This plan addresses them in **six phases**, smallest/safest first. Each phase is a discrete PR series tagged `sentinel/phase-N-*`.

---

## Guiding principles

1. **Defense in depth** — multiple layers; no single point of failure.
2. **Fail securely** — errors must not leak credentials or internals.
3. **Data access is sacred** — auth, Firestore paths, OAuth, and backup restore require migration + rollback before merge.
4. **< 50 lines per PR** where possible — keeps review focused; large phases split into multiple PRs.
5. **Verify every phase** — `npm run lint`, `npm run test:run`, `npm run build`; manual smoke on Settings → Sync → Activities.

---

## Phase 0 — Baseline & inventory (no app behaviour changes)

**Goal:** Establish measurable baseline before touching production behaviour.

| Task | Deliverable |
|------|-------------|
| Document current secret surfaces | Table below (done in this doc) |
| Run `npm audit` and record CVEs | Issue checklist in Phase 6 |
| Export Firestore `settings` sample (owner) | Confirm whether `strava.access_token` exists in cloud |
| Confirm GCP API key restrictions | Firebase console: HTTP referrer lock to GitHub Pages + localhost |
| Add CI secret-scan (optional) | `gitleaks` or GitHub secret scanning — repo settings |

### Secret surface map (current)

| Location | Fields | Encrypted? | Synced to Firestore? |
|----------|--------|------------|----------------------|
| `localStorage.intervalsConfig` | `apiKey`, `athleteId` | No | `apiKey` stripped on save; `athleteId` yes |
| `localStorage.stravaConfig` | `client_secret`, `access_token`, `refresh_token` | No | **Phase 2:** tokens stripped from new Firestore writes |
| `localStorage.userSettings` | `githubPat`, `openweatherApiKey` | No | Stripped on save |
| Backup JSON export | All of the above in plaintext | No | N/A (user file) |
| `src/firebase.js` | Firebase Web API key fallback | Public client id | N/A |

**Known gap (resolved Phase 2):** OAuth tokens no longer written to Firestore on save; local tokens preserved on merge.

**Remaining gap (High):** Firestore rules in production may still be permissive until Phase 4.1 deploy (rules file is in repo; owner must deploy).

---

## Phase 1 — Safe client hardening (no auth / Firestore rule changes)

**Risk to data access:** None — these changes do not alter login, OAuth redirect, or Firestore read paths.

### 1.1 Central log sanitizer (`src/utils/safeLog.js`)

- Export `redactSecrets(obj, fields)` and `devLog(...args)`.
- Replace ad-hoc redaction in `App.jsx` with shared utility.
- Gate verbose sync logs (`useIntervalsSync`, `DataHub`) behind `import.meta.env.DEV`.
- **PR:** `🛡️ Sentinel Phase 1.1: centralize secret redaction in logs`
- **Lines:** ~40

### 1.2 ErrorBoundary production mode (`src/components/ErrorBoundary.jsx`)

- In production (`import.meta.env.PROD`): hide `componentStack`; show generic English message + reload button.
- Keep full details in `console.error` only.
- Translate remaining Dutch UI strings to English (same PR).
- **PR:** `🛡️ Sentinel Phase 1.2: reduce ErrorBoundary info disclosure`
- **Lines:** ~25

### 1.3 ESLint guard for external links

- Add `eslint-plugin-react` rule or custom script: `target="_blank"` must have `rel` containing `noopener`.
- Audit shows all JSX links compliant; rule prevents regression.
- **PR:** `🛡️ Sentinel Phase 1.3: lint rule for noopener on external links`
- **Lines:** ~15 config

### 1.4 Fetch timeout consistency

- `useIntervalsSync` already has 30s timeout; apply same `fetchWithTimeout` pattern to `manualActivityImport.js` and `intervalsService.js` (DoS / hung tab mitigation).
- **PR:** `🛡️ Sentinel Phase 1.4: add fetch timeouts to external API calls`
- **Lines:** ~35

**Phase 1 exit criteria:** Lint clean in `src/`, tests pass, no change to Settings save/load behaviour.

---

## Phase 2 — Secret handling in cloud sync (⚠️ requires backup)

**Risk to data access:** Medium — incorrect merge logic could clear Strava tokens on cross-device sync.

### Pre-requisites (owner actions)

1. **Export full backup** via Settings → Export JSON before any Phase 2 merge.
2. **Screenshot** Strava connection status in Settings.
3. **Optional:** copy `localStorage` keys (`stravaConfig`, `intervalsConfig`) from DevTools.

### 2.1 Stop writing OAuth tokens to Firestore

```javascript
// Target shape for safeStrava on save:
const safeStrava = {
  client_id: stravaConfig.client_id || '',
  athlete_id: stravaConfig.athlete_id || null,
  athlete_name: stravaConfig.athlete_name || null,
  expires_at: stravaConfig.expires_at || null,
  // NEVER: client_secret, access_token, refresh_token
};
```

- **PR:** `🛡️ Sentinel Phase 2.1: strip OAuth tokens from Firestore writes`
- **Lines:** ~20 in `App.jsx`

### 2.2 Safe merge on Firestore load

When `data.strava` arrives from cloud:

1. Merge **non-secret** fields from cloud (`client_id`, `athlete_id`, `athlete_name`).
2. **Preserve** `access_token`, `refresh_token`, `client_secret` from existing `localStorage` if cloud omits them.
3. Never overwrite local tokens with empty strings from cloud.

- **PR:** `🛡️ Sentinel Phase 2.2: safe Strava config merge on Firestore load`
- **Lines:** ~35
- **Test:** Unit test in `src/__tests__/utils/stravaConfigMerge.test.js`

### 2.3 One-time Firestore token cleanup (owner-triggered)

- Add Settings → "Security" subsection: **"Remove stored tokens from cloud"** button.
- Writes stripped `strava` document via existing `saveSettingsToCloud` path.
- Does **not** clear local tokens.
- **PR:** `🛡️ Sentinel Phase 2.3: optional cloud token cleanup action`
- **Lines:** ~45 (UI + handler)

### 2.4 Backup export/import hardening

| Change | Rationale |
|--------|-----------|
| Export: add `"_security_notice"` field warning about plaintext secrets | User awareness |
| Import: max file size 10 MB | DoS |
| Import: schema validation (allowed top-level keys only) | Prototype pollution / unexpected keys |
| Import: confirm dialog listing what will be overwritten | Mistake prevention |

- **PRs:** 2.4a export notice, 2.4b import validator (`src/utils/backupSchema.js`)
- **Lines:** ~50 each

**Phase 2 exit criteria:** Strava still connects after save + reload; tokens absent from new Firestore writes; backup round-trip works.

---

## Phase 3 — Content Security Policy & supply chain

**Risk to data access:** Low — CSP misconfiguration can break Tailwind CDN or Google Fonts; test in preview deploy first.

### 3.1 CSP meta tag (report-only first) ✅

Add to `index.html` (report-only mode):

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://intervals.icu https://www.strava.com https://api.openweathermap.org; img-src 'self' data: https:; frame-ancestors 'none';
```

- Monitor console for violations for one release cycle.
- **PR:** `🛡️ Sentinel Phase 3.1: CSP report-only` — merged; owner soak confirmed (no CSP violations in console).

### 3.2 Enforce CSP ✅

- Switch to enforcing `Content-Security-Policy` after violations resolved.
- `frame-ancestors 'none'` in CSP covers clickjacking protection (meta `X-Frame-Options` not available on GitHub Pages).
- **Google Sign-In hosts required in CSP:** `script-src` → `apis.google.com`, `www.gstatic.com`; `frame-src` → `accounts.google.com`, `*.google.com`, `*.firebaseapp.com`; `form-action` → `accounts.google.com` (without these, `signInWithPopup` fails with `auth/internal-error`).
- **PR:** `🛡️ Sentinel Phase 3.2: enforce CSP`

### 3.3 Subresource Integrity (interim)

- Add `integrity` + `crossorigin` to Google Fonts link if hashes stable.
- Tailwind CDN script cannot use SRI (dynamic) — long-term fix is Phase 6 bundle.
- **Status:** Optional — defer until Phase 6 Tailwind bundle (Google may rotate font CSS hashes).

**Phase 3 exit criteria:** ✅ App renders on GitHub Pages; CSP enforced; login + sync flows work.

---

## Phase 4 — Firebase & backend authorization (⚠️ owner review required)

**Do not merge Phase 4.1+ without:** Firestore rules copy in repo, rules simulator tests, and owner sign-off.

### 4.0 Logout session wipe (client) ✅

**Problem:** `signOut()` only cleared Firebase Auth; activities, settings, and Strava/Intervals data remained visible from React state + `localStorage`, and Firestore `onSnapshot` ran while signed out.

**Fix:**

| Change | File(s) |
|--------|---------|
| `clearSensitiveLocalStorage()` + default state factories | `src/utils/sessionData.js` |
| On auth `null`: wipe local storage + reset React state | `src/App.jsx` |
| Firestore settings/activities listeners only when `user` | `src/App.jsx` |
| `SignInGate` — “Sign in to view your data” when signed out | `src/components/SignInGate.jsx` |
| Hide weight/FTP chips in header when signed out | `src/components/Header.jsx` |
| Persist sensitive keys to `localStorage` only when signed in | `src/App.jsx` |
| Defer `volumeGoals` Firestore sync until cloud settings hydrated | `src/App.jsx` |
| `mergeVolumeGoalsPreservingNonZero` — avoid zero cloud wipe on login | `src/utils/volumeGoals.js` |

**Preserved on logout:** `theme`, PWA install dismiss flag.

**Cloud data:** untouched — sign-in reloads from Firestore.

**Risk to data access:** Low — local wipe only; no cloud deletes.

- **PR:** `🛡️ Sentinel Phase 4.0: logout session wipe + sign-in gate`
- **Tests:** `src/__tests__/utils/sessionData.test.js`

### 4.0.1 Refine local wipe trigger (bugfix — does not weaken cloud security)

**Problem:** Phase 4.0 wiped `localStorage` on *every* Firebase `onAuthStateChanged(null)` — including the initial page load before auth restores, and when the user was never signed in. That deleted API keys on every hard refresh (regression).

**Refinement (PR #277):**

| Behaviour | Phase 4.0 (original) | Phase 4.0.1 |
|-----------|----------------------|-------------|
| Wipe local secrets | Any auth `null` | **Explicit Sign out only** (`markExplicitSignOut` → `logout()`) |
| Persist keys to `localStorage` | Only when signed in | **Always** (keys never written to Firestore anyway) |
| SignInGate / Firestore listeners | Signed-in only | **Unchanged** |
| Secrets in Firestore | Stripped (Phase 2) | **Unchanged** |

**Accepted trade-off:** If a session expires *without* clicking Sign out, local API keys may remain in `localStorage` on that browser. Mitigations: SignInGate still hides activities; Firestore rules block cloud reads; explicit Sign out still wipes. Phase 5 (sessionStorage) remains optional.

**Still NOT undone:** OAuth tokens in cloud, CSP, Cloud Function auth, backup validation, console redaction.

### 4.1 Firestore security rules audit

Expected model:

```
settings/{docId}  →  request.auth != null && docId == 'user_' + request.auth.uid
activities/{id}   →  authenticated read/write (single-owner shared log today)
```

| Deliverable | Status |
|-------------|--------|
| `firestore.rules` in repo | ✅ |
| `firebase.json` + emulator config | ✅ |
| Rules unit tests (`npm run test:rules`) | ✅ |
| Deploy guide `docs/FIRESTORE_RULES.md` | ✅ |
| **Owner deploy** to Firebase Console | ✅ owner (manual paste) |

- **PR:** `🛡️ Sentinel Phase 4.1: Firestore rules + tests`
- **Deploy:** Owner only — see `docs/FIRESTORE_RULES.md` (backup + rollback steps)

### 4.2 Cloud Function authentication

`cloud-function/main.py` was deployed `--allow-unauthenticated` and accepted `api_key` in POST body.

**Implemented (Option A + automation secret):**

| Caller | Auth |
|--------|------|
| Browser | Firebase ID token in `Authorization` header |
| Nightly sync | `X-Automation-Secret` + GitHub secret `AUTOMATION_SHARED_SECRET` |

| Deliverable | Status |
|-------------|--------|
| `cloud-function/auth_gate.py` | ✅ |
| Client `intervalsCloudApi.js` sends ID token | ✅ |
| `nightlySync.js` + workflow secret | ✅ |
| `docs/CLOUD_FUNCTION_AUTH.md` | ✅ |
| **Owner redeploy** Cloud Run `sync-intervals` | ⏳ pending |

- **PR:** `🛡️ Sentinel Phase 4.2: authenticate cloud function requests`

### 4.3 Firebase App Check (optional)

- Enable App Check with reCAPTCHA Enterprise for web.
- Reduces abuse of public Firebase API key.
- **Not blocking** — schedule after rules audit.

**Phase 4 exit criteria:** Unauthenticated users cannot read/write others' `settings` or `activities`; cloud function rejects unsigned requests.

---

## Phase 5 — localStorage threat model (longer term)

**Context:** All API keys and OAuth tokens in `localStorage` are readable by any XSS or malicious browser extension. Phase 1–2 reduce **persistence** and **cloud** exposure; Phase 5 reduces **local** exposure.

| Approach | Effort | Notes |
|----------|--------|-------|
| Move tokens to `sessionStorage` | Low | Cleared on tab close; worse UX for PWA |
| Web Crypto encrypt secrets with user-derived key | High | Key still in JS — limited benefit |
| Strava PKCE + backend token exchange | High | Needs small backend; best practice |
| Intervals.icu: cloud function only, no client apiKey | Medium | Already partially supported |

**Recommendation:** Document in README; implement sessionStorage for `access_token` only after Phase 2 stable. **No PR without explicit owner approval.**

---

## Phase 6 — Dependencies & maintenance

| Task | Command / action |
|------|------------------|
| npm audit fix (non-breaking) | `npm audit fix` |
| Pin Tailwind to bundled build | Remove CDN; use PostCSS — large diff, separate initiative |
| Dependabot / Renovate | Enable on repo |
| Quarterly Sentinel re-scan | Re-run Phase 7 checklist |

---

## Phase 7 — Post-completion full audit (final gate)

**When:** After Phases 1–6 are merged/deployed and owner confirms normal daily use for one release cycle.

**Goal:** Confirm nothing regressed; capture residual risks; decide if further hardening is worth the UX cost.

### 7.1 Automated checks

```bash
npm run lint
npm run test:run
npm run test:rules
npm run build
npm audit
```

### 7.2 Manual security smoke (owner)

| Flow | Pass? |
|------|-------|
| Google sign-in / sign-out → SignInGate hides data | |
| Settings save + reload | |
| JSON backup export → import round-trip | |
| Intervals sync (direct or cloud fallback) | |
| Strava connect + enrich | |
| Training volume goals persist after logout/login | |
| DevTools Console: no CSP violations in normal use | |
| DevTools Console: no secrets in logs during save/sync | |

### 7.3 Configuration review

| Item | Action |
|------|--------|
| Firestore rules in production match `firestore.rules` | Firebase Console → Rules |
| GCP Firebase API key referrer restrictions | GCP Console |
| Cloud Function CORS + auth (Phase 4.2) | curl / app test |
| GitHub Actions secrets still valid | nightly sync workflow |

### 7.4 Deliverable

- Update `.jules/sentinel.md` with **residual risk register** (accepted vs open).
- Short **Sentinel completion report** in issue/PR: what improved, what remains (e.g. Tailwind CDN, localStorage tokens).
- Owner sign-off comment: *"Sentinel complete — accepted residual risks"* or list follow-ups.

**Phase 7 exit criteria:** All smoke tests pass; residual risks documented; owner explicit OK.

---

## PR sequencing (recommended order)

```
Phase 0  →  (documentation only — this file)
Phase 1  →  1.1 → 1.2 → 1.3 → 1.4   (4 small PRs, any order except 1.1 first)
Phase 2  →  2.1 → 2.2 → 2.3 → 2.4a → 2.4b   (strict order; backup before 2.1)
Phase 3  →  3.1 → (soak) → 3.2 → 3.3
Phase 4  →  4.0 → 4.1 (deploy) → 4.2 → 4.3
Phase 5  →  owner decision
Phase 6  →  ongoing
Phase 7  →  after 1–6 complete (full re-audit + owner sign-off)
```

---

## Out of scope (explicitly deferred)

| Item | Reason |
|------|--------|
| Removing Firebase API key fallback from `firebase.js` | Breaks GitHub Pages deploy without `VITE_FIREBASE_API_KEY` secret — already mitigated via GCP referrer restrictions |
| Changing Google Sign-In flow | Owner lockout risk |
| Encrypting Firestore at rest | Google-managed; not app-level |
| Multi-user tenancy / RBAC | Single-user app today |

---

## Verification checklist (every Sentinel PR)

```bash
npm run lint      # src/ must stay clean
npm run test:run  # add tests when touching utils
npm run build     # production bundle must succeed
```

Manual smoke:

1. Settings opens and saves
2. Intervals sync returns activities
3. Strava connect / refresh still works (after Phase 2: test cross-tab)
4. Backup export → import round-trip
5. No secrets in browser console during save (DevTools → Console)

---

## Related files

| Area | Files |
|------|-------|
| Cloud save/load | `src/App.jsx` (`saveSettingsToCloud`, `loadSettings`) |
| Strava OAuth | `src/hooks/useStravaAuth.js` |
| Intervals sync | `src/hooks/useIntervalsSync.js`, `src/services/intervalsService.js` |
| Backup | `src/components/SettingsModal.jsx` |
| Error UI | `src/components/ErrorBoundary.jsx` |
| Cloud Function | `cloud-function/main.py` |
| Firestore rules | `firestore.rules`, `docs/FIRESTORE_RULES.md` |
| Deploy / secrets | `.github/workflows/static.yml`, `src/firebase.js` |
| Journal (critical learnings only) | `.jules/sentinel.md` |

---

## Next action

**Now (Phase 4.2):** Merge PR → `docs/CLOUD_FUNCTION_AUTH.md` (GitHub secret `AUTOMATION_SHARED_SECRET` + Cloud Run redeploy). No local CLI on work PC.

**Then:** Phase 4.3 App Check (optional) or Phase 6 maintenance.

**After all phases:** Phase 7 full re-audit (automated + manual smoke + residual risk register + owner sign-off).

**Before Phase 5 (sessionStorage / PKCE):** Explicit owner approval — UX trade-offs.
