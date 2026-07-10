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

**Google Cloud Shell** (recommended):

> **Note:** Until PR #303 is merged to `main`, use the **feature-branch** URL below (the `main` raw URL returns 404).

```bash
curl -fsSL https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/cursor/strava-oauth-server-side-8810/scripts/deployStravaOAuthCloudShell.sh | bash
```

After merge to `main`:

```bash
curl -fsSL https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/main/scripts/deployStravaOAuthCloudShell.sh | bash
```

**Manual fallback** (paste in Cloud Shell if curl still fails):

```bash
cd ~/Climb-Performance-Lab 2>/dev/null || git clone -b cursor/strava-oauth-server-side-8810 https://github.com/VCCharlie/Climb-Performance-Lab.git ~/Climb-Performance-Lab
cd ~/Climb-Performance-Lab && git fetch origin cursor/strava-oauth-server-side-8810 && git checkout cursor/strava-oauth-server-side-8810 && git pull origin cursor/strava-oauth-server-side-8810
cd cloud-function
gcloud config set project climb-performance-lab
gcloud run deploy strava-oauth \
  --source . \
  --function strava_oauth \
  --region europe-west1 \
  --allow-unauthenticated
```

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
