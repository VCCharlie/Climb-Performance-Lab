# CLAUDE.md - AI Assistant Guide for Climb Performance Lab

## Project Overview

**Climb Performance Lab** is a React-based single-page application (SPA) for cycling performance analysis, specifically focused on climbing metrics. The app helps cyclists analyze, plan, and optimize their climbing ability through:

- Physics-based climb time/power calculations
- Training data import (CSV, Intervals.icu integration)
- Performance trend visualization
- Race nutrition planning and pacing strategy
- Gear optimization
- AI-powered training coaching and recovery analysis
- Climb bucket list tracking
- Weather-adjusted climb calculations
- Cloud sync via Firebase

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework (functional components with hooks) |
| Vite | 7.2.7 | Build tool and dev server |
| Vitest | 4.0.18 | Unit testing framework |
| Firebase/Firestore | 12.7.0 | Cloud database, sync, and Google Auth |
| Tailwind CSS | CDN | Utility-first styling |
| Framer Motion | 12.24.7 | Animations |
| Recharts | 3.6.0 | Data visualization |
| Lucide React | 0.562.0 | Icon library |
| ESLint | 9.39.2 | Code linting (flat config format) |

## Directory Structure

```
Climb-Performance-Lab/
├── src/
│   ├── components/                   # React components
│   │   ├── Header.jsx                # App header with branding & version badge
│   │   ├── Dashboard.jsx             # Performance trend visualization (area chart)
│   │   ├── PhysicsEngine.jsx         # Climb calculation engine (Newton-Raphson solver)
│   │   ├── DataHub.jsx               # Activity import, log, sync (entry point)
│   │   ├── data-hub/                 # DataHub sub-components (activity log, import, Strava)
│   │   │   ├── ActivityLogTab.jsx    # Log tab shell (filters, table/cards, sync panel)
│   │   │   ├── ActivityTable.jsx     # Virtualized table (+ TableHeader/Row exports)
│   │   │   ├── ActivityDetailModal.jsx
│   │   │   ├── DataHubModals.jsx     # Modal orchestration
│   │   │   ├── ImportSection.jsx     # Import tab content
│   │   │   ├── IntervalsSyncPanel.jsx# Unified Intervals fetch / refresh UI
│   │   │   ├── DuplicateResolver.jsx # Duplicate review (replaces DuplicateReviewModal)
│   │   │   └── activity-log-filters/ # Filter panel chips and metric ranges
│   │   ├── dashboard/                # Dashboard sub-components
│   │   ├── FuelingStrategy.jsx       # Race fueling calculator (sub-tab under Race)
│   │   ├── RacePacing.jsx            # Multi-climb race pacing planner (sub-tab under Race)
│   │   ├── AICoach.jsx               # SWOT-based training coach (sub-tab under Training)
│   │   ├── RecoveryAdvisor.jsx       # Recovery status analysis (sub-tab under Training)
│   │   ├── GearOptimizer.jsx         # Bicycle gear ratio calculator
│   │   ├── ClimbProfiler.jsx         # Segment-level climb visualization with power zones
│   │   ├── BucketList.jsx            # Climb bucket list tracker (done/planned/want)
│   │   ├── WeatherClimb.jsx          # Weather-adjusted climb performance calculator
│   │   ├── ClimbProfileCard.jsx      # Tactical climb profile display
│   │   ├── PerformanceModule.jsx     # Performance statistics charts
│   │   └── SettingsModal.jsx         # Settings dialog (replaces SettingsTab)
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useActivityFilter.js      # Activity search/sort/filter logic
│   │   ├── useIntervalsSync.js       # Direct Intervals.icu API sync
│   │   └── useDataHub*.js            # DataHub bulk, import, maintenance, …
│   │
│   ├── services/                     # External service integrations
│   │   ├── intervalsCloudApi.js      # Cloud Function client (optional sync)
│   │   └── climbDatabase.js          # Climb DB service
│   │
│   ├── utils/                        # Modular utility files
│   │   ├── analytics.js              # Training analytics calculations
│   │   ├── calculations.js           # Physics/performance calculations
│   │   ├── dedup.js                  # Activity deduplication logic
│   │   ├── duplicateDetection.js     # Duplicate detection algorithms
│   │   ├── formatters.js             # Date/number formatting
│   │   ├── intervals.js              # Intervals.icu activity normalizer
│   │   └── parsers.js                # CSV/data parsers
│   │
│   ├── __tests__/                    # Vitest unit tests
│   │   ├── fixtures/                 # Test data (sample CSVs, JSON API responses)
│   │   └── utils/                    # Utility test files
│   │       ├── analytics.test.js
│   │       ├── calculations.test.js
│   │       ├── dedup.test.js
│   │       ├── duplicateDetection.test.js
│   │       ├── formatters.test.js
│   │       ├── intervals.test.js
│   │       └── parsers.test.js
│   │
│   ├── assets/               # Static assets (logos, images)
│   ├── App.jsx               # Main app component (tab routing, state management)
│   ├── App.css               # App-level CSS
│   ├── main.jsx              # React DOM entry point
│   ├── index.css             # Global CSS (themes, custom scrollbars)
│   ├── climbs.js             # Database of 150+ real-world & Zwift climbs
│   ├── config.js             # Constants (activity columns, sport types, months)
│   ├── firebase.js           # Firebase initialization (Firestore, Auth, Analytics)
│   ├── utils.js              # Shared CSV parsing, formatting, calculations
│   └── verify_dedup.js       # Deduplication verification script
│
├── cloud-function/           # Python Cloud Function for Intervals.icu sync
│   ├── main.py               # Cloud function entry point
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Deployment instructions
│
├── mcp-server/               # MCP server integration
│   ├── index.js              # MCP server entry point
│   ├── ARCHITECTURE.md       # MCP architecture docs
│   └── README.md             # MCP setup guide
│
├── scripts/                  # Utility scripts
│   ├── fetchIntervalsData.js # Manual intervals data fetch
│   ├── nightlySync.js        # Nightly sync trigger via GitHub Actions
│   ├── theme-migration.*     # Theme migration scripts (JS, PS1, Python)
│   └── fix-encoding.*        # Encoding fix scripts
│
├── coverage/                 # Test coverage reports (generated)
├── public/                   # Static public assets
├── AGENTS.md                 # AI assistant code guidelines
├── MCP-SETUP.md              # MCP server setup guide
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration (version injection, base path)
├── vitest.config.js          # Vitest test configuration
├── eslint.config.js          # ESLint flat config
├── mcp-config.json           # MCP server configuration
└── index.html                # HTML entry point (includes Tailwind CDN)
```

## Development Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # Create production build (outputs to /dist)
npm run lint         # Run ESLint checks
npm run preview      # Preview production build locally
npm run test         # Run tests in watch mode (Vitest)
npm run test:run     # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
```

## Tab Navigation

The app has **9 main tabs**, some with sub-tabs:

| Tab ID | Label | Component(s) | Notes |
|--------|-------|--------------|-------|
| `dashboard` | Dashboard | `Dashboard.jsx` | Performance trends & eFTP chart |
| `physics` | Physics | `PhysicsEngine.jsx` | Newton-Raphson climb calculator |
| `activities` | Activities | `DataHub.jsx` | CSV import, activity log, Intervals.icu sync |
| `training` | Training | `AICoach.jsx` / `RecoveryAdvisor.jsx` | Sub-tabs: Coach / Recovery |
| `race` | Race | `FuelingStrategy.jsx` / `RacePacing.jsx` | Sub-tabs: Fueling / Race Pacing |
| `gearoptimizer` | Gear | `GearOptimizer.jsx` | Chainring/cassette analysis |
| `profiler` | Profiler | `ClimbProfiler.jsx` | Segment-level climb visualization |
| `bucketlist` | Bucket List | `BucketList.jsx` | Climb tracker (done/planned/want) |
| `weather` | Weather | `WeatherClimb.jsx` | Weather-adjusted climb calculations |

## Key Components Explained

### App.jsx
- Main application component managing global state
- 9-tab navigation with mobile hamburger menu support
- Handles Firebase sync for user settings and activities
- Google Authentication via Firebase Auth
- State: `activities`, `userSettings`, `selectedClimb`, `theme`, `intervalsConfig`
- Per-tab persistent state: `racePacingState`, `gearOptimizerState`, `climbProfilerState`, `bucketListState`, `weatherClimbState`
- Sub-tab state: `trainingSubTab` ('coach' | 'recovery'), `raceSubTab` ('fueling' | 'racepacing')

### PhysicsEngine.jsx
- Core physics calculations for climb time estimation
- Uses Newton-Raphson numerical solver
- Accounts for: gravity, rolling resistance, air drag, drivetrain losses
- Requires: rider weight, bike weight, FTP, climb gradient/length

### DataHub.jsx / data-hub/
- Modular activity management system
- Imports training data from CSV files (handles multiple delimiter formats)
- Displays activity log with sorting, filtering, and duplicate detection
- Integrates with Intervals.icu API directly (see `useIntervalsSync` hook)
- Sub-components live under `src/components/data-hub/` (legacy `DataHub/` folder removed)

### AICoach.jsx
- SWOT analysis engine for training feedback
- Analyzes last 30 days of activities
- Output includes Strengths, Weaknesses, Opportunities, Threats
- **UI language:** All user-visible copy should be **English** (see `.cursorrules`). Legacy Dutch strings may remain until migrated in a dedicated pass.

### RecoveryAdvisor.jsx
- Analyzes training load and recovery status
- Uses activity data to recommend rest or training
- Charts recovery trend over time

### GearOptimizer.jsx
- Calculates optimal gear ratios for target climbs
- Supports chainring presets: Compact, Standard, Semi-Compact, Gravel, MTB 1x
- Inputs: chainrings, cassette, wheel diameter, tyre width, target cadence, FTP

### ClimbProfiler.jsx
- Visualizes gradient profile of selected climb with elevation chart
- Overlays Coggan power zone recommendations
- Uses segment-level data from `CLIMB_DATABASE`

### BucketList.jsx
- Tracks climb status: done / planned / want
- Calculates achievements (e.g. total climbs done, elevation)
- State persisted in localStorage and synced to Firebase

### WeatherClimb.jsx
- Adjusts expected climb time/power based on weather conditions
- Inputs: temperature, wind speed, wind direction, humidity

### SettingsModal.jsx
- Full settings dialog (replaces the old SettingsTab)
- Sections: Profile, Goals, Notifications, Power Zones, Intervals.icu sync, Theme
- Opens as overlay from header settings button

### hooks/useIntervalsSync.js
- Directly calls the Intervals.icu REST API (no cloud function proxy)
- URL: `https://intervals.icu/api/v1/athlete/{athleteId}/activities`
- Uses Basic Auth: `API_KEY:{apiKey}` (base64 encoded)
- Normalizes activities via `src/utils/intervals.js`

### services/intervalsCloudApi.js
- Optional cloud sync when local Intervals API credentials are not set
- Calls cloud function: `https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2`
- Used by `useIntervalsSync` and coach/wellness helpers

### climbs.js
- Database of 150+ climbs from France, Italy, Switzerland, Netherlands
- Includes Zwift virtual climbs
- Coggan power zones definition (`COGGAN_ZONES`)
- Structure: `{ id, name, country, lengthKm, elevation, avgGrade, flag }`

### utils.js
- Shared CSV parsing with smart delimiter detection (comma, semicolon, tab)
- Number parsing for NL/US formats
- Date formatting utilities
- `calculatePowerZones(ftp)` - returns array of Coggan zones

## Code Conventions

### Naming
- **Components**: PascalCase (`DataHub`, `PhysicsEngine`)
- **Functions/Variables**: camelCase (`parseCSV`, `selectedClimb`)
- **Constants**: SCREAMING_SNAKE_CASE (`CLIMB_DATABASE`, `COGGAN_ZONES`)

### React Patterns
- Functional components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)
- Custom hooks for reusable logic (in `src/hooks/`)
- Props-based state lifting (parent `App.jsx` manages global state)
- Per-tab state passed as `initialState` prop, changes reported via `onStateChange` callback
- Conditional rendering for tab navigation

### Styling (Tailwind CSS + CSS Variables)
- Theme switching: light / dark (stored in localStorage and Firebase)
- CSS custom properties for theming:
  - `bg-cdsurface` - card/panel background
  - `border-cdborder` - border color
  - `text-cdtext` - primary text
  - `text-cdmuted` - secondary/muted text
  - `text-cdaccent` - accent color (yellow in dark, blue in light)
- Card styling: `bg-cdsurface border border-cdborder rounded-xl`
- Input styling: `bg-slate-700 border-slate-600 text-white` (dark) or equivalent light

### Language (UI vs comments)
- **User-facing strings** (labels, empty states, errors, coach copy): **English only** for new and changed code (see `.cursorrules`).
- **Code comments**: Prefer English; older files may still contain Dutch notes.

### Dates (calendar order in the UI)
- **User-editable calendar dates** must use **day/month/year (dd/mm/yyyy)** order in the interface, independent of the browser locale. Use `NlDateInput` plus `formatIsoToNlDmy` / `parseNlDmyToIso` from `src/utils/formatters.js` (state stays ISO `YYYY-MM-DD` internally).
- Do **not** use `<input type="date">` for app-controlled ranges: native pickers follow the OS locale (often mm/dd/yyyy). Prefer `NlDateInput` or explicit dd/mm formatting.

### File Size Guideline (from AGENTS.md)
- Files exceeding 200 lines should be evaluated for extraction into helper modules
- Follow Separation of Concerns: keep business logic out of UI components

## Data Structures

### Activity Object
```javascript
{
  id: string,
  date: string,           // ISO date or formatted
  type: string,           // "Ride", "VirtualRide", "Run", etc.
  title: string,
  distance: number,       // km
  climbing: number,       // meters
  avg_speed: number,      // km/h
  norm_power: number,     // watts (Normalized Power)
  avg_power: number,      // watts
  load: number,           // Training Stress Score
  rpe: number,            // Rate of Perceived Exertion (1-10)
  moving_time: string     // "HH:MM:SS"
}
```

### User Settings
```javascript
{
  weight: number,         // kg
  bikeWeight: number,     // kg
  ftp: number,            // watts (Functional Threshold Power)
  maxHr: number,          // bpm
  privacyMode: boolean,   // hides sensitive data in UI
  goals: {
    yearlyKm: number,
    targetFtp: number,
    targetWeight: number
  },
  notifications: {
    highLoad: number,
    lowPower: number,
    minWeight: number,
    restDay: number
  },
  powerZones: array,      // Coggan zones (calculated from FTP)
  githubPat: string       // GitHub PAT for manual nightly-sync trigger
}
```

### Climb Object
```javascript
{
  id: string,
  name: string,
  country: string,        // "FR", "IT", "CH", "NL", "ZWIFT"
  lengthKm: number,
  elevation: number,      // meters
  avgGrade: number,       // percentage
  flag: string            // emoji flag
}
```

## Firebase Integration

- **Project**: `climb-performance-lab`
- **Database**: Firestore (document storage)
- **Auth**: Google Authentication (`signInWithPopup`)
- **Collections**: User settings and activities stored per user (keyed by `user_{uid}` or `user_prefs`)
- **API Key**: Public (safe for client-side apps)
- **Exports**: `db`, `auth`, `analytics`, `loginWithGoogle()`, `logout()`

## External Integrations

### Intervals.icu (Direct API)

**Architecture**: `useIntervalsSync` hook → Intervals.icu REST API (direct)

- **Endpoint**: `https://intervals.icu/api/v1/athlete/{athleteId}/activities`
- **Auth**: Basic Auth (`API_KEY:{apiKey}` base64 encoded)
- **Params**: `oldest`, `newest` (date range)
- **Normalization**: `src/utils/intervals.js` → `normalizeIntervalsActivity()`

### Intervals.icu (Cloud Function)

**Architecture**: `intervalsCloudApi.js` → Cloud Function → Intervals.icu API (when not using direct browser API key)

- **Endpoint**: `https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2`
- **Caching**: 1-hour LocalStorage cache per date range

**Request format** (POST):
```json
{
    "athlete_id": "i12345",
    "api_key": "your-api-key",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "sport_types": ["Ride", "VirtualRide"]
}
```

**Indoor/Virtual Activity Handling**:
- `icu_distance` → distance
- `icu_average_watts` → avg_power
- `icu_weighted_avg_watts` → norm_power
- `icu_training_load` → load (TSS equivalent)

**Deployment**: See `cloud-function/README.md` for Google Cloud deployment steps

## Testing

**Vitest is configured** with coverage reporting.

```
src/__tests__/
├── fixtures/                   # Test data
│   ├── sample-garmin-eu.csv
│   ├── sample-garmin-us.csv
│   ├── sample-intervals-api.json
│   └── activities-with-duplicates.json
└── utils/                      # Unit tests for src/utils/
    ├── analytics.test.js
    ├── calculations.test.js
    ├── dedup.test.js
    ├── duplicateDetection.test.js
    ├── formatters.test.js
    ├── intervals.test.js
    └── parsers.test.js
```

**Coverage thresholds** (vitest.config.js):
- Statements: 60%
- Branches: 50%
- Functions: 60%
- Lines: 60%

**Test scope**: Currently covers `src/utils/**/*.js` only. Components are not tested.

## Important Notes for AI Assistants

### When Making Changes

1. **Read before editing**: Always read files before modifying them
2. **English UI**: Do not add new user-facing Dutch or other non-English strings; translate legacy Dutch when you touch that UI.
3. **Maintain theming**: Use `cd*` CSS variables (cdtext, cdsurface, etc.) for new UI — not hardcoded slate colors
4. **Respect modular structure**: Add logic to `src/utils/`, `src/hooks/`, or `src/services/` as appropriate — not directly in components
5. **No TypeScript**: Project uses plain JavaScript with JSX
6. **File size limit**: Keep files under ~200 lines; extract logic if needed
7. **Full code output**: Never truncate code with placeholders (see AGENTS.md)

### Common Tasks

- **Adding a new climb**: Edit `src/climbs.js`, add to `CLIMB_DATABASE` array
- **Modifying physics calculations**: Edit `src/components/PhysicsEngine.jsx`
- **Adding activity columns**: Update `src/config.js` `activityColumns` array
- **Adding a utility function**: Add to appropriate file in `src/utils/`
- **Adding a new hook**: Create in `src/hooks/`
- **Changing UI layout**: Use Tailwind utility classes with `cd*` CSS variables

### Build Configuration

- **Base path**: `/Climb-Performance-Lab/` (for GitHub Pages)
- **Version injection**: Auto-generated from git commit hash (in `vite.config.js`)
- **Environment**: ESM modules (`"type": "module"` in package.json)
- **Test environment**: `node` (not jsdom — components are not unit tested)

### Things to Avoid

- Do not add authentication flows beyond the existing Google Sign-In
- Do not change the base path without understanding deployment implications
- Do not remove Tailwind CDN link from `index.html`
- Do not modify Firebase config unless credentials need updating
- Do not hardcode slate color classes for themed elements — use `cd*` variables
- Do not create monolithic components; prefer splitting into `data-hub/` style subdirectories

## Deployment

- Built for GitHub Pages deployment
- Build output: `/dist/` directory
- Base path configured in `vite.config.js`

## Git Workflow

- No enforced commit message format
- Feature branches prefixed with `claude/` (AI) or `feature/` (manual)
- Main development branch: `main`
- Claude development branches follow pattern: `claude/<description>-<id>`
