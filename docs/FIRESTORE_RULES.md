# Firestore security rules — Sentinel Phase 4.1

**Status:** Rules live in `firestore.rules` (repo). **Deploying to production requires owner sign-off.**

You do **not** need Firebase CLI on your work PC.

## What the rules do

| Collection | Access |
|------------|--------|
| `settings/{docId}` | Read/write only when signed in **and** `docId == user_{uid}` |
| `activities/{id}` | Read/write when signed in (shared log — single-owner app) |
| Everything else | Denied |

This matches the client after Phase 4.0: Firestore listeners run only when `user` is set.

## Before you deploy

1. **Export a Settings JSON backup** (Settings → export).
2. Confirm you can sign in on [GitHub Pages](https://vccharlie.github.io/Climb-Performance-Lab/).
3. **Save current rules for rollback** — Firebase Console → [Firestore → Rules](https://console.firebase.google.com/project/climb-performance-lab/firestore/rules) → select all → copy to a note or file.

---

## Option A — GitHub Actions (recommended, no local install)

Uses the existing repo secret `FIREBASE_SERVICE_ACCOUNT` (same as nightly sync).

1. Open [GitHub Actions → Deploy Firestore Rules](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-firestore-rules.yml).
2. Click **Run workflow**.
3. In the **confirm** field, type exactly: `DEPLOY`
4. Run on branch `main` (after the rules PR is merged).
5. Wait for green ✅ (runs rules tests, then deploys).

**Rollback:** paste your saved rules in Firebase Console → Rules → **Publish** (see below).

---

## Option B — Firebase Console in the browser (no CLI, no Actions)

1. Open [Firestore Rules](https://console.firebase.google.com/project/climb-performance-lab/firestore/rules).
2. Open `firestore.rules` in this repo on GitHub (raw file).
3. Copy the full contents into the Rules editor.
4. Click **Publish**.

**Rollback:** paste your saved copy from “Before you deploy” step 3.

---

## Option C — Local Firebase CLI (optional)

Only if you have admin rights on a machine:

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use climb-performance-lab
npm run test:rules
npx firebase-tools@latest deploy --only firestore:rules
```

---

## CI rules tests (runs automatically in Option A)

```bash
npm install
npm run test:rules
```

Uses `@firebase/rules-unit-testing` with the Firestore emulator.

---

## Smoke test after deploy

1. Sign out → SignInGate (no activities in UI).
2. Sign in → dashboard + activity log load.
3. Settings save → reload → settings persist.
4. Intervals sync or manual import → activities appear.

## Not covered here

- Cloud Function auth (Phase 4.2)
- App Check (Phase 4.3)
- Per-activity `ownerId` for multi-user (deferred)
