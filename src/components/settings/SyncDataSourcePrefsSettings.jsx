import React from 'react';
import { GitMerge } from 'lucide-react';
import { SegmentedControl } from '../ui';
import {
    DEFAULT_SYNC_DATA_SOURCE_PREFS,
    mergeSyncDataSourcePrefs,
} from '../../utils/syncDataSourcePrefs.js';

const SOURCE_OPTIONS = [
    { value: 'strava', label: 'Strava' },
    { value: 'intervals', label: 'Intervals' },
];

const PREF_ROWS = [
    {
        key: 'elevation',
        label: 'Elevation (climbing meters)',
        hint: 'Strava uses map-corrected gain; Intervals uses bike-computer totals. Manual edits in the activity modal always win.',
    },
    {
        key: 'title',
        label: 'Title (Strava-linked rides)',
        hint: 'Strava keeps custom route names; Intervals keeps device profile or Intervals titles on re-sync.',
    },
    {
        key: 'gearAndType',
        label: 'Gear & sport type',
        hint: 'Strava keeps bike name and VirtualRide/GravelRide labels; Intervals overwrites with head-unit data when present.',
    },
];

export default function SyncDataSourcePrefsSettings({ userSettings, updateUserSettings }) {
    const prefs = mergeSyncDataSourcePrefs(userSettings?.syncDataSourcePrefs);

    const updatePref = (key, value) => {
        const next = mergeSyncDataSourcePrefs({
            ...prefs,
            [key]: value,
        });
        updateUserSettings('syncDataSourcePrefs', next);
    };

    return (
        <div className="pt-2 border-t border-cdborder/30 mt-2">
            <div className="flex items-center gap-2 mb-2">
                <GitMerge size={14} className="text-cdmuted shrink-0" aria-hidden />
                <p className="text-xs font-semibold text-cdtext">Data source on re-sync</p>
            </div>
            <p className="text-xs text-cdmuted mb-3 leading-relaxed">
                When Intervals fetch merges into an activity that already has Strava data, choose which source wins per field.
            </p>
            <div className="space-y-3">
                {PREF_ROWS.map(({ key, label, hint }) => (
                    <div key={key}>
                        <label className="block text-[10px] font-semibold mb-1 text-cdmuted">{label}</label>
                        <SegmentedControl
                            size="sm"
                            options={SOURCE_OPTIONS}
                            value={prefs[key]}
                            onChange={(value) => updatePref(key, value)}
                            aria-label={label}
                        />
                        <p className="text-[10px] text-cdmuted mt-1 leading-snug">{hint}</p>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="mt-3 text-xs text-cdaccent hover:underline"
                onClick={() => updateUserSettings('syncDataSourcePrefs', { ...DEFAULT_SYNC_DATA_SOURCE_PREFS })}
            >
                Reset data source prefs to defaults (Strava)
            </button>
        </div>
    );
}
