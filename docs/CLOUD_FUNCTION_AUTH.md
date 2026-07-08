# Cloud Function authentication — Sentinel Phase 4.2

**Status:** Code in repo. **Redeploy** `sync-intervals` on Cloud Run after merge.

## What changes

| Caller | Auth |
|--------|------|
| **Browser app** (Intervals cloud sync, eFTP chart) | `Authorization: Bearer <Firebase ID token>` — user must be signed in |
| **GitHub Actions** (nightly sync) | `X-Automation-Secret` header + same value in Cloud Run env |
| **Random internet** | `401 Unauthorized` — no more open proxy |

Intervals API keys stay in **GCP secrets** for browser clients (not in POST body).

## One-time setup (browser, no local CLI)

### 1. Generate automation secret

Use a long random string (e.g. 32+ chars). Save in a password manager.

### 2. GitHub secret

Repo → Settings → Secrets → Actions → **New repository secret**

| Name | Value |
|------|--------|
| `AUTOMATION_SHARED_SECRET` | your random string |

(Nightly workflow already passes this to `scripts/nightlySync.js`.)

### 3. Cloud Run environment variable

[Google Cloud Console](https://console.cloud.google.com/run?project=climb-performance-lab) → service **sync-intervals** → Edit & deploy new revision → Variables:

| Name | Value |
|------|--------|
| `AUTOMATION_SHARED_SECRET` | same string as GitHub |

Keep existing `INTERVALS_ATHLETE_ID` / `INTERVALS_API_KEY` secrets.

### 4. Redeploy function code

From a machine with `gcloud` **or** via your usual deploy path — deploy `cloud-function/main.py` + `auth_gate.py` + updated `requirements.txt`.

See [cloud-function/README.md](../cloud-function/README.md) for deploy command.

### 5. Smoke test

**App (signed in, no local Intervals key):** Settings → Sync Intervals → activities import.

**Nightly:** Actions → Nightly Intervals Sync → Run workflow.

## Rollback

Redeploy previous Cloud Run revision **or** temporarily remove auth check (revert PR). Nightly sync fails closed if secret mismatch — fix secret alignment first.

## Not deployed yet

Until step 4 completes, production still accepts unauthenticated calls. Phase 4.2 is **not live** until you redeploy.
