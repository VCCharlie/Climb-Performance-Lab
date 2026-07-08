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

2. Paste **one line** (after this PR is on `main`):

```bash
curl -fsSL https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/main/scripts/deployCloudFunctionCloudShell.sh | bash
```

**Or paste these lines manually** (works right now):

```bash
cd ~/Climb-Performance-Lab 2>/dev/null || git clone https://github.com/VCCharlie/Climb-Performance-Lab.git ~/Climb-Performance-Lab
cd ~/Climb-Performance-Lab && git pull origin main
cd cloud-function
gcloud config set project climb-performance-lab
gcloud run deploy sync-intervals \
  --source . \
  --function sync_intervals \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets "INTERVALS_ATHLETE_ID=intervals-athlete-id:latest,INTERVALS_API_KEY=intervals-api-key:latest"
```

3. Wait for `✅ Deploy complete` / `Done.` (2–5 minutes).

> **Why `run deploy`?** The service **sync-intervals** already exists on Cloud Run.  
> `gcloud functions deploy` without `--source` / `--entry-point` returns **409 service already exists**.

> **"Regional Access Boundary" warnings** in Cloud Shell are often harmless noise — ignore them if the deploy finishes OK.

`AUTOMATION_SHARED_SECRET` you set in the Console is **kept** — this command does not remove it.

---

## Option B — Cloud Run Console (no terminal)

1. [Cloud Run → sync-intervals](https://console.cloud.google.com/run/detail/europe-west1/sync-intervals?project=climb-performance-lab)
2. **Edit & deploy new revision**
3. **Source** → Deploy from GitHub / source repository (connect repo if needed)
4. Root directory: `cloud-function`
5. Deploy (keep existing env vars and secrets)

---

## Option C — GitHub Actions (optional)

[Deploy Cloud Function workflow](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-cloud-function.yml) — only if you add Cloud Functions + Cloud Run IAM roles to `FIREBASE_SERVICE_ACCOUNT`. Otherwise use Option A.

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
