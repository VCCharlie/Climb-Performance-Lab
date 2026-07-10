import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import {
    deriveVolumeGoalsFromYearlyGoals,
    scaleVolumeGoals,
    currentWeekRange,
    currentMonthRange,
    currentYearRange,
    sumVolumeForRange,
} from '../../utils/volumeGoals';
import { VolumeGoalPeriodCard } from './VolumeGoalPeriodCard';
import { chartCardClass } from '../../utils/chartTheme';

const PREVIEW_SCALE_MIN = 50;
const PREVIEW_SCALE_MAX = 150;
const PREVIEW_SCALE_STEP = 5;

/**
 * @param {object} props
 * @param {object[]} props.chartData
 * @param {object} props.userSettings
 * @param {() => void} [props.onOpenSettings]
 */
const VolumeGoalsPanel = ({ chartData = [], userSettings, onOpenSettings }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [previewScalePct, setPreviewScalePct] = useState(100);

    const baseGoals = useMemo(
        () => deriveVolumeGoalsFromYearlyGoals(userSettings?.goals),
        [userSettings?.goals],
    );

    const goals = useMemo(() => {
        const factor = previewScalePct / 100;
        return scaleVolumeGoals(baseGoals, factor);
    }, [baseGoals, previewScalePct]);

    const previewActive = previewScalePct !== 100;

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

    const sections = [
        { id: 'weekly', title: 'This week', subtitle: week.label, range: week, g: goals.weekly, s: sums.week },
        { id: 'monthly', title: 'This month', subtitle: month.label, range: month, g: goals.monthly, s: sums.month },
        { id: 'yearly', title: 'This year', subtitle: year.label, range: year, g: goals.yearly, s: sums.year },
    ];

    return (
        <div className={chartCardClass}>
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

            <p className="text-[11px] text-cdmuted leading-snug mt-2">
                Yearly targets live in Settings → Performance &amp; Goals. Weekly and monthly bars are calculated automatically (÷52 and ÷12).
                {onOpenSettings ? (
                    <>
                        {' '}
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="text-cdaccent font-semibold hover:underline"
                        >
                            Open settings
                        </button>
                    </>
                ) : null}
            </p>

            {!collapsed && (
                <>
                    <div className="mt-4 rounded-lg border border-cdborder/70 bg-cdbg/30 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label htmlFor="volume-goal-preview-scale" className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">
                                Goal preview scale
                            </label>
                            <div className="flex items-center gap-2">
                                {previewActive ? (
                                    <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">
                                        Preview only — resets on refresh
                                    </span>
                                ) : null}
                                <span className="text-xs font-mono tabular-nums text-cdtext min-w-[3ch] text-right">{previewScalePct}%</span>
                            </div>
                        </div>
                        <input
                            id="volume-goal-preview-scale"
                            type="range"
                            min={PREVIEW_SCALE_MIN}
                            max={PREVIEW_SCALE_MAX}
                            step={PREVIEW_SCALE_STEP}
                            value={previewScalePct}
                            onChange={(e) => setPreviewScalePct(Number(e.target.value))}
                            className="w-full accent-cdaccent"
                            aria-valuemin={PREVIEW_SCALE_MIN}
                            aria-valuemax={PREVIEW_SCALE_MAX}
                            aria-valuenow={previewScalePct}
                            aria-label="Temporary goal preview scale; does not change saved settings"
                        />
                        <div className="flex justify-between text-[9px] text-cdmuted font-mono tabular-nums">
                            <span>{PREVIEW_SCALE_MIN}%</span>
                            <span>100%</span>
                            <span>{PREVIEW_SCALE_MAX}%</span>
                        </div>
                    </div>

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
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default VolumeGoalsPanel;
