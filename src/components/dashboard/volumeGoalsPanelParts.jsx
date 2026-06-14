import React from 'react';
import { calendarProgressLabel, getVolumeScheduleStatus, progressPercent } from '../../utils/volumeGoals';

export const inputCls =
    'w-full min-w-0 border border-cdborder rounded px-2 py-1.5 text-sm font-mono bg-cdsurface text-cdtext outline-none focus:ring-2 focus:ring-cdaccent/40';

/** @param {number} h decimal hours */
export function formatHoursShort(h) {
    const n = Number(h);
    if (!n || Number.isNaN(n)) return '0';
    if (n >= 10) return n.toFixed(1);
    return n.toFixed(2).replace(/\.?0+$/, '') || '0';
}

const PACE_LABELS = {
    no_target: null,
    early: 'Early in period',
    ahead: 'Ahead of pace',
    on_track: 'On track',
    behind: 'Behind pace',
};

const PACE_BADGE = {
    ahead: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
    on_track: 'text-cdtext bg-cdborder/40',
    behind: 'text-amber-700 dark:text-amber-400 bg-amber-500/15',
    early: 'text-cdmuted bg-cdborder/30',
    no_target: '',
};

/**
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} nowRef
 */
export function PeriodTimeStrip({ range, nowRef }) {
    const { spanDays, dayOfPeriod, pct } = calendarProgressLabel(range, nowRef);
    const pctDisplay = pct;

    return (
        <div className="space-y-1.5">
            <div className="relative h-2.5 rounded-full bg-cdborder/50 overflow-hidden border border-cdborder/40">
                <div
                    className="absolute inset-y-0 left-0 bg-cdaccent/35 rounded-l-full transition-all duration-500"
                    style={{ width: `${pctDisplay}%` }}
                    title="Time elapsed in this period"
                />
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-cdtext shadow-sm z-10 transition-all duration-500"
                    style={{ left: `min(calc(100% - 2px), max(0px, ${pctDisplay}% - 1px))` }}
                    title="Now"
                />
            </div>
            <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[10px] text-cdmuted">
                <span>
                    Day {dayOfPeriod} of {spanDays}
                </span>
                <span className="font-mono tabular-nums">{pct}% through period</span>
            </div>
        </div>
    );
}

/**
 * @param {{ distanceKm: number, movingTimeHours: number, elevationM: number }} g
 * @param {{ distanceKm: number, movingTimeSec: number, elevationM: number }} s
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} nowRef
 */
export function aggregatePaceSummary(g, s, range, nowRef) {
    const rows = [
        { cur: s.distanceKm, tgt: g.distanceKm },
        { cur: s.movingTimeSec, tgt: g.movingTimeHours * 3600 },
        { cur: s.elevationM, tgt: g.elevationM },
    ];
    const statuses = rows
        .filter((r) => r.tgt > 0)
        .map((r) => getVolumeScheduleStatus(r.cur, r.tgt, range, nowRef).status);

    if (statuses.length === 0) {
        return { text: 'Set targets below to see pace vs time.', tone: 'muted' };
    }
    if (statuses.every((st) => st === 'early')) {
        return { text: 'Period just started — pace compares after a few days.', tone: 'muted' };
    }
    const usable = statuses.filter((st) => st !== 'early');
    if (usable.length === 0) {
        return { text: 'Period just started — pace compares after a few days.', tone: 'muted' };
    }

    // ⚡ Bolt Optimization: Use single-pass for...of loop instead of multiple .filter().length
    let behind = 0;
    let ahead = 0;
    let onTrack = 0;
    for (const st of usable) {
        if (st === 'behind') behind++;
        else if (st === 'ahead') ahead++;
        else if (st === 'on_track') onTrack++;
    }

    if (behind > 0 && ahead === 0) {
        return { text: 'Overall: behind linear pace for your set goals.', tone: 'behind' };
    }
    if (behind > 0) {
        return { text: 'Mixed vs pace — some goals ahead, some behind (see badges).', tone: 'mixed' };
    }
    if (ahead > 0 && onTrack === 0) {
        return { text: 'Overall: ahead of linear pace — strong start.', tone: 'ahead' };
    }
    if (ahead > 0) {
        return { text: 'Overall: ahead or on track vs linear pace.', tone: 'ahead' };
    }
    return { text: 'Overall: on track vs linear pace.', tone: 'on' };
}

/**
 * @param {string} label
 * @param {number} expectedSameUnitAsTarget
 */
function formatLinearExpected(label, expectedSameUnitAsTarget) {
    if (label === 'Moving time') {
        return `${formatHoursShort(expectedSameUnitAsTarget / 3600)} h`;
    }
    if (label === 'Distance') {
        return `${(Math.round(expectedSameUnitAsTarget * 10) / 10).toFixed(1)} km`;
    }
    return `${Math.round(expectedSameUnitAsTarget)} m`;
}

export function GoalRow({ label, current, target, unit, formatCurrent, formatTarget, paceStatus }) {
    const pct = progressPercent(current, target);
    const done = target > 0 && current >= target;
    const pace = paceStatus && target > 0 ? paceStatus : null;
    const badgeText = pace ? PACE_LABELS[pace.status] : null;
    const badgeCls = pace ? PACE_BADGE[pace.status] : '';
    const showLinearMarker =
        target > 0 && pace && pace.status !== 'early' && pace.status !== 'no_target' && pace.elapsedRatio > 0;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-baseline gap-2 text-xs flex-wrap">
                <span className="text-cdmuted font-medium">{label}</span>
                <div className="flex items-baseline gap-2 shrink-0 flex-wrap justify-end">
                    {badgeText && pace?.status !== 'no_target' ? (
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${badgeCls}`}>
                            {badgeText}
                        </span>
                    ) : null}
                    <span className="text-cdtext font-mono tabular-nums">
                        {formatCurrent(current)}
                        <span className="text-cdmuted"> / </span>
                        {target > 0 ? formatTarget(target) : '—'}
                        {unit ? <span className="text-cdmuted ml-0.5">{unit}</span> : null}
                    </span>
                </div>
            </div>
            <div className="h-2 rounded-full bg-cdborder/60 overflow-hidden relative">
                {showLinearMarker ? (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cdmuted/80 z-[1]"
                        style={{ left: `${Math.min(100, pace.elapsedRatio * 100)}%` }}
                        title="Where you would be if volume matched calendar time evenly"
                    />
                ) : null}
                <div
                    className={`h-full rounded-full transition-all duration-300 relative z-[2] ${done ? 'bg-emerald-500' : 'bg-cdaccent'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                />
            </div>
            {target > 0 && pace && pace.status !== 'early' && pace.status !== 'no_target' && pace.expectedCurrent >= 0 ? (
                <div className="text-[10px] text-cdmuted text-right">
                    Linear expectation now: ~{formatLinearExpected(label, pace.expectedCurrent)}
                </div>
            ) : null}
            {target > 0 && (!pace || pace.status === 'early' || pace.status === 'no_target') ? (
                <div className="text-[10px] text-cdmuted text-right">{pct >= 100 ? 'Goal reached' : `${pct}% of goal`}</div>
            ) : null}
        </div>
    );
}
