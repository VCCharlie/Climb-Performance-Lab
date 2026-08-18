import React, { useMemo, useState } from 'react';
import { Mountain, TrendingUp, Activity, Gauge, HelpCircle } from 'lucide-react';
import {
    computeClimbingReadiness,
    computeClimbingReadinessHistory,
    CLIMBING_READINESS_EXPLANATION,
} from '../../utils/climbingReadiness';
import { normalizeTerrainProfile } from '../../utils/climbingTerrainProfile';
import { chartCardClass } from '../../utils/chartTheme';
import { useProfileFtp } from '../../context/ProfileFtpContext';

const BADGE_STYLES = {
    recover: 'bg-red-500/15 text-red-400 border-red-500/40',
    building: 'bg-cdprimary/15 text-cdprimary border-cdprimary/40',
    good: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    peak: 'bg-green-500/15 text-green-400 border-green-500/40',
};

function ScoreBar({ label, value, detail }) {
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    return (
        <div>
            <div className="flex justify-between text-[10px] mb-1">
                <span className="text-cdmuted font-medium uppercase tracking-wide">{label}</span>
                <span className="text-cdtext tabular-nums">{detail}</span>
            </div>
            <div className="h-1.5 rounded-full bg-cdborder/50 overflow-hidden">
                <div
                    className="h-full rounded-full bg-cdaccent transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function HistoryTable({ rows }) {
    if (!rows?.length) return null;
    return (
        <div className="overflow-x-auto rounded-lg border border-cdborder/50">
            <table className="w-full text-[11px] text-left">
                <thead className="bg-cdbg/50 text-cdmuted uppercase tracking-wide text-[10px]">
                    <tr>
                        <th className="px-2 py-1.5 font-bold">Period</th>
                        <th className="px-2 py-1.5 font-bold text-right">Score</th>
                        <th className="px-2 py-1.5 font-bold">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-cdborder/30">
                    {rows.map((row) => (
                        <tr key={row.label} className="text-cdtext">
                            <td className="px-2 py-1.5 text-cdmuted">{row.label}</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-right tabular-nums">
                                {row.composite}/100
                            </td>
                            <td className="px-2 py-1.5 text-cdmuted">{row.badgeLabel}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Dashboard card: climbing-specific readiness from elevation, Z2 proxy, TSS, and TSB.
 */
const ClimbingReadinessCard = ({ activities, userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const terrainProfile = normalizeTerrainProfile(userSettings?.terrainProfile);
    const [showHelp, setShowHelp] = useState(false);
    const [historyView, setHistoryView] = useState('week');

    const readiness = useMemo(
        () =>
            computeClimbingReadiness({
                activities: activities || [],
                ftp,
                terrainProfile,
            }),
        [activities, ftp, terrainProfile],
    );

    const history = useMemo(
        () =>
            computeClimbingReadinessHistory({
                activities: activities || [],
                ftp,
                terrainProfile,
            }),
        [activities, ftp, terrainProfile],
    );

    if (!activities?.length) return null;

    const badgeClass = BADGE_STYLES[readiness.badge.key] || BADGE_STYLES.building;
    const historyRows = historyView === 'month' ? history.months : history.weeks;

    return (
        <section className={`${chartCardClass} p-4 md:p-5 space-y-4`} aria-label="Climbing readiness">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-cdtext flex items-center gap-2">
                        <Mountain className="text-cdaccent shrink-0" size={18} aria-hidden />
                        Climbing readiness
                        <button
                            type="button"
                            onClick={() => setShowHelp((v) => !v)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50 cd-transition"
                            aria-expanded={showHelp}
                            aria-label="How is the climbing readiness score calculated?"
                            title="How is this score calculated?"
                        >
                            <HelpCircle size={14} aria-hidden />
                        </button>
                    </h3>
                    <p className="text-xs text-cdmuted mt-0.5">
                        This week ({readiness.weekLabel}) — score {readiness.composite}/100 ·{' '}
                        {readiness.terrainLabel}
                    </p>
                </div>
                <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${badgeClass}`}
                >
                    <Gauge size={14} aria-hidden />
                    {readiness.badge.label}
                </span>
            </div>

            {showHelp && (
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 p-3 text-[11px] text-cdmuted space-y-2">
                    <p className="text-cdtext font-semibold">{CLIMBING_READINESS_EXPLANATION.title}</p>
                    <p className="leading-snug">{CLIMBING_READINESS_EXPLANATION.summary}</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                        {CLIMBING_READINESS_EXPLANATION.weights.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                    <p className="text-[10px] leading-snug">{CLIMBING_READINESS_EXPLANATION.terrainNote}</p>
                    <p className="text-[10px] leading-snug">{CLIMBING_READINESS_EXPLANATION.rollingNote}</p>
                    <p className="text-[10px] leading-snug">{CLIMBING_READINESS_EXPLANATION.historyNote}</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-2 py-2">
                    <div className="text-lg font-bold text-cdtext tabular-nums">{readiness.metrics.elevationM}</div>
                    <div className="text-[10px] text-cdmuted uppercase">Elev (m)</div>
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-2 py-2">
                    <div className="text-lg font-bold text-cdtext tabular-nums">{readiness.metrics.z2Hours}h</div>
                    <div className="text-[10px] text-cdmuted uppercase">
                        Z2 proxy{!readiness.hasFtp ? ' (no FTP)' : ''}
                    </div>
                    {readiness.z2Band && (
                        <div className="text-[9px] text-cdmuted mt-0.5 tabular-nums">
                            {readiness.z2Band.minPct}–{readiness.z2Band.maxPct}% FTP · {readiness.z2Band.minW}–{readiness.z2Band.maxW} W
                        </div>
                    )}
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-2 py-2">
                    <div className="text-lg font-bold text-cdtext tabular-nums">{readiness.metrics.weekTss}</div>
                    <div className="text-[10px] text-cdmuted uppercase">TSS (wk)</div>
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-2 py-2">
                    <div className="text-lg font-bold text-cdtext tabular-nums">
                        {readiness.metrics.tsb != null
                            ? `${readiness.metrics.tsb > 0 ? '+' : ''}${readiness.metrics.tsb}`
                            : '—'}
                    </div>
                    <div className="text-[10px] text-cdmuted uppercase">TSB</div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ScoreBar
                    label="Elevation"
                    value={readiness.scores.elevation}
                    detail={
                        readiness.usesRollingElevation &&
                        readiness.metrics.elevationForScoring !== readiness.metrics.elevationM
                            ? `${readiness.metrics.elevationM} m this week (score uses ${readiness.metrics.elevationForScoring} m blended)`
                            : `${readiness.metrics.elevationM} m`
                    }
                />
                <ScoreBar
                    label="Z2 endurance"
                    value={readiness.scores.z2}
                    detail={
                        readiness.z2Band
                            ? `${readiness.metrics.z2Hours} h (${readiness.z2Band.minW}–${readiness.z2Band.maxW} W)`
                            : `${readiness.metrics.z2Hours} h`
                    }
                />
                <ScoreBar
                    label="Weekly load"
                    value={readiness.scores.tss}
                    detail={`${readiness.metrics.weekTss} TSS`}
                />
                <ScoreBar
                    label="Form (TSB)"
                    value={readiness.scores.tsb}
                    detail={readiness.metrics.tsb != null ? String(readiness.metrics.tsb) : '—'}
                />
            </div>

            {readiness.hints.length > 0 && (
                <ul className="text-xs text-cdmuted space-y-1 border-t border-cdborder/60 pt-3">
                    {readiness.hints.map((hint) => (
                        <li key={hint} className="flex items-start gap-2">
                            <TrendingUp size={12} className="text-cdaccent shrink-0 mt-0.5" aria-hidden />
                            <span>{hint}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="border-t border-cdborder/60 pt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Score history</p>
                    <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden text-[10px] font-bold">
                        <button
                            type="button"
                            onClick={() => setHistoryView('week')}
                            className={`px-2.5 py-1 cd-transition ${
                                historyView === 'week' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'
                            }`}
                        >
                            Weekly
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryView('month')}
                            className={`px-2.5 py-1 cd-transition ${
                                historyView === 'month' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'
                            }`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
                <HistoryTable rows={historyRows} />
            </div>

            <p className="text-[10px] text-cdmuted flex items-center gap-1">
                <Activity size={10} aria-hidden />
                Z2 uses NP or avg power vs FTP
                {readiness.z2Band
                    ? ` (${readiness.z2Band.minPct}–${readiness.z2Band.maxPct}% → ${readiness.z2Band.minW}–${readiness.z2Band.maxW} W)`
                    : ' (55–75%)'}
                when zone time is not in your import.
            </p>
        </section>
    );
};

export default ClimbingReadinessCard;
