# Climb Performance Lab

A React single-page app for cycling performance analysis, focused on climbing metrics, training data, and race planning.

## Features

- **Physics-based climbing**: Climb time and power estimation (Newton–Raphson solver)
- **Training data**: CSV import, **Intervals.icu** sync (direct API from the app), optional **Strava** flows where configured
- **Dashboard**: Performance trends, eFTP-style charts (chart data can use a Google Cloud Function; see below)
- **Training**: AI coach (SWOT-style) and recovery-oriented views
- **Race**: Fueling / nutrition and multi-climb pacing
- **Gear**: Chainring and cassette analysis for target climbs
- **Profiler**: Segment-level climb profiles with power zones
- **Bucket list**: Track climbs (done / planned / want), with achievements
- **Weather**: Weather-adjusted climb expectations
- **Cloud sync**: Firebase (Firestore + Google sign-in) for settings and activities
- **MCP**: Model Context Protocol server for AI assistants (e.g. Strava-related tooling); see [MCP-SETUP.md](./MCP-SETUP.md)

## Tech stack

| Area | Stack |
|------|--------|
| UI | React 19, Vite 7, Tailwind (CDN), Framer Motion, Lucide React |
| Charts / maps | Recharts, Leaflet |
| Backend / sync | Firebase 12 (Firestore, Auth, Analytics) |
| Tests | Vitest 4 |
| Tooling | ESLint 9 (flat config) |

## Quick start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

The app is configured for GitHub Pages with base path `/Climb-Performance-Lab/` (see `vite.config.js`).

## Intervals.icu integration

Two related paths exist in the codebase:

1. **Activity sync (Data Hub)** — The app calls the [Intervals.icu API](https://intervals.icu) **directly from the browser** using your athlete ID and API key from **Settings**. Implementation: `src/hooks/useIntervalsSync.js` (GET with Basic auth, activities normalized in `src/utils/intervals.js`). Credentials stay in the client (localStorage / Firebase user payload when you use cloud backup); they are not sent through a proxy for this flow.

2. **Optional cloud sync (signed-in users)** — `src/services/intervalsCloudApi.js` can call the **Google Cloud Function** (`sync-intervals-v2`) when local API credentials are not set. Deploy and operate your own function if you use this path; see [cloud-function/README.md](./cloud-function/README.md).

`src/config.js` exports `CLOUD_SYNC_URL` for an optional Cloud Run–style endpoint; it is not wired into the main activity sync hook. Update it if you deploy a server-side sync service and connect it from the app.

## Strava and MCP

The **MCP server** lets supported AI clients call tools (e.g. Strava) using your configuration. Setup: [MCP-SETUP.md](./MCP-SETUP.md) and [mcp-server/README.md](./mcp-server/README.md).

## Project structure (overview)

```
├── src/
│   ├── components/     # UI (DataHub, Dashboard, Physics, Race, Training, …)
│   ├── hooks/          # e.g. useIntervalsSync
│   ├── services/       # e.g. intervalsCloudApi (cloud function client)
│   ├── utils/          # Parsers, intervals normalizer, analytics, …
│   └── __tests__/      # Vitest tests (utils, etc.)
├── cloud-function/     # Python Intervals sync (deployment docs)
├── mcp-server/         # Node MCP server
└── scripts/            # Helpers (e.g. Intervals fetch, nightly sync)
```

## Configuration

- **Firebase**: Project config lives in `src/firebase.js`. Use **Sign in with Google** in the app for cloud sync; replace config only if you use your own Firebase project.
- **Intervals.icu**: Enter athlete ID and API key in app **Settings** for direct sync.
- **Strava / MCP**: See [MCP-SETUP.md](./MCP-SETUP.md).

## Development

```bash
npm run dev          # Dev server (HMR)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint
npm run test         # Vitest (watch)
npm run test:run     # Vitest once (CI)
npm run test:coverage# Vitest with coverage
```

## Documentation

- [MCP-SETUP.md](./MCP-SETUP.md) — MCP / Strava-oriented setup
- [mcp-server/README.md](./mcp-server/README.md) — MCP server details
- [cloud-function/README.md](./cloud-function/README.md) — Python cloud function deployment
- [CLAUDE.md](./CLAUDE.md) — AI assistant / project map
- [AGENTS.md](./AGENTS.md) — Code guidelines

## License

MIT

## Contributing

Contributions are welcome. Please follow [AGENTS.md](./AGENTS.md).
