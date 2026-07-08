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

## Option B — Firebase Console in the browser (fastest, no IAM changes)

**Use this if GitHub Actions returns 403** — uses your Google owner login, not the service account.

1. Open [Firestore Rules](https://console.firebase.google.com/project/climb-performance-lab/firestore/rules).
2. Open [`firestore.rules` on GitHub](https://github.com/VCCharlie/Climb-Performance-Lab/blob/main/firestore.rules) (Raw).
3. Copy the full contents into the Rules editor.
4. Click **Publish**.

**Rollback:** paste your saved copy from “Before you deploy” step 3.

---

## Option A — GitHub Actions (no local install)

Uses repo secret `FIREBASE_SERVICE_ACCOUNT` (same key as nightly sync, but **extra IAM role** required — see below).

1. Open [GitHub Actions → Deploy Firestore Rules](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-firestore-rules.yml).
2. Click **Run workflow**.
3. In the **confirm** field, type exactly: `DEPLOY`
4. Run on branch `main`.
5. Wait for green ✅ (rules tests + deploy via Firebase Rules API).

**Rollback:** paste saved rules in Firebase Console → Rules → **Publish**.

### Fix 403 on deploy (one-time, in browser)

Nightly sync only needs **Firestore data** access. Rules deploy needs **Firebase Rules Admin** on the same service account.

1. Open [GCP IAM](https://console.cloud.google.com/iam-admin/iam?project=climb-performance-lab) (browser).
2. Find the service account email — in GitHub → Settings → Secrets → `FIREBASE_SERVICE_ACCOUNT`, the JSON field `client_email` (e.g. `…@climb-performance-lab.iam.gserviceaccount.com`).
3. Click **Edit** (pencil) on that principal → **Add another role**:
   - **Firebase Rules Admin** (`roles/firebaserules.admin`)
4. Save → re-run the **Deploy Firestore Rules** workflow.

No CLI on your PC; only the GCP website.

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

Requires **JDK 21+** locally. GitHub Actions installs Temurin 21 automatically.

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
