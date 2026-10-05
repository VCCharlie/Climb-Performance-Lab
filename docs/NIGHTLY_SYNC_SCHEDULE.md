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

## Dual runtime (Vite + Node)

The SPA is built with **Vite** (`import.meta.env` is injected). The **nightly job** runs `node scripts/nightlySync.js` and imports many of the same files under `src/utils/` **without** Vite — so `import.meta.env` is often missing.

**Rules for developers and AI assistants** (full detail in root **`AGENTS.md`** → *Shared utils also run in Node*):

- Avoid bare `import.meta.env.DEV` or `import.meta.env.VITE_*` in shared utils.
- Prefer `import.meta.env?.…`, `isViteDevBuild()` from `src/utils/safeLog.js`, or the `viteEnv?.…` pattern in `src/config.js`.
- Before merge: `npm run test:nightly-sync` (static scan of the nightly import graph + unit tests).

Pull requests and the nightly workflow run these checks via `.github/workflows/ci.yml` and `.github/workflows/nightly-sync.yml`.
