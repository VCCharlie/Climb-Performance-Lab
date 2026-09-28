import React from 'react';
import { Layers } from 'lucide-react';
import { inputNumberClass } from '../ui';
import {
    DEFAULT_SYNC_ENRICH_LIMITS,
    SYNC_ENRICH_LIMIT_BOUNDS,
    mergeSyncEnrichLimits,
} from '../../utils/syncEnrichLimits.js';

const LIMIT_FIELDS = [
    {
        key: 'driftMaxFetches',
        label: 'HR drift (date range sync)',
        hint: 'Max power+HR stream fetches after Full sync when the range spans multiple days.',
    },
    {
        key: 'driftMaxFetchesToday',
        label: 'HR drift (single-day sync)',
        hint: 'Higher cap for Sync today and single-day Fetch & merge.',
    },
    {
        key: 'zoneTimesMaxFetches',
        label: 'Zone times (detail fetches)',
        hint: 'Intervals activity-detail calls for power/HR zone times. Use 0 to skip (list fields only).',
    },
    {
        key: 'powerCurveMaxFetches',
        label: 'Power curve bests',
        hint: 'Intervals power-curve fetches for missing long-duration bests. Use 0 to skip.',
    },
];

export default function SyncEnrichLimitsSettings({ userSettings, updateUserSettings }) {
    const limits = mergeSyncEnrichLimits(userSettings?.syncEnrichLimits);

    const updateLimit = (key, rawValue) => {
        const bounds = SYNC_ENRICH_LIMIT_BOUNDS[key];
        const next = mergeSyncEnrichLimits({
            ...limits,
            [key]: rawValue,
        });
        updateUserSettings('syncEnrichLimits', next);
    };

    return (
        <div className="pt-2 border-t border-cdborder/30 mt-2">
            <div className="flex items-center gap-2 mb-2">
                <Layers size={14} className="text-cdmuted shrink-0" aria-hidden />
                <p className="text-xs font-semibold text-cdtext">Full sync enrichment limits</p>
            </div>
            <p className="text-xs text-cdmuted mb-3 leading-relaxed">
                These caps apply only in <strong className="text-cdtext font-medium">Full</strong> sync depth
                (Intervals detail + post-sync HR drift). Lower values speed up sync; higher values analyze more rides per run.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LIMIT_FIELDS.map(({ key, label, hint }) => {
                    const bounds = SYNC_ENRICH_LIMIT_BOUNDS[key];
                    return (
                        <div key={key}>
                            <label className="block text-[10px] font-semibold mb-1 text-cdmuted">{label}</label>
                            <input
                                type="number"
                                min={bounds.min}
                                max={bounds.max}
                                value={limits[key]}
                                onChange={(e) => updateLimit(key, e.target.value)}
                                className={inputNumberClass}
                            />
                            <p className="text-[10px] text-cdmuted mt-1 leading-snug">{hint}</p>
                        </div>
                    );
                })}
            </div>
            <button
                type="button"
                className="mt-3 text-xs text-cdaccent hover:underline"
                onClick={() => updateUserSettings('syncEnrichLimits', { ...DEFAULT_SYNC_ENRICH_LIMITS })}
            >
                Reset enrichment limits to defaults
            </button>
        </div>
    );
}
