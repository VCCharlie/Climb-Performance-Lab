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

Pick **one** option below. **Option A is easiest** if GitHub Actions returns 403.

---

## Option A — Google Cloud Shell (recommended, ~2 min)

Uses **your** Google account in the browser. No IAM changes to the GitHub service account.

1. Open **[Google Cloud Shell](https://shell.cloud.google.com/?project=climb-performance-lab)** (terminal in the browser).
2. Paste this **one line** and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/main/scripts/deployCloudFunctionCloudShell.sh | bash
```

3. Wait until you see `✅ Deploy complete.` (about 2–4 minutes).

`AUTOMATION_SHARED_SECRET` you set in Cloud Run is **kept** — the script does not overwrite it.

---

## Option B — GitHub Actions (optional)

Only if you prefer CI deploy **and** the service account has IAM roles (see below).

1. [Actions → Deploy Cloud Function](https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/deploy-cloud-function.yml)
2. **Run workflow** on `main` → confirm: `DEPLOY`

### If Option B fails with 403

The `FIREBASE_SERVICE_ACCOUNT` key is for Firestore/nightly sync — it does **not** have Cloud Functions deploy rights by default.

**Easiest fix:** use **Option A (Cloud Shell)** instead.

**Or** add roles once in [GCP IAM](https://console.cloud.google.com/iam-admin/iam?project=climb-performance-lab) for the `client_email` from `FIREBASE_SERVICE_ACCOUNT`:

- Cloud Functions Developer
- Cloud Run Admin
- Service Account User
- Secret Manager Secret Accessor

Then re-run the workflow.

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
