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

### Continuous deployment from GitHub (Cloud Build trigger)

If you connected **Cloud Run → strava-oauth → Continuous deployment** to this repo, the trigger must **not** build from the repository root. The root is the Vite frontend (`package.json`); `strava-oauth` is Python in `cloud-function/`.

**Wrong setup (fails on every merge to `main`):**

- Source directory: `/` (repo root)
- Buildpack detects Node.js + `pnpm-lock.yaml` / `package.json`
- Error: `ERR_PNPM_OUTDATED_LOCKFILE` or a failed Node install — even after fixing the lockfile, you would still deploy the wrong app type.

**Fix (pick one):**

1. **Cloud Build config file (recommended)** — Cloud Run → strava-oauth → Edit continuous deployment → Build configuration → **Cloud Build configuration file** → `cloudbuild.strava-oauth.yaml` (in repo root).
2. **Source subdirectory** — set build context / source directory to `cloud-function` and entry point `strava_oauth` (Python buildpack).
3. **Disable auto-deploy** — use the Cloud Shell block above only when you change Python code; frontend deploys via GitHub Pages (`Deploy Vite App` workflow), not Cloud Build.

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
