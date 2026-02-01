/**
 * src/config.js
 * Vaste configuratie voor de UI en Data Structuren
 */

export const APP_VERSION = "v0.9.2"; // <--- PAS DIT AAN BIJ ELKE UPDATE

// 1. Kolomdefinities voor Activity Log & Import Preview
// Hiermee garandeer je dat beide tabellen exact dezelfde indeling hebben.
export const ACTIVITY_COLUMNS = [
    { key: 'date',        label: 'Date',  align: 'left',   width: 'w-24' },
    { key: 'type',        label: 'Type',  align: 'center', width: 'w-12' },
    { key: 'title',       label: 'Title', align: 'left',   width: 'flex-1' },
    { key: 'moving_time', label: 'Time',  align: 'right',  width: 'w-20' },
    { key: 'distance',    label: 'Dist',  align: 'right',  width: 'w-16' },
    { key: 'climbing',    label: 'Elev',  align: 'right',  width: 'w-16' },
    { key: 'avg_speed',   label: 'Spd',   align: 'right',  width: 'w-16' },
    { key: 'norm_power',  label: 'NP',    align: 'right',  width: 'w-16', highlight: 'yellow' },
    { key: 'avg_power',   label: 'Avg',   align: 'right',  width: 'w-16' },
    { key: 'load',        label: 'Load',  align: 'right',  width: 'w-16', highlight: 'blue' },
    { key: 'rpe',         label: 'RPE',   align: 'right',  width: 'w-12' },
    // Power Curve kolommen (1m, 5m, 10m, 20m, 60m)
    { key: 'best_1min',   label: '1m',    align: 'right',  width: 'w-14', text: 'slate-500' },
    { key: 'best_5min',   label: '5m',    align: 'right',  width: 'w-14', text: 'slate-500' },
    { key: 'best_10min',  label: '10m',   align: 'right',  width: 'w-14', text: 'slate-500' },
    { key: 'best_20min',  label: '20m',   align: 'right',  width: 'w-14', text: 'slate-500' },
    { key: 'best_60min',  label: '60m',   align: 'right',  width: 'w-14', text: 'slate-500' },
];

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