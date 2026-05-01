import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import {
    mergeVolumeGoals,
    currentWeekRange,
    currentMonthRange,
    currentYearRange,
    sumVolumeForRange,
    progressPercent,
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

function GoalRow({ label, current, target, unit, formatCurrent, formatTarget }) {
    const pct = progressPercent(current, target);
    const done = target > 0 && current >= target;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-baseline gap-2 text-xs">
                <span className="text-cdmuted font-medium">{label}</span>
                <span className="text-cdtext font-mono tabular-nums shrink-0">
                    {formatCurrent(current)}
                    <span className="text-cdmuted"> / </span>
                    {target > 0 ? formatTarget(target) : '—'}
                    {unit ? <span className="text-cdmuted ml-0.5">{unit}</span> : null}
                </span>
            </div>
            <div className="h-2 rounded-full bg-cdborder/60 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-emerald-500' : 'bg-cdaccent'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                />
            </div>
            {target > 0 && (
                <div className="text-[10px] text-cdmuted text-right">{pct >= 100 ? 'Goal reached' : `${pct}% of goal`}</div>
            )}
        </div>
    );
}

/**
 * @param {object} props
 * @param {object[]} props.chartData - Full activity list (same source as Dashboard charts)
 * @param {object} props.userSettings
 * @param {(key: string, value: unknown) => void} props.updateUserSettings
 */
const VolumeGoalsPanel = ({ chartData = [], userSettings, updateUserSettings }) => {
    const [collapsed, setCollapsed] = useState(false);
    const goals = useMemo(() => mergeVolumeGoals(userSettings?.volumeGoals), [userSettings?.volumeGoals]);

    const week = useMemo(() => currentWeekRange(), []);
    const month = useMemo(() => currentMonthRange(), []);
    const year = useMemo(() => currentYearRange(), []);

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

    const patchGoal = (period, field, raw) => {
        const num = Math.max(0, Number(raw) || 0);
        const next = mergeVolumeGoals(goals);
        next[period] = { ...next[period], [field]: num };
        updateUserSettings('volumeGoals', next);
    };

    const sections = [
        {
            id: 'weekly',
            title: 'This week',
            subtitle: week.label,
            g: goals.weekly,
            s: sums.week,
        },
        {
            id: 'monthly',
            title: 'This month',
            subtitle: month.label,
            g: goals.monthly,
            s: sums.month,
        },
        {
            id: 'yearly',
            title: 'This year',
            subtitle: year.label,
            g: goals.yearly,
            s: sums.year,
        },
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
                            Weekly, monthly, and yearly volume (like Strava) — distance, moving time, elevation
                        </p>
                    </div>
                </div>
                {collapsed ? <ChevronDown className="w-5 h-5 text-cdmuted shrink-0" /> : <ChevronUp className="w-5 h-5 text-cdmuted shrink-0" />}
            </button>

            {!collapsed && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {sections.map(({ id, title, subtitle, g, s }) => (
                        <div
                            key={id}
                            className="rounded-lg border border-cdborder/80 bg-cdbg/30 p-3 space-y-3"
                        >
                            <div>
                                <div className="text-xs font-bold text-cdtext">{title}</div>
                                <div className="text-[10px] text-cdmuted">{subtitle}</div>
                            </div>

                            <div className="space-y-3">
                                <GoalRow
                                    label="Distance"
                                    current={s.distanceKm}
                                    target={g.distanceKm}
                                    unit="km"
                                    formatCurrent={(v) => (Math.round(v * 10) / 10).toFixed(1)}
                                    formatTarget={(v) => String(Math.round(v * 10) / 10)}
                                />
                                <GoalRow
                                    label="Moving time"
                                    current={s.movingTimeH}
                                    target={g.movingTimeHours}
                                    unit="h"
                                    formatCurrent={formatHoursShort}
                                    formatTarget={(v) => formatHoursShort(v)}
                                />
                                <GoalRow
                                    label="Elevation"
                                    current={s.elevationM}
                                    target={g.elevationM}
                                    unit="m"
                                    formatCurrent={(v) => String(Math.round(v))}
                                    formatTarget={(v) => String(Math.round(v))}
                                />
                            </div>

                            <div className="pt-2 border-t border-cdborder/50 space-y-2">
                                <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Targets</div>
                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                    <label className="space-y-0.5">
                                        <span className="text-cdmuted block">km</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={g.distanceKm || ''}
                                            onChange={(e) => patchGoal(id, 'distanceKm', e.target.value)}
                                            className={inputCls}
                                            aria-label={`${title} distance goal km`}
                                        />
                                    </label>
                                    <label className="space-y-0.5">
                                        <span className="text-cdmuted block">hours</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.5}
                                            value={g.movingTimeHours || ''}
                                            onChange={(e) => patchGoal(id, 'movingTimeHours', e.target.value)}
                                            className={inputCls}
                                            aria-label={`${title} moving time goal hours`}
                                        />
                                    </label>
                                    <label className="space-y-0.5">
                                        <span className="text-cdmuted block">m</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={100}
                                            value={g.elevationM || ''}
                                            onChange={(e) => patchGoal(id, 'elevationM', e.target.value)}
                                            className={inputCls}
                                            aria-label={`${title} elevation goal meters`}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VolumeGoalsPanel;
