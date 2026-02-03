# CLAUDE.md - AI Assistant Guide for Climb Performance Lab

## Project Overview

**Climb Performance Lab** is a React-based single-page application (SPA) for cycling performance analysis, specifically focused on climbing metrics. The app helps cyclists analyze, plan, and optimize their climbing ability through:

- Physics-based climb time/power calculations
- Training data import (CSV, Intervals.icu integration)
- Performance trend visualization
- Race nutrition planning
- Cloud sync via Firebase

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework (functional components with hooks) |
| Vite | 7.2.7 | Build tool and dev server |
| Firebase/Firestore | 12.7.0 | Cloud database and sync |
| Tailwind CSS | CDN | Utility-first styling |
| Framer Motion | 12.24.7 | Animations |
| Recharts | 3.6.0 | Data visualization |
| Lucide React | 0.562.0 | Icon library |
| ESLint | 9.39.2 | Code linting (flat config format) |

## Directory Structure

```
Climb-Performance-Lab/
├── src/
│   ├── components/           # React components
│   │   ├── Header.jsx        # App header with branding & version badge
│   │   ├── Dashboard.jsx     # Performance trend visualization (area chart)
│   │   ├── PhysicsEngine.jsx # Climb calculation engine (Newton-Raphson solver)
│   │   ├── DataHub.jsx       # CSV import, activity log, Intervals.icu sync
│   │   ├── FuelingStrategy.jsx # Race fueling calculator
│   │   ├── ClimbProfileCard.jsx # Tactical climb profile display
│   │   └── SettingsTab.jsx   # User settings & cloud sync config
│   │
│   ├── assets/               # Static assets (logos, images)
│   ├── App.jsx               # Main app component (tab routing, state management)
│   ├── main.jsx              # React DOM entry point
│   ├── index.css             # Global CSS (dark theme, custom scrollbars)
│   ├── climbs.js             # Database of 150+ real-world & Zwift climbs
│   ├── config.js             # Constants (activity columns, sport types, months)
│   ├── firebase.js           # Firebase initialization
│   └── utils.js              # CSV parsing, formatting, calculations
│
├── cloud-function/           # Python Cloud Function for Intervals.icu sync
│   ├── main.py               # Cloud function entry point
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Deployment instructions
│
├── public/                   # Static public assets
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration (version injection, base path)
├── eslint.config.js          # ESLint flat config
└── index.html                # HTML entry point (includes Tailwind CDN)
```

## Development Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # Create production build (outputs to /dist)
npm run lint     # Run ESLint checks
npm run preview  # Preview production build locally
```

## Key Components Explained

### App.jsx
- Main application component managing global state
- Tab-based navigation (Physics Engine, Data Hub, Fueling Strategy, Settings)
- Handles Firebase sync for user settings and activities
- State: `activities`, `settings`, `selectedClimb`

### PhysicsEngine.jsx
- Core physics calculations for climb time estimation
- Uses Newton-Raphson numerical solver
- Accounts for: gravity, rolling resistance, air drag, drivetrain losses
- Requires: rider weight, bike weight, FTP, climb gradient/length

### DataHub.jsx
- Imports training data from CSV files (handles multiple delimiter formats)
- Displays activity log with sorting and filtering
- Integrates with Intervals.icu API via cloud function
- Cloud sync URL: `https://sync-intervals-97555677694.europe-west1.run.app`

### climbs.js
- Database of 150+ climbs from France, Italy, Switzerland, Netherlands
- Includes Zwift virtual climbs
- Coggan power zones definition
- Structure: `{ id, name, country, lengthKm, elevation, avgGrade, flag }`

### utils.js
- CSV parsing with smart delimiter detection (comma, semicolon, tab)
- Number parsing for NL/US formats
- Date formatting utilities
- Activity type detection

## Code Conventions

### Naming
- **Components**: PascalCase (`DataHub`, `PhysicsEngine`)
- **Functions/Variables**: camelCase (`parseCSV`, `selectedClimb`)
- **Constants**: SCREAMING_SNAKE_CASE (`CLIMB_DATABASE`, `COGGAN_ZONES`)

### React Patterns
- Functional components with hooks (`useState`, `useEffect`, `useMemo`)
- Props-based state lifting (parent `App.jsx` manages global state)
- Conditional rendering for tab navigation

### Styling (Tailwind CSS)
- Dark theme: slate color palette (50-950)
- Primary accent: `yellow-400`
- Secondary accent: `orange-500`
- Card styling: `bg-slate-800 border border-slate-700 rounded-xl`
- Input styling: `bg-slate-700 border-slate-600 text-white`

### Comments
- Some comments are in Dutch (nl) - this is intentional
- Code logic comments in English where present

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
  norm_power: number,     // watts
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
  maxHr: number           // bpm
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
- **Collections**: User settings and activities stored per user
- **Auth**: No authentication (public access)
- **API Key**: Public (safe for client-side apps)

## External Integrations

### Intervals.icu

**Architecture**: Frontend (DataHub.jsx) → Cloud Function (Python) → Intervals.icu API

**Cloud Function**: Located in `cloud-function/` directory
- Endpoint: `https://sync-intervals-97555677694.europe-west1.run.app`
- Receives: athlete_id, api_key, date range, sport filters
- Returns: Transformed activity data

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
The cloud function maps these Intervals.icu fields for indoor rides:
- `icu_distance` → distance (trainer-reported)
- `icu_average_watts` → avg_power
- `icu_weighted_avg_watts` → norm_power (Normalized Power)
- `icu_training_load` → load (TSS equivalent)

**Deployment**: See `cloud-function/README.md` for Google Cloud deployment steps

## Important Notes for AI Assistants

### When Making Changes

1. **Read before editing**: Always read files before modifying them
2. **Preserve Dutch comments**: Some comments are intentionally in Dutch
3. **Maintain dark theme**: Use slate color palette for new UI elements
4. **No tests exist**: Code quality relies on ESLint and manual verification
5. **No TypeScript**: Project uses plain JavaScript with JSX

### Common Tasks

- **Adding a new climb**: Edit `src/climbs.js`, add to `CLIMB_DATABASE` array
- **Modifying physics calculations**: Edit `src/components/PhysicsEngine.jsx`
- **Adding activity columns**: Update `src/config.js` `activityColumns` array
- **Changing UI layout**: Most components use Tailwind utility classes

### Build Configuration

- **Base path**: `/Climb-Performance-Lab/` (for GitHub Pages)
- **Version injection**: Auto-generated from git commit hash
- **Environment**: ESM modules (`"type": "module"` in package.json)

### Things to Avoid

- Do not add authentication without explicit request
- Do not change the base path without understanding deployment implications
- Do not remove Tailwind CDN link from `index.html`
- Do not modify Firebase config unless credentials need updating

## Testing

**No automated tests are configured.** Testing is manual only.

If adding tests in the future:
- Recommended: Vitest (compatible with Vite)
- Test files should use `.test.js` or `.spec.js` extension
- Add test script to `package.json`

## Deployment

- Built for GitHub Pages deployment
- Build output: `/dist/` directory
- Base path configured in `vite.config.js`

## Git Workflow

- No enforced commit message format
- Feature branches typically prefixed with purpose (e.g., `claude/`, `feature/`)
- Main development happens on feature branches before merging
