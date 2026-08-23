import React, { useMemo } from 'react';
import { HeartPulse, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { chartCardClass } from '../../utils/chartTheme';
import {
    buildDriftProfilePortfolio,
    buildDriftProfileTrend,
} from '../../utils/coach/rideDriftTrend';
import { DRIFT_PROFILE } from '../../utils/coach/rideDurability';
import {
    AEROBIC_TREND_STATUS,
    classifyDecouplingPercent,
    decouplingStatusLabel,
} from '../../utils/coach/aerobicDecoupling';
import { useProfileFtp } from '../../context/ProfileFtpContext';
import { todayYmd } from '../../utils/coach/coachHelpers';

function TrendBadge({ status }) {
    if (status === AEROBIC_TREND_STATUS.IMPROVING) {
        return (
            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <TrendingUp size={14} aria-hidden /> Improving
            </span>
        );
    }
    if (status === AEROBIC_TREND_STATUS.DECLINING) {
        return (
            <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-bold">
                <TrendingDown size={14} aria-hidden /> Declining
            </span>
        );
    }
    if (status === AEROBIC_TREND_STATUS.STABLE) {
        return (
            <span className="inline-flex items-center gap-1 text-cdmuted text-xs font-bold">
                <Minus size={14} aria-hidden /> Stable
            </span>
        );
    }
    return <span className="text-xs text-cdmuted">Insufficient steady rides</span>;
}

/**
 * Snapshot of steady-ride aerobic efficiency — deep link to Coach HR drift panel.
 */
export default function AerobicEfficiencySnapshotCard({
    activities,
    userSettings,
    onGoToCoachHrDrift,
}) {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const referenceYmd = todayYmd();

    const trend = useMemo(
        () => buildDriftProfileTrend(activities, ftp, DRIFT_PROFILE.STEADY, { referenceYmd, weeks: 12 }),
        [activities, ftp, referenceYmd],
    );

    const portfolio = useMemo(
        () => buildDriftProfilePortfolio(activities, ftp, DRIFT_PROFILE.STEADY, { referenceYmd, weeks: 12 }),
        [activities, ftp, referenceYmd],
    );

    const avgEf = portfolio?.avgEfFirst ?? trend?.weeklyPoints?.find((w) => w.avgEf != null)?.avgEf;
    const portfolioStatus = portfolio?.avgDecouplingPct != null
        ? classifyDecouplingPercent(portfolio.avgDecouplingPct)
        : null;

    return (
        <div className={chartCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2 min-w-0">
                    <HeartPulse className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">
                            Aerobic efficiency
                        </h3>
                        <p className="text-[11px] text-cdmuted">
                            Steady endurance rides — watts per heartbeat (EF) and cardiac drift trend
                        </p>
                    </div>
                </div>
                <TrendBadge status={trend?.trendStatus} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-3 py-2 text-center">
                    <div className="text-xl font-black text-cdtext tabular-nums">
                        {avgEf != null ? avgEf.toFixed(2) : '—'}
                    </div>
                    <div className="text-[10px] text-cdmuted uppercase">Avg EF (W/bpm)</div>
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-3 py-2 text-center">
                    <div className="text-xl font-black text-cdtext tabular-nums">
                        {portfolio?.avgDriftPct != null ? `${portfolio.avgDriftPct.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-[10px] text-cdmuted uppercase">Avg decoupling</div>
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-3 py-2 text-center">
                    <div className="text-xl font-black text-cdtext tabular-nums">
                        {portfolio?.analyzedCount ?? 0}
                    </div>
                    <div className="text-[10px] text-cdmuted uppercase">Analyzed rides</div>
                </div>
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-3 py-2 text-center">
                    <div className="text-sm font-bold text-cdtext">
                        {portfolioStatus
                            ? decouplingStatusLabel(portfolioStatus)
                            : '—'}
                    </div>
                    <div className="text-[10px] text-cdmuted uppercase">Portfolio</div>
                </div>
            </div>

            {onGoToCoachHrDrift ? (
                <button
                    type="button"
                    onClick={onGoToCoachHrDrift}
                    className="text-xs font-bold text-cdaccent hover:underline cd-focus-ring rounded"
                >
                    Open HR drift &amp; aerobic efficiency in Coach →
                </button>
            ) : null}
        </div>
    );
}
