# Cloud Function authentication — Sentinel Phase 4.2

**No local `gcloud` on your PC.** Use the browser only.

## What changes

| Caller | Auth |
|--------|------|
| **Browser app** (Intervals cloud sync, eFTP chart) | `Authorization: Bearer <Firebase ID token>` — user must be signed in |
| **GitHub Actions** (nightly sync) | `X-Automation-Secret` header + same value in Cloud Run env |
| **Random internet** | `401 Unauthorized` — no more open proxy |

---

## Checklist

### ✅ Step 1 — Cloud Run secret (you did this)

[Cloud Run → sync-intervals → Variables](https://console.cloud.google.com/run/detail/europe-west1/sync-intervals/variables?project=climb-performance-lab) → `AUTOMATION_SHARED_SECRET` → Deploy.

### Step 2 — GitHub secret (same string)

[GitHub → Secrets → Actions](https://github.com/VCCharlie/Climb-Performance-Lab/settings/secrets/actions) → **New repository secret**

| Name | Value |
|------|--------|
| `AUTOMATION_SHARED_SECRET` | same string as Cloud Run |

### Step 3 — Deploy the new Python code (auth logic)

**Recommended: Google Cloud Shell** (uses your Google login — no extra IAM on GitHub).

---

## Option A — Google Cloud Shell (recommended)

1. Open **[Google Cloud Shell](https://shell.cloud.google.com/?project=climb-performance-lab)**.

2. **Private repo:** do **not** use `curl raw.githubusercontent.com/...` — it returns 404. Use git:

```bash
cd ~/Climb-Performance-Lab 2>/dev/null || git clone https://github.com/VCCharlie/Climb-Performance-Lab.git ~/Climb-Performance-Lab
cd ~/Climb-Performance-Lab && git pull origin main
bash scripts/deployCloudFunctionCloudShell.sh
```

**Or paste these lines manually** (works without the script):

```bash
cd ~/Climb-Performance-Lab 2>/dev/null || git clone https://github.com/VCCharlie/Climb-Performance-Lab.git ~/Climb-Performance-Lab
cd ~/Climb-Performance-Lab && git pull origin main
cd cloud-function
gcloud config set project climb-performance-lab
gcloud run deploy sync-intervals \
  --source . \
  --function sync_intervals \
  --region europe-west1 \
  --allow-unauthenticated
```

3. Wait for `✅ Deploy complete` / `Done.` (2–5 minutes).

> **Why `run deploy`?** The service **sync-intervals** already exists on Cloud Run.  
> `gcloud functions deploy` without `--source` / `--entry-point` returns **409 service already exists**.

> **Do not use `--set-secrets` on redeploy.** Intervals credentials are already on the service (as env vars or secrets). Changing type causes: *Cannot update environment variable to the given type*.

> **"Regional Access Boundary" warnings** in Cloud Shell are often harmless noise — ignore them if the deploy finishes OK.

All existing variables (`INTERVALS_ATHLETE_ID`, `INTERVALS_API_KEY`, `AUTOMATION_SHARED_SECRET`) are **kept**.

---

## Option B — Cloud Run Console (no terminal)

1. [Cloud Run → sync-intervals](https://console.cloud.google.com/run/detail/europe-west1/sync-intervals?project=climb-performance-lab)
2. **Edit & deploy new revision**
3. **Source** → Deploy from GitHub / source repository (connect repo if needed)
4. Root directory: `cloud-function`
5. Deploy (keep existing env vars and secrets)

---

## Option C — GitHub Actions (optional)

[Deploy Cloud Function workflow](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-cloud-function.yml) uses the same GitHub secret as nightly sync: **`FIREBASE_SERVICE_ACCOUNT`**. That key is enough for Firestore sync, but **Cloud Run deploy needs extra IAM** on the service account (`client_email` in the JSON — often `firebase-adminsdk-fbsvc@climb-performance-lab.iam.gserviceaccount.com`).

### Fix `PERMISSION_DENIED: run.services.get` (one-time, in browser)

1. Open [GCP IAM](https://console.cloud.google.com/iam-admin/iam?project=climb-performance-lab).
2. Find that service account → **Edit** (pencil) → **Add another role**:
   - **Cloud Run Developer** (`roles/run.developer`)
   - **Cloud Build Editor** (`roles/cloudbuild.builds.editor`) — needed when deploy uses `--source`
3. Save → wait ~1 minute → re-run **Deploy Cloud Function** with confirm `DEPLOY`.

If deploy still fails on artifact upload, also add **Service Account User** (`roles/iam.serviceAccountUser`) on the project (or the Cloud Run runtime SA).

Until those roles are set, use **Option A (Cloud Shell)** — your Google user already has deploy rights there.

### Still failing after adding roles?

| Symptom in Actions log | What to add / check |
|------------------------|---------------------|
| `run.services.get` denied | `roles/run.developer` on the **same** `client_email` as in `FIREBASE_SERVICE_ACCOUNT` |
| Cloud Build / `PERMISSION_DENIED` on `cloudbuild.builds.create` | `roles/cloudbuild.builds.editor` |
| `iam.serviceaccounts.actAs` / runtime SA | `roles/iam.serviceAccountUser` on the Cloud Run **runtime** service account (Cloud Run → sync-intervals → Security → Service account) |
| Workflow aborts before deploy | New **Verify Cloud Run deploy access** step — read the `Authenticated as:` line; that email must have the roles above |

IAM changes can take **1–3 minutes**. Re-run the workflow with confirm **`DEPLOY`** (not `deploy`).

### Option C2 — dedicated deploy key (keeps Firebase SA minimal)

1. [GCP → Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=climb-performance-lab) → **Create** → name e.g. `github-cloud-run-deploy`.
2. Grant roles: **Cloud Run Developer**, **Cloud Build Editor**, **Service Account User** (project level).
3. Keys → **Add key** → JSON → copy once.
4. GitHub → Settings → Secrets → **New repository secret** → name **`GCP_DEPLOY_SERVICE_ACCOUNT`** → paste full JSON.
5. Re-run **Deploy Cloud Function**. The workflow prefers this secret over `FIREBASE_SERVICE_ACCOUNT`.

Nightly sync and Firestore rules keep using **`FIREBASE_SERVICE_ACCOUNT`** only.

---

## Smoke test

| Test | Expected |
|------|----------|
| App, **signed in**, no local Intervals key → Sync | Activities import |
| App, **signed out** → Sync | Error / sign-in prompt |
| Actions → **Nightly Intervals Sync** → Run workflow | Green (after step 2) |

---

## Rollback

[Cloud Run → sync-intervals → Revisions](https://console.cloud.google.com/run/detail/europe-west1/sync-intervals/revisions?project=climb-performance-lab) → route traffic to the previous revision.
