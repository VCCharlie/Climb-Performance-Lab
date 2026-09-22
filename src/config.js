/**
 * src/config.js
 * Vaste configuratie voor de UI en Data Structuren
 */

export const APP_VERSION = "v0.9.2"; // <--- PAS DIT AAN BIJ ELKE UPDATE

/** Default TSS for Activity Log → Mark recovery bulk action (overridable in Settings). */
export const DEFAULT_RECOVERY_TSS = 35;

// 1. Kolomdefinities voor Activity Log & Import Preview
// Hiermee garandeer je dat beide tabellen exact dezelfde indeling hebben.
export const ACTIVITY_COLUMNS = [
    { key: 'date', label: 'Date', align: 'left', width: 'w-[4.25rem]' },
    { key: 'type', label: 'Type', align: 'center', width: 'w-9' },
    /** UI only — kept for CSV/schema continuity; hidden in table (see hideInTable). */
    { key: 'data_source', label: 'Source', align: 'center', width: 'w-[4.5rem]', hideInTable: true },
    { key: 'title', label: 'Title', align: 'left', width: 'min-w-0 max-w-[240px] truncate' },
    /** Populated from Strava activity detail (segment_efforts) after gear/map enrich — see strava_kom_summary. */
    { key: 'strava_kom_summary', label: 'Seg', align: 'left', width: 'w-[4.5rem]', omitFromExport: true, hideByDefault: true },
    { key: 'gear_name', label: 'Bike', align: 'left', width: 'w-24 max-w-[7rem]', hideByDefault: true },
    { key: 'moving_time', label: 'Time', align: 'right', width: 'w-[3.25rem]' },
    { key: 'distance', label: 'Dist', align: 'right', width: 'w-11' },
    { key: 'climbing', label: 'Elev', align: 'right', width: 'w-11' },
    { key: 'avg_speed', label: 'Spd', align: 'right', width: 'w-9', hideByDefault: true },
    { key: 'norm_power', label: 'NP', align: 'right', width: 'w-9', highlight: 'yellow' },
    /** UI-only: NP ÷ profile FTP; omitted from CSV export. */
    { key: 'intensity_factor', label: 'IF', align: 'right', width: 'w-9', omitFromExport: true, hideByDefault: true },
    /** UI-only: NP ÷ average power (Variability Index). */
    { key: 'variability_index', label: 'VI', align: 'right', width: 'w-9', omitFromExport: true, hideByDefault: true },
    /** UI-only: NP ÷ average HR (Efficiency Factor, W/bpm). */
    { key: 'efficiency_factor', label: 'EF', pickerLabel: 'EF (W/bpm)', align: 'right', width: 'w-10', omitFromExport: true, hideByDefault: true },
    { key: 'avg_power', label: 'Avg', pickerLabel: 'Avg Pwr', align: 'right', width: 'w-9', hideByDefault: true },
    { key: 'avg_hr', label: 'HR', pickerLabel: 'Avg HR', align: 'right', width: 'w-9', hideByDefault: true },
    { key: 'max_hr', label: 'Max', pickerLabel: 'Max HR', align: 'right', width: 'w-9', hideByDefault: true },
    { key: 'work', label: 'kJ', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'load', label: 'Load', align: 'right', width: 'w-10', highlight: 'blue' },
    { key: 'rpe', label: 'RPE', align: 'right', width: 'w-8', hideByDefault: true },
    /** Stream-based steady-ride HR drift (first vs second half). */
    { key: 'decoupling_pct', label: 'Dec', pickerLabel: 'Decoupling %', align: 'right', width: 'w-10', omitFromExport: true, hideByDefault: true },
    /** Stream-based threshold tempo HR drift. */
    { key: 'threshold_drift_pct', label: 'Thr', pickerLabel: 'Threshold drift %', align: 'right', width: 'w-10', omitFromExport: true, hideByDefault: true },
    /** Stream-based race / variable-effort HR drift. */
    { key: 'race_drift_pct', label: 'Race', pickerLabel: 'Race drift %', align: 'right', width: 'w-10', omitFromExport: true, hideByDefault: true },
    // Power Curve kolommen (1m, 5m, 10m, 20m, 60m)
    { key: 'best_1min', label: '1m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_5min', label: '5m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_10min', label: '10m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_20min', label: '20m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_60min', label: '60m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_90min', label: '90m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_120min', label: '120m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_150min', label: '150m', align: 'right', width: 'w-10', hideByDefault: true },
    { key: 'best_180min', label: '180m', align: 'right', width: 'w-10', hideByDefault: true },
];

/** Columns shown in Activity Log / Import preview tables (excludes hideInTable). */
export const ACTIVITY_TABLE_COLUMNS = ACTIVITY_COLUMNS.filter((c) => !c.hideInTable);

/** Default visible keys for Activity Log (columns without hideByDefault). */
export const ACTIVITY_LOG_DEFAULT_VISIBLE_KEYS = ACTIVITY_TABLE_COLUMNS
    .filter((c) => !c.hideByDefault)
    .map((c) => c.key);

/**
 * Activity Log column presets — keys must exist in ACTIVITY_TABLE_COLUMNS.
 * `full` is resolved dynamically to all table column keys.
 */
export const ACTIVITY_COLUMN_PRESETS = {
    essential: ['date', 'type', 'title', 'moving_time', 'distance', 'avg_speed', 'climbing', 'norm_power', 'load'],
    power: [
        'date', 'type', 'title', 'moving_time', 'distance', 'climbing',
        'norm_power', 'load', 'avg_power', 'intensity_factor', 'variability_index', 'efficiency_factor',
        'decoupling_pct', 'threshold_drift_pct', 'race_drift_pct',
        'best_1min', 'best_5min', 'best_20min', 'best_90min', 'best_120min',
    ],
    full: null,
};

export const ACTIVITY_COLUMN_PRESET_LABELS = {
    essential: 'Essential',
    power: 'Power',
    full: 'Full',
};

// 2. Sport Filters
export const SPORT_TYPES = [
    "Ride",
    "VirtualRide",
    "GravelRide",
    "MountainBikeRide",
    "EBikeRide",
    "Run",
    "Walk",
    "Hike"
];

// 3. Maandvolgorde voor sortering
export const MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// 4. API Endpoints
export const CLOUD_SYNC_URL = "https://sync-intervals-97555677694.europe-west1.run.app";
/** Server-side Strava OAuth — deploy cloud-function/strava_oauth.py as Cloud Run service strava-oauth */
const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

export const STRAVA_OAUTH_URL =
    viteEnv?.VITE_STRAVA_OAUTH_URL
    || 'https://strava-oauth-97555677694.europe-west1.run.app';
/** Public Strava app id — baked at build from GitHub secret STRAVA_CLIENT_ID (optional fallback: cloud ?route=config) */
export const STRAVA_CLIENT_ID = viteEnv?.VITE_STRAVA_CLIENT_ID || '';
export const OPENWEATHER_PROXY_URL =
    viteEnv?.VITE_OPENWEATHER_PROXY_URL
    || 'https://europe-west1-climb-performance-lab.cloudfunctions.net/openweather-proxy';
