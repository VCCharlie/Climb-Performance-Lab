import React, { useMemo } from 'react';
import { Mountain, TrendingUp, Activity, Gauge } from 'lucide-react';
import { computeClimbingReadiness } from '../../utils/climbingReadiness';
import { chartCardClass } from '../../utils/chartTheme';
import { useProfileFtp } from '../../context/ProfileFtpContext';

const BADGE_STYLES = {
    recover: 'bg-red-500/15 text-red-400 border-red-500/40',
    building: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/40',
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

/**
 * Dashboard card: climbing-specific readiness from elevation, Z2 proxy, TSS, and TSB.
 */
const ClimbingReadinessCard = ({ activities, userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;

    const readiness = useMemo(
        () => computeClimbingReadiness({ activities: activities || [], ftp }),
        [activities, ftp],
    );

    if (!activities?.length) return null;

    const badgeClass = BADGE_STYLES[readiness.badge.key] || BADGE_STYLES.building;

    return (
        <section className={`${chartCardClass} p-4 md:p-5 space-y-4`} aria-label="Climbing readiness">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-cdtext flex items-center gap-2">
                        <Mountain className="text-cdaccent shrink-0" size={18} aria-hidden />
                        Climbing readiness
                    </h3>
                    <p className="text-xs text-cdmuted mt-0.5">
                        This week ({readiness.weekLabel}) — score {readiness.composite}/100
                    </p>
                </div>
                <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${badgeClass}`}
                >
                    <Gauge size={14} aria-hidden />
                    {readiness.badge.label}
                </span>
            </div>

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
                    detail={`${readiness.metrics.elevationM} m`}
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
