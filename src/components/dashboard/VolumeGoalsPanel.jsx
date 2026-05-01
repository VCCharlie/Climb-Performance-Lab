import React, { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Pencil, Target, X } from 'lucide-react';
import {
    mergeVolumeGoals,
    currentWeekRange,
    currentMonthRange,
    currentYearRange,
    sumVolumeForRange,
    progressPercent,
    calendarElapsedRatio,
    calendarProgressLabel,
    getVolumeScheduleStatus,
} from '../../utils/volumeGoals';

const inputCls =
    'w-full min-w-0 border border-cdborder rounded px-2 py-1.5 text-sm font-mono bg-cdsurface text-cdtext outline-none focus:ring-2 focus:ring-cdaccent/40';

/**
 * @param {number} h decimal hours
 */
function formatHoursShort(h) {
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
function PeriodTimeStrip({ range, nowRef }) {
    const { spanDays, dayOfPeriod, pct } = calendarProgressLabel(range, nowRef);
    const pctDisplay = Math.round(ratio * 1000) / 10;

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
 * @param {{ distanceKm: number, movingTimeH: number, elevationM: number }} s
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} nowRef
 */
function aggregatePaceSummary(g, s, range, nowRef) {
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
    const behind = usable.filter((st) => st === 'behind').length;
    const ahead = usable.filter((st) => st === 'ahead').length;
    const onTrack = usable.filter((st) => st === 'on_track').length;

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

function GoalRow({ label, current, target, unit, formatCurrent, formatTarget, paceStatus }) {
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

/** @typedef {'weekly'|'monthly'|'yearly'} PeriodId */

/**
 * @param {object} props
 * @param {object[]} props.chartData
 * @param {object} props.userSettings
 * @param {(key: string, value: unknown) => void} props.updateUserSettings
 */
const VolumeGoalsPanel = ({ chartData = [], userSettings, updateUserSettings }) => {
    const [collapsed, setCollapsed] = useState(false);
    /** @type {Record<PeriodId, boolean>} */
    const [editing, setEditing] = useState({ weekly: false, monthly: false, yearly: false });
    /** @type {Record<PeriodId, { distanceKm: string, movingTimeHours: string, elevationM: string } | null>} */
    const [drafts, setDrafts] = useState({ weekly: null, monthly: null, yearly: null });

    const goals = useMemo(() => mergeVolumeGoals(userSettings?.volumeGoals), [userSettings?.volumeGoals]);

    const nowRef = useMemo(() => new Date(), []);

    const week = useMemo(() => currentWeekRange(nowRef), [nowRef]);
    const month = useMemo(() => currentMonthRange(nowRef), [nowRef]);
    const year = useMemo(() => currentYearRange(nowRef), [nowRef]);

    const sums = useMemo(() => {
        const w = sumVolumeForRange(chartData, week.startYmd, week.endYmd);
        const m = sumVolumeForRange(chartData, month.startYmd, month.endYmd);
        const y = sumVolumeForRange(chartData, year.startYmd, year.endYmd);
        return {
            week: { ...w, movingTimeH: w.movingTimeSec / 3600 },
            month: { ...m, movingTimeH: m.movingTimeSec / 3600 },
            year: { ...y, movingTimeH: y.movingTimeSec / 3600 },
        };
    }, [chartData, week.startYmd, week.endYmd, month.startYmd, month.endYmd, year.startYmd, year.endYmd]);

    const commitGoals = useCallback(
        (nextMerged) => {
            updateUserSettings('volumeGoals', nextMerged);
        },
        [updateUserSettings],
    );

    const startEdit = (id) => {
        const g = goals[id];
        setDrafts((d) => ({
            ...d,
            [id]: {
                distanceKm: g.distanceKm ? String(g.distanceKm) : '',
                movingTimeHours: g.movingTimeHours ? String(g.movingTimeHours) : '',
                elevationM: g.elevationM ? String(g.elevationM) : '',
            },
        }));
        setEditing((e) => ({ ...e, [id]: true }));
    };

    const cancelEdit = (id) => {
        setDrafts((d) => ({ ...d, [id]: null }));
        setEditing((e) => ({ ...e, [id]: false }));
    };

    const applyEdit = (id) => {
        const dr = drafts[id];
        if (!dr) return;
        const next = mergeVolumeGoals(goals);
        next[id] = {
            distanceKm: Math.max(0, Number(dr.distanceKm) || 0),
            movingTimeHours: Math.max(0, Number(dr.movingTimeHours) || 0),
            elevationM: Math.max(0, Number(dr.elevationM) || 0),
        };
        commitGoals(next);
        setDrafts((d) => ({ ...d, [id]: null }));
        setEditing((e) => ({ ...e, [id]: false }));
    };

    const bumpDraft = (id, field, delta) => {
        setDrafts((d) => {
            const cur = d[id];
            if (!cur) return d;
            const prev = Number(cur[field]) || 0;
            const nextVal = Math.max(0, prev + delta);
            const decimals = field === 'movingTimeHours' ? 1 : 0;
            const str = decimals ? String(Math.round(nextVal * 10) / 10) : String(Math.round(nextVal));
            return { ...d, [id]: { ...cur, [field]: str } };
        });
    };

    const sections = [
        { id: 'weekly', title: 'This week', subtitle: week.label, range: week, g: goals.weekly, s: sums.week },
        { id: 'monthly', title: 'This month', subtitle: month.label, range: month, g: goals.monthly, s: sums.month },
        { id: 'yearly', title: 'This year', subtitle: year.label, range: year, g: goals.yearly, s: sums.year },
    ];

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-4 shadow-xl">
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="flex w-full items-center justify-between gap-2 text-left mb-1"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-5 h-5 text-cdaccent shrink-0" aria-hidden />
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Training goals</h3>
                        <p className="text-[11px] text-cdmuted truncate">
                            Weekly, monthly, and yearly volume — distance, moving time, elevation. Pace vs calendar time.
                        </p>
                    </div>
                </div>
                {collapsed ? <ChevronDown className="w-5 h-5 text-cdmuted shrink-0" /> : <ChevronUp className="w-5 h-5 text-cdmuted shrink-0" />}
            </button>

            {!collapsed && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {sections.map(({ id, title, subtitle, range, g, s }) => {
                        const summary = aggregatePaceSummary(g, s, range, nowRef);
                        const summaryCls =
                            summary.tone === 'behind'
                                ? 'text-amber-700 dark:text-amber-400'
                                : summary.tone === 'ahead'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : summary.tone === 'mixed'
                                    ? 'text-cdaccent'
                                    : 'text-cdmuted';

                        const paceDist = getVolumeScheduleStatus(s.distanceKm, g.distanceKm, range, nowRef);
                        const paceTime = getVolumeScheduleStatus(s.movingTimeSec, g.movingTimeHours * 3600, range, nowRef);
                        const paceElev = getVolumeScheduleStatus(s.elevationM, g.elevationM, range, nowRef);

                        const isEd = editing[id];
                        const dr = drafts[id];

                        return (
                            <div key={id} className="rounded-lg border border-cdborder/80 bg-cdbg/30 p-3 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <div className="text-xs font-bold text-cdtext">{title}</div>
                                        <div className="text-[10px] text-cdmuted">{subtitle}</div>
                                    </div>
                                    {!isEd ? (
                                        <button
                                            type="button"
                                            onClick={() => startEdit(id)}
                                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cdaccent hover:underline px-1 py-0.5 rounded border border-cdborder/60 hover:bg-cdborder/30"
                                        >
                                            <Pencil className="w-3 h-3" aria-hidden />
                                            Edit
                                        </button>
                                    ) : (
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => cancelEdit(id)}
                                                className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:bg-cdborder/40"
                                            >
                                                <X className="w-3 h-3" aria-hidden />
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyEdit(id)}
                                                className="px-2 py-1 text-[10px] font-bold rounded bg-cdaccent text-white hover:opacity-90"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-1">Period time</div>
                                    <PeriodTimeStrip range={range} nowRef={nowRef} />
                                    <p className={`text-[10px] mt-2 leading-snug ${summaryCls}`}>{summary.text}</p>
                                </div>

                                <div className="space-y-3">
                                    <GoalRow
                                        label="Distance"
                                        current={s.distanceKm}
                                        target={g.distanceKm}
                                        unit="km"
                                        formatCurrent={(v) => (Math.round(v * 10) / 10).toFixed(1)}
                                        formatTarget={(v) => String(Math.round(v * 10) / 10)}
                                        paceStatus={paceDist}
                                    />
                                    <GoalRow
                                        label="Moving time"
                                        current={s.movingTimeH}
                                        target={g.movingTimeHours}
                                        unit="h"
                                        formatCurrent={formatHoursShort}
                                        formatTarget={(v) => formatHoursShort(v)}
                                        paceStatus={paceTime}
                                    />
                                    <GoalRow
                                        label="Elevation"
                                        current={s.elevationM}
                                        target={g.elevationM}
                                        unit="m"
                                        formatCurrent={(v) => String(Math.round(v))}
                                        formatTarget={(v) => String(Math.round(v))}
                                        paceStatus={paceElev}
                                    />
                                </div>

                                <div className="pt-2 border-t border-cdborder/50 space-y-2">
                                    <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Targets</div>
                                    {!isEd ? (
                                        <div className="grid grid-cols-3 gap-2 text-[10px] text-cdtext">
                                            <div>
                                                <span className="text-cdmuted block text-[9px]">km</span>
                                                <span className="font-mono font-semibold">{g.distanceKm || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-cdmuted block text-[9px]">hours</span>
                                                <span className="font-mono font-semibold">
                                                    {g.movingTimeHours ? formatHoursShort(g.movingTimeHours) : '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-cdmuted block text-[9px]">m</span>
                                                <span className="font-mono font-semibold">{g.elevationM || '—'}</span>
                                            </div>
                                        </div>
                                    ) : dr ? (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                <label className="space-y-0.5">
                                                    <span className="text-cdmuted block">km</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        value={dr.distanceKm}
                                                        onChange={(e) =>
                                                            setDrafts((d) => ({ ...d, [id]: { ...dr, distanceKm: e.target.value } }))
                                                        }
                                                        className={inputCls}
                                                        aria-label={`${title} distance goal km`}
                                                    />
                                                    <div className="flex gap-0.5 mt-0.5">
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'distanceKm', -10)}>-10</button>
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'distanceKm', 10)}>+10</button>
                                                    </div>
                                                </label>
                                                <label className="space-y-0.5">
                                                    <span className="text-cdmuted block">hours</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.5}
                                                        value={dr.movingTimeHours}
                                                        onChange={(e) =>
                                                            setDrafts((d) => ({ ...d, [id]: { ...dr, movingTimeHours: e.target.value } }))
                                                        }
                                                        className={inputCls}
                                                        aria-label={`${title} moving time goal hours`}
                                                    />
                                                    <div className="flex gap-0.5 mt-0.5">
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'movingTimeHours', -0.5)}>-0.5</button>
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'movingTimeHours', 0.5)}>+0.5</button>
                                                    </div>
                                                </label>
                                                <label className="space-y-0.5">
                                                    <span className="text-cdmuted block">m</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={100}
                                                        value={dr.elevationM}
                                                        onChange={(e) =>
                                                            setDrafts((d) => ({ ...d, [id]: { ...dr, elevationM: e.target.value } }))
                                                        }
                                                        className={inputCls}
                                                        aria-label={`${title} elevation goal meters`}
                                                    />
                                                    <div className="flex gap-0.5 mt-0.5">
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'elevationM', -250)}>-250</button>
                                                        <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => bumpDraft(id, 'elevationM', 250)}>+250</button>
                                                    </div>
                                                </label>
                                            </div>
                                            <p className="text-[9px] text-cdmuted">Changes apply only after you tap Apply.</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default VolumeGoalsPanel;
