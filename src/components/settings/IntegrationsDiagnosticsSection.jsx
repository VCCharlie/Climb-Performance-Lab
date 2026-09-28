import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { buildIntegrationDiagnosticsLines } from '../../utils/integrationDiagnostics.js';
import { describeSyncDepth, normalizeSyncDepth } from '../../utils/intervalsSyncDepth.js';

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
        label: 'Default sync depth (Settings)',
        value: describeSyncDepth(normalizeSyncDepth(userSettings?.defaultIntervalsSyncDepth)),
        tone: 'muted',
    }), [userSettings?.defaultIntervalsSyncDepth]);

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
            </ul>
            <p className="text-[10px] text-cdmuted mt-2 leading-snug">
                Use Activities → Intervals sync → <strong className="text-cdtext">Full</strong> mode when you need Strava link, gear, segments, and HR drift after import.
            </p>
        </div>
    );
}
