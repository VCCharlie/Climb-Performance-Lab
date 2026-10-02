# Nightly Intervals sync — scheduling

The workflow [`.github/workflows/nightly-sync.yml`](../.github/workflows/nightly-sync.yml) runs **`scripts/nightlySync.js`** on GitHub Actions.

## Trigger

- **`workflow_dispatch` only** (manual run in Actions, or HTTP POST from an external scheduler).
- GitHub’s built-in `on: schedule` cron is **not** used — scheduled runs on shared runners often start hours late.

## Recommended: cron-job.org

1. Create a daily job (timezone **Europe/Amsterdam**, e.g. 05:00).
2. **POST**  
   `https://api.github.com/repos/VCCharlie/Climb-Performance-Lab/actions/workflows/nightly-sync.yml/dispatches`
3. Headers: `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `Content-Type: application/json`
4. Body: `{"ref":"main"}`
5. PAT (private repo): fine-grained **Actions: Read and write** on this repository, or classic **`repo`** scope.

Success = **HTTP 204**; then check Actions for a **workflow_dispatch** run.

## Behaviour

Sync options follow Firestore **Settings** (sync range days, Fast/Full depth, enrich limits, data-source prefs). See Integration diagnostics in Settings.
