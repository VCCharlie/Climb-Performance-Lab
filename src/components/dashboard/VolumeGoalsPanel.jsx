import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';
import { deriveVolumeGoalsFromYearlyGoals, scaleVolumeGoals, currentWeekRange, currentMonthRange, currentYearRange, sumVolumeForRange } from '../../utils/volumeGoals';
import { projectYearEndVolume } from '../../utils/yearEndProjection';
import { VolumeGoalPeriodCard } from './VolumeGoalPeriodCard';
import { chartCardClass } from '../../utils/chartTheme';

const PREVIEW_SCALE_MIN = 50;
const PREVIEW_SCALE_MAX = 150;
const PREVIEW_SCALE_STEP = 1;

function clampPreviewScale(value) {
    return Math.min(PREVIEW_SCALE_MAX, Math.max(PREVIEW_SCALE_MIN, Math.round(Number(value) || 100)));
}

/**
 * Compact preview scale control — inline in header (desktop) or slim row (mobile).
 * @param {object} props
 * @param {string} props.id
 * @param {number} props.value
 * @param {(n: number) => void} props.onChange
 * @param {boolean} props.previewActive
 * @param {'header' | 'mobile'} [props.variant]
 */
function GoalPreviewScale({ id, value, onChange, previewActive, variant = 'header' }) {
    const isMobile = variant === 'mobile';
    const nudge = (delta) => onChange(clampPreviewScale(value + delta));

    const stepBtnClass =
        'shrink-0 w-5 h-5 flex items-center justify-center rounded border border-cdborder/70 text-cdmuted hover:bg-cdborder/40 hover:text-cdtext text-[11px] font-bold leading-none cd-focus-ring';

    return (
        <div
            className={
                isMobile
                    ? 'flex items-center gap-1.5 w-full rounded-md border border-cdborder/60 bg-cdbg/40 px-2 py-1.5'
                    : 'flex items-center gap-1 shrink-0 rounded-md border border-cdborder/60 bg-cdbg/40 px-1.5 py-1'
            }
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="group"
            aria-label="Goal preview scale"
        >
            <span
                className={`font-bold uppercase tracking-wide text-cdmuted whitespace-nowrap ${
                    isMobile ? 'text-[9px] w-11' : 'text-[8px] hidden md:inline'
                }`}
            >
                Preview
            </span>
            <button
                type="button"
                className={stepBtnClass}
                onClick={() => nudge(-1)}
                aria-label="Decrease preview scale by 1 percent"
            >
                −
            </button>
            <input
                id={id}
                type="range"
                min={PREVIEW_SCALE_MIN}
                max={PREVIEW_SCALE_MAX}
                step={PREVIEW_SCALE_STEP}
                value={value}
                onChange={(e) => onChange(clampPreviewScale(e.target.value))}
                className={`accent-cdaccent cursor-pointer ${
                    isMobile ? 'flex-1 min-w-0 h-1.5' : 'w-20 lg:w-24 h-1.5'
                }`}
                aria-valuemin={PREVIEW_SCALE_MIN}
                aria-valuemax={PREVIEW_SCALE_MAX}
                aria-valuenow={value}
                aria-label="Temporary goal preview scale; does not change saved settings"
            />
            <button
                type="button"
                className={stepBtnClass}
                onClick={() => nudge(1)}
                aria-label="Increase preview scale by 1 percent"
            >
                +
            </button>
            <span
                className={`font-mono tabular-nums text-cdtext text-right shrink-0 ${
                    isMobile ? 'text-[10px] w-9' : 'text-[10px] w-8'
                }`}
            >
                {value}%
            </span>
            {previewActive ? (
                <button
                    type="button"
                    className={`font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 shrink-0 hover:underline cd-focus-ring ${
                        isMobile ? 'text-[8px]' : 'text-[7px] hidden xl:inline'
                    }`}
                    title="Reset preview to 100%"
                    onClick={() => onChange(100)}
                >
                    {isMobile ? 'Reset' : 'Reset'}
                </button>
            ) : null}
        </div>
    );
}

/**
 * @param {object} props
 * @param {object[]} props.chartData
 * @param {object} props.userSettings
 * @param {() => void} [props.onOpenSettings]
 */
const VolumeGoalsPanel = ({ chartData = [], userSettings, onOpenSettings }) => {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [collapsed, setCollapsed] = useState(isMobile);
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

    const yearEndProjection = useMemo(
        () => projectYearEndVolume(sums.year, year, nowRef),
        [sums.year, year, nowRef],
    );

    const sections = [
        { id: 'weekly', title: 'This week', subtitle: week.label, range: week, g: goals.weekly, s: sums.week },
        { id: 'monthly', title: 'This month', subtitle: month.label, range: month, g: goals.monthly, s: sums.month },
        {
            id: 'yearly',
            title: 'This year',
            subtitle: year.label,
            range: year,
            g: goals.yearly,
            s: sums.year,
            yearEndProjection,
        },
    ];

    return (
        <div className={chartCardClass}>
            <div className="flex items-start gap-2 mb-1">
                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex flex-1 min-w-0 items-center gap-2 text-left"
                >
                    <Target className="w-5 h-5 text-cdaccent shrink-0" aria-hidden />
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Training goals</h3>
                        <p className="text-[11px] text-cdmuted line-clamp-2 sm:truncate">
                            Weekly, monthly, and yearly volume — distance, moving time, elevation. Pace vs calendar time.
                        </p>
                    </div>
                </button>

                {!collapsed ? (
                    <div className="hidden sm:block pt-0.5">
                        <GoalPreviewScale
                            id="volume-goal-preview-scale"
                            value={previewScalePct}
                            onChange={setPreviewScalePct}
                            previewActive={previewActive}
                            variant="header"
                        />
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="shrink-0 p-1 rounded-md text-cdmuted hover:bg-cdborder/30 cd-focus-ring"
                    aria-label={collapsed ? 'Expand training goals' : 'Collapse training goals'}
                >
                    {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
            </div>

            {!collapsed ? (
                <div className="sm:hidden mb-2">
                    <GoalPreviewScale
                        id="volume-goal-preview-scale-mobile"
                        value={previewScalePct}
                        onChange={setPreviewScalePct}
                        previewActive={previewActive}
                        variant="mobile"
                    />
                </div>
            ) : null}

            <p className="text-[11px] text-cdmuted leading-snug">
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
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {sections.map(({ id, title, subtitle, range, g, s, yearEndProjection: projection }) => (
                        <VolumeGoalPeriodCard
                            key={id}
                            title={title}
                            subtitle={subtitle}
                            range={range}
                            g={g}
                            s={s}
                            nowRef={nowRef}
                            yearEndProjection={id === 'yearly' ? projection : null}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default VolumeGoalsPanel;
