import React, { useMemo } from 'react';
import { Activity, Gauge } from 'lucide-react';
import { buildTrainingStatusOverview } from '../../utils/trainingStatusOverview';
import { useProfileFtp } from '../../context/ProfileFtpContext';

const BADGE_STYLES = {
    recover: 'bg-red-500/15 text-red-400 border-red-500/40',
    building: 'bg-cdprimary/15 text-cdprimary border-cdprimary/40',
    good: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    peak: 'bg-green-500/15 text-green-400 border-green-500/40',
};

function MetricCell({ label, value, colorClass = 'text-cdtext' }) {
    return (
        <div className="min-w-0 text-center px-2">
            <div className={`text-lg md:text-xl font-black tabular-nums ${colorClass}`}>
                {value ?? '—'}
            </div>
            <div className="text-[10px] text-cdmuted uppercase tracking-wide font-bold mt-0.5">
                {label}
            </div>
        </div>
    );
}

/**
 * Unified training status strip — CTL/ATL/TSB, week TSS %, climbing readiness badge.
 */
export default function TrainingStatusStrip({ activities, userSettings }) {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;

    const status = useMemo(
        () => buildTrainingStatusOverview({ activities, userSettings, ftp }),
        [activities, userSettings, ftp],
    );

    if (!status) return null;

    const tsbColor = status.tsb == null
        ? 'text-cdtext'
        : status.tsb < -10
            ? 'text-red-400'
            : status.tsb > 25
                ? 'text-blue-400'
                : status.tsb >= 5
                    ? 'text-green-400'
                    : 'text-cdprimary';

    const badgeClass = BADGE_STYLES[status.readinessBadge?.key] || BADGE_STYLES.building;
    const weekTssLabel = status.weekTssPct != null
        ? `${status.weekTss} TSS (${status.weekTssPct}%)`
        : `${status.weekTss} TSS`;

    return (
        <div
            className="rounded-lg border border-cdborder/60 bg-cdbg/30 px-3 py-3 md:px-4"
            aria-label="Training status"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Activity size={16} className="text-cdaccent shrink-0" aria-hidden />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                        Training status · {status.weekLabel}
                    </p>
                </div>
                <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border shrink-0 ${badgeClass}`}
                >
                    <Gauge size={12} aria-hidden />
                    {status.readinessBadge?.label}
                    <span className="tabular-nums font-mono normal-case">{status.readinessComposite}/100</span>
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCell label="CTL" value={status.ctl} colorClass="text-blue-400" />
                <MetricCell label="ATL" value={status.atl} colorClass="text-red-400" />
                <MetricCell label="TSB" value={status.tsb} colorClass={tsbColor} />
                <MetricCell
                    label={status.targetTss > 0 ? `Week TSS (target ${status.targetTss})` : 'Week TSS'}
                    value={weekTssLabel}
                    colorClass="text-cdaccent"
                />
            </div>
        </div>
    );
}
