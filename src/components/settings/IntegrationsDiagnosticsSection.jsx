import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { buildIntegrationDiagnosticsLines } from '../../utils/integrationDiagnostics.js';
import { describeSyncDepth, normalizeSyncDepth } from '../../utils/intervalsSyncDepth.js';
import { formatSyncEnrichLimitsSummary, resolveSyncEnrichLimits } from '../../utils/syncEnrichLimits.js';
import { formatSyncDataSourcePrefsSummary, resolveSyncDataSourcePrefs } from '../../utils/syncDataSourcePrefs.js';

const toneClass = {
    ok: 'text-cdtext',
    warn: 'text-cdaccent',
    muted: 'text-cdmuted',
};

/**
 * Read-only integration status (Intervals route, Strava, last sync health).
 */
export default function IntegrationsDiagnosticsSection({
    intervalsConfig,
    stravaConfig,
    isSignedIn = false,
    userSettings = null,
}) {
    const lines = useMemo(
        () => buildIntegrationDiagnosticsLines({ intervalsConfig, stravaConfig, isSignedIn }),
        [intervalsConfig, stravaConfig, isSignedIn],
    );

    const defaultDepthLine = useMemo(() => ({
        label: 'Default sync depth (Settings + nightly)',
        value: describeSyncDepth(normalizeSyncDepth(userSettings?.defaultIntervalsSyncDepth)),
        tone: 'muted',
    }), [userSettings?.defaultIntervalsSyncDepth]);

    const nightlyWindowLine = useMemo(() => {
        const days = Number(userSettings?.defaultSyncRangeDays) > 0
            ? Math.round(Number(userSettings.defaultSyncRangeDays))
            : 14;
        return {
            label: 'Nightly sync window (GitHub Actions)',
            value: `Last ${days} days · same depth & enrich limits as above`,
            tone: 'muted',
        };
    }, [userSettings?.defaultSyncRangeDays]);

    const enrichLimitsLine = useMemo(() => ({
        label: 'Full sync enrich limits (Settings)',
        value: formatSyncEnrichLimitsSummary(resolveSyncEnrichLimits(userSettings)),
        tone: 'muted',
    }), [userSettings?.syncEnrichLimits]);

    const dataSourceLine = useMemo(() => ({
        label: 'Re-sync data sources (Settings)',
        value: formatSyncDataSourcePrefsSummary(resolveSyncDataSourcePrefs(userSettings)),
        tone: 'muted',
    }), [userSettings?.syncDataSourcePrefs]);

    return (
        <div className="rounded-cdmd border border-cdborder/60 bg-cdsurface/50 p-3 mt-4">
            <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-cdmuted shrink-0" aria-hidden />
                <h4 className="text-xs font-semibold text-cdtext uppercase tracking-wide">Integration diagnostics</h4>
            </div>
            <ul className="space-y-1.5">
                {lines.map((line) => (
                    <li key={line.label} className="text-xs leading-snug">
                        <span className="font-medium text-cdtext">{line.label}: </span>
                        <span className={toneClass[line.tone] || toneClass.muted}>{line.value}</span>
                    </li>
                ))}
                <li className="text-xs leading-snug">
                    <span className="font-medium text-cdtext">{defaultDepthLine.label}: </span>
                    <span className={toneClass[defaultDepthLine.tone]}>{defaultDepthLine.value}</span>
                </li>
                <li className="text-xs leading-snug">
                    <span className="font-medium text-cdtext">{enrichLimitsLine.label}: </span>
                    <span className={toneClass[enrichLimitsLine.tone]}>{enrichLimitsLine.value}</span>
                </li>
                <li className="text-xs leading-snug">
                    <span className="font-medium text-cdtext">{dataSourceLine.label}: </span>
                    <span className={toneClass[dataSourceLine.tone]}>{dataSourceLine.value}</span>
                </li>
            </ul>
            <p className="text-[10px] text-cdmuted mt-2 leading-snug">
                Use Activities → Intervals sync → <strong className="text-cdtext">Full</strong> mode when you need Strava link, gear, segments, and HR drift after import.
            </p>
        </div>
    );
}
