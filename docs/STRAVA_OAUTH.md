# Strava OAuth — server-side credentials (Sentinel Phase 5)

Browser clients never see the Strava **client secret**. Tokens live in Firestore `strava_tokens/automation` (Admin SDK only).

## Architecture

| Component | Role |
|-----------|------|
| **Cloud Run `strava-oauth`** | OAuth code exchange, token refresh, disconnect |
| **GitHub Actions secrets** | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` for nightly sync |
| **Firestore `strava_tokens/automation`** | Long-lived `refresh_token` (client cannot read) |
| **Browser** | Firebase ID token only; receives short-lived `access_token` on demand |

## Checklist

### Step 1 — GitHub Actions secrets

[Repository secrets](https://github.com/VCCharlie/Climb-Performance-Lab/settings/secrets/actions):

| Name | Value |
|------|--------|
| `STRAVA_CLIENT_ID` | From [Strava API settings](https://www.strava.com/settings/api) |
| `STRAVA_CLIENT_SECRET` | Same portal |

Nightly workflow (`nightly-sync.yml`) passes these to `scripts/nightlySync.js`.

### Step 2 — Deploy Cloud Run `strava-oauth`

> **Private repository:** `curl https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/...` returns **404** even after merge. GitHub does not serve raw files for private repos without authentication. Use **git clone** in Cloud Shell instead (you are already logged into GitHub there).

**Google Cloud Shell** — paste this block:

```bash
gcloud config set project climb-performance-lab

cd ~/Climb-Performance-Lab 2>/dev/null || git clone https://github.com/VCCharlie/Climb-Performance-Lab.git ~/Climb-Performance-Lab
cd ~/Climb-Performance-Lab
git fetch origin main
git checkout main
git pull origin main

cd cloud-function
gcloud run deploy strava-oauth \
  --source . \
  --function strava_oauth \
  --region europe-west1 \
  --allow-unauthenticated
```

Or run the script from your clone (not via curl):

```bash
cd ~/Climb-Performance-Lab
git checkout main && git pull origin main
bash scripts/deployStravaOAuthCloudShell.sh
```

If `git clone` asks for credentials, run `gh auth login` once in Cloud Shell, then retry.

### Continuous deployment from GitHub (optional — usually OFF)

Most day-to-day work is **React only** (GitHub Pages). The Python `strava-oauth` service changes rarely, so **disabling** the Cloud Build trigger is the recommended setup after the first successful deploy.

#### Disable auto-deploy (recommended)

**What this does:** Stops Cloud Build from running on every push to `main`. The `strava-oauth` service **keeps running** with the last deployed revision.

**Option A — Google Cloud Console**

1. Open [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers?project=climb-performance-lab).
2. Find the trigger that uses `cloudbuild.strava-oauth.yaml` (or targets `strava-oauth`).
3. Open the ⋮ menu → **Disable trigger** (or edit and uncheck **Enable trigger**).

**Option B — Cloud Shell (one command)**

```bash
cd ~/Climb-Performance-Lab && git pull origin main
bash scripts/disableStravaOAuthCloudBuildTrigger.sh
```

**When you change Python code again:** deploy manually with the Cloud Shell block in Step 2 above, or `bash scripts/deployStravaOAuthCloudShell.sh`.

See [CLOUD_RUN_OVERVIEW.md](./CLOUD_RUN_OVERVIEW.md) for the full decision diagram.

#### Re-enable auto-deploy (only if you change `cloud-function/` often)

If you connected **Cloud Run → strava-oauth → Continuous deployment** to this repo, the trigger must **not** build from the repository root. The root is the Vite frontend (`package.json`); `strava-oauth` is Python in `cloud-function/`.

**Correct setup:**

- Configuration → **Cloud Build configuration file** → `/cloudbuild.strava-oauth.yaml` (repo root). That file builds `cloud-function/` with Docker (not the Vite root).

**Wrong setup (fails on every merge to `main`):**

- Source directory: `/` (repo root)
- Buildpack detects Node.js + `package.json`
- Error: `ERR_PNPM_OUTDATED_LOCKFILE` or a failed Node install — even after fixing the lockfile, you would still deploy the wrong app type.

**If deploy fails with "Image not found":** ensure `cloudbuild.strava-oauth.yaml` includes an explicit `docker push` step before `gcloud run deploy` (fixed in PR #328).

Set on the service (Variables or Secret Manager):

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

Copy the service URL into `VITE_STRAVA_OAUTH_URL` (GitHub Pages build secret) or update `src/config.js` fallback.

### Step 3 — Firestore rules

Deploy updated `firestore.rules` (denies client access to `strava_tokens/*`):

```bash
node scripts/deployFirestoreRules.js
```

### Step 4 — Migrate existing refresh token (one-time)

If you already had Strava connected before this change:

```bash
node --env-file=.env scripts/migrateStravaTokensToFirestore.js --from-backup=./your-backup.json
```

Or:

```bash
node --env-file=.env scripts/migrateStravaTokensToFirestore.js --refresh-token=YOUR_REFRESH_TOKEN
```

### Step 5 — Connect in the app

1. Sign in with Google.
2. Settings → **Connect with Strava**.
3. Nightly sync will use the server-stored refresh token automatically.

## API (Cloud Run)

| Request | Auth | Body |
|---------|------|------|
| `GET ?route=config` | None | — returns `{ client_id }` |
| `POST` | Firebase Bearer | `{ "action": "exchange", "code", "redirect_uri" }` |
| `POST` | Firebase Bearer | `{ "action": "token" }` → `{ access_token }` |
| `POST` | Firebase Bearer | `{ "action": "disconnect" }` |

## Smoke tests

| Test | Expected |
|------|----------|
| Settings → Connect Strava | Redirect + success; athlete name shown |
| DataHub → Strava enrich | Works while signed in |
| Actions → Nightly Intervals Sync | `[STRAVA]` enrichment runs (not skipped) |
| Firestore client read `strava_tokens/automation` | Permission denied |

## Rollback

- Revert Cloud Run revision for `strava-oauth`.
- Previous browser-local OAuth still works only if you restore old frontend (not recommended).
