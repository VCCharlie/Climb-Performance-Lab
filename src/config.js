/**
 * src/config.js
 * Vaste configuratie voor de UI en Data Structuren
 */

export const APP_VERSION = "v0.9.2"; // <--- PAS DIT AAN BIJ ELKE UPDATE

// 1. Kolomdefinities voor Activity Log & Import Preview
// Hiermee garandeer je dat beide tabellen exact dezelfde indeling hebben.
export const ACTIVITY_COLUMNS = [
    { key: 'date', label: 'Date', align: 'left', width: 'w-20' },
    { key: 'type', label: 'Type', align: 'center', width: 'w-10' },
    /** UI only — kept for CSV/schema continuity; hidden in table (see hideInTable). */
    { key: 'data_source', label: 'Source', align: 'center', width: 'w-[4.5rem]', hideInTable: true },
    { key: 'title', label: 'Title', align: 'left', width: 'min-w-[120px] max-w-[200px] truncate' },
    /** Derived in UI from title vs climb database — not stored on activity documents. */
    { key: 'matched_climb', label: 'Climb', align: 'left', width: 'w-24 max-w-[140px]', omitFromExport: true },
    { key: 'gear_name', label: 'Bike', align: 'left', width: 'w-28' },
    { key: 'moving_time', label: 'Time', align: 'right', width: 'w-14' },
    { key: 'distance', label: 'Dist', align: 'right', width: 'w-12' },
    { key: 'climbing', label: 'Elev', align: 'right', width: 'w-12' },
    { key: 'avg_speed', label: 'Spd', align: 'right', width: 'w-10' },
    { key: 'norm_power', label: 'NP', align: 'right', width: 'w-10', highlight: 'yellow' },
    { key: 'avg_power', label: 'Avg', align: 'right', width: 'w-10' },
    { key: 'avg_hr', label: 'HR', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'max_hr', label: 'Max', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'work', label: 'kJ', align: 'right', width: 'w-12', text: 'slate-400' },
    { key: 'load', label: 'Load', align: 'right', width: 'w-12', highlight: 'blue' },
    { key: 'rpe', label: 'RPE', align: 'right', width: 'w-10' },
    // Power Curve kolommen (1m, 5m, 10m, 20m, 60m)
    { key: 'best_1min', label: '1m', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'best_5min', label: '5m', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'best_10min', label: '10m', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'best_20min', label: '20m', align: 'right', width: 'w-10', text: 'slate-400' },
    { key: 'best_60min', label: '60m', align: 'right', width: 'w-10', text: 'slate-400' },
];

/** Columns shown in Activity Log / Import preview tables (excludes hideInTable). */
export const ACTIVITY_TABLE_COLUMNS = ACTIVITY_COLUMNS.filter((c) => !c.hideInTable);

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