import React, { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import {
    mergeVolumeGoals,
    currentWeekRange,
    currentMonthRange,
    currentYearRange,
    sumVolumeForRange,
} from '../../utils/volumeGoals';
import { VolumeGoalPeriodCard } from './VolumeGoalPeriodCard';

/** @typedef {'weekly'|'monthly'|'yearly'} PeriodId */

/**
 * @param {object} props
 * @param {object[]} props.chartData
 * @param {object} props.userSettings
 * @param {(key: string, value: unknown) => void} props.updateUserSettings
 * @param {boolean} [props.cloudVolumeGoalsSynced] when false, goals stay on this device only until you sign in
 */
const VolumeGoalsPanel = ({ chartData = [], userSettings, updateUserSettings, cloudVolumeGoalsSynced = false }) => {
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

            {!cloudVolumeGoalsSynced && (
                <p className="text-[11px] text-yellow-600 dark:text-yellow-400/95 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-3 py-2 mb-3">
                    Sign in with Google (header) to sync these goals across your devices. While signed out, changes stay in this browser only.
                </p>
            )}

            {!collapsed && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {sections.map(({ id, title, subtitle, range, g, s }) => (
                        <VolumeGoalPeriodCard
                            key={id}
                            title={title}
                            subtitle={subtitle}
                            range={range}
                            g={g}
                            s={s}
                            nowRef={nowRef}
                            isEd={editing[id]}
                            dr={drafts[id]}
                            onStartEdit={() => startEdit(id)}
                            onCancelEdit={() => cancelEdit(id)}
                            onApplyEdit={() => applyEdit(id)}
                            onBumpDraft={(field, delta) => bumpDraft(id, field, delta)}
                            onDraftChange={(field, value) => {
                                setDrafts((d) => {
                                    const cur = d[id];
                                    if (!cur) return d;
                                    return { ...d, [id]: { ...cur, [field]: value } };
                                });
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default VolumeGoalsPanel;
