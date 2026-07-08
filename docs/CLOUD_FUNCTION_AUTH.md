# Cloud Function authentication — Sentinel Phase 4.2

**No local `gcloud` CLI needed.** Everything below is browser + GitHub.

## What changes

| Caller | Auth |
|--------|------|
| **Browser app** (Intervals cloud sync, eFTP chart) | `Authorization: Bearer <Firebase ID token>` — user must be signed in |
| **GitHub Actions** (nightly sync) | `X-Automation-Secret` header + same value in Cloud Run env |
| **Random internet** | `401 Unauthorized` — no more open proxy |

Intervals API keys stay in **GCP Secret Manager** for browser clients (not in POST body).

---

## Your checklist (3 steps)

### ✅ Step 1 — Cloud Run secret (you did this)

[Cloud Run → sync-intervals](https://console.cloud.google.com/run/detail/europe-west1/sync-intervals/variables?project=climb-performance-lab) → variable `AUTOMATION_SHARED_SECRET` → Deploy.

### Step 2 — GitHub secret (same string)

1. Open [GitHub → Settings → Secrets → Actions](https://github.com/VCCharlie/Climb-Performance-Lab/settings/secrets/actions).
2. **New repository secret**
   - Name: `AUTOMATION_SHARED_SECRET`
   - Value: **exactly the same** string as in Cloud Run

### Step 3 — Deploy the new Python code (auth logic)

Phase 4.2 code must be on `main` first (merge [PR #273](https://github.com/VCCharlie/Climb-Performance-Lab/pull/273) if it is still open).

Then:

1. Open [GitHub Actions → Deploy Cloud Function](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-cloud-function.yml).
2. **Run workflow** on branch `main`.
3. In **confirm**, type exactly: `DEPLOY`
4. Wait for green ✅

> **Note:** Redeploying only the env var in the GCP Console does **not** install `auth_gate.py`. You need this workflow (or a one-time `gcloud` deploy) once.

### If the workflow fails with 403

The GitHub service account needs extra IAM roles (one-time, in browser):

1. [GCP IAM](https://console.cloud.google.com/iam-admin/iam?project=climb-performance-lab)
2. Find the email from secret `FIREBASE_SERVICE_ACCOUNT` → field `client_email`
3. **Edit** → add roles:
   - **Cloud Functions Developer**
   - **Cloud Run Admin**
   - **Service Account User**
   - **Secret Manager Secret Accessor**
4. Re-run the workflow

---

## Smoke test

| Test | Expected |
|------|----------|
| App, **signed in**, no local Intervals key → Sync | Activities import |
| App, **signed out** → Sync | Error / sign-in prompt |
| Actions → **Nightly Intervals Sync** → Run workflow | Green (after step 2) |

---

## Rollback

Cloud Run → **sync-intervals** → **Revisions** → route traffic to the previous revision.

Nightly sync fails closed if GitHub and Cloud Run secrets differ — align them first.
