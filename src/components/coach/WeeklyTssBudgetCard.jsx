import React, { useMemo, useState, useEffect } from 'react';
import { Gauge, TrendingDown, TrendingUp, Minus, RotateCcw } from 'lucide-react';
import { buildWeeklyTssBudgetSummary } from '../../utils/weeklyTssBudget';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { isoWeekKey } from '../../utils/coach/coachWeekState';
import { WEEKLY_TSS_TARGET_SOURCE_LABELS } from '../../utils/trainingGoalLink';

const STATUS_COPY = {
    'on-track': { label: 'On track', icon: Minus, className: 'text-emerald-400' },
    under: { label: 'Below target', icon: TrendingDown, className: 'text-amber-400' },
    over: { label: 'Above target', icon: TrendingUp, className: 'text-orange-400' },
    'no-target': { label: 'No weekly target', icon: Gauge, className: 'text-cdmuted' },
};

/**
 * Lightweight week TSS budget vs actual (Coach tab).
 */
export default function WeeklyTssBudgetCard({
    activities,
    userSettings,
    setUserSettings,
    referenceYmd = todayYmd(),
}) {
    const summary = useMemo(
        () => buildWeeklyTssBudgetSummary({ activities, userSettings, referenceYmd }),
        [activities, userSettings, referenceYmd],
    );

    const weekKey = summary?.weekKey || isoWeekKey(referenceYmd);
    const storedOverride = userSettings?.weeklyTssOverrides?.[weekKey];
    const hasManualOverride = summary?.targetSource === 'manual';

    const [draftTarget, setDraftTarget] = useState('');

    useEffect(() => {
        if (hasManualOverride && storedOverride != null) {
            setDraftTarget(String(storedOverride));
        } else {
            setDraftTarget('');
        }
    }, [weekKey, hasManualOverride, storedOverride]);

    if (!summary) return null;

    const statusMeta = STATUS_COPY[summary.status] || STATUS_COPY['on-track'];
    const StatusIcon = statusMeta.icon;
    const pct = summary.compliancePct ?? 0;
    const barWidth = summary.targetTss > 0 ? Math.min(100, Math.round((summary.actualTss / summary.targetTss) * 100)) : 0;
    const sourceLabel = WEEKLY_TSS_TARGET_SOURCE_LABELS[summary.targetSource]
        || WEEKLY_TSS_TARGET_SOURCE_LABELS['hours-budget'];

    const persistOverride = (rawValue) => {
        if (!setUserSettings) return;
        const parsed = Math.round(Number(String(rawValue).trim()));
        if (!Number.isFinite(parsed) || parsed <= 0) return;

        setUserSettings((prev) => ({
            ...prev,
            weeklyTssOverrides: {
                ...(prev.weeklyTssOverrides || {}),
                [weekKey]: parsed,
            },
        }));
    };

    const clearOverride = () => {
        if (!setUserSettings) return;
        setUserSettings((prev) => {
            const nextOverrides = { ...(prev.weeklyTssOverrides || {}) };
            delete nextOverrides[weekKey];
            return {
                ...prev,
                weeklyTssOverrides: nextOverrides,
            };
        });
        setDraftTarget('');
    };

    const handleTargetBlur = () => {
        const trimmed = draftTarget.trim();
        if (!trimmed) {
            if (hasManualOverride) clearOverride();
            return;
        }
        persistOverride(trimmed);
    };

    const handleTargetKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        }
    };

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder p-4 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                        <Gauge size={14} />
                        Weekly load budget
                    </p>
                    <p className="text-sm text-cdmuted mt-1">{summary.weekLabel}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${statusMeta.className}`}>
                    <StatusIcon size={14} />
                    {statusMeta.label}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                    <div className="text-2xl font-bold text-cdtext tabular-nums">
                        {summary.actualTss}
                        <span className="text-base text-cdmuted font-semibold"> / {summary.targetTss || '—'} TSS</span>
                    </div>
                    <p className="text-xs text-cdmuted mt-1">
                        Target source: <span className="font-semibold text-cdtext">{sourceLabel}</span>
                        {summary.targetTss > 0 ? ` · ${pct}% of budget` : ''}
                    </p>
                </div>
                {summary.targetTss > 0 && (
                    <div className="text-sm text-cdtext">
                        {summary.remainingTss > 0 ? (
                            <span className="text-cdaccent font-semibold tabular-nums">{summary.remainingTss} TSS remaining</span>
                        ) : summary.overByTss > 0 ? (
                            <span className="text-orange-400 font-semibold tabular-nums">{summary.overByTss} TSS over budget</span>
                        ) : (
                            <span className="text-emerald-400 font-semibold">Budget met</span>
                        )}
                    </div>
                )}
            </div>

            {setUserSettings && (
                <div className="mt-4 pt-3 border-t border-cdborder flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm min-w-[140px]">
                        <span className="text-xs font-bold uppercase tracking-wide text-cdmuted">Set this week&apos;s target</span>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={draftTarget}
                            onChange={(event) => setDraftTarget(event.target.value)}
                            onBlur={handleTargetBlur}
                            onKeyDown={handleTargetKeyDown}
                            placeholder={summary.targetTss > 0 ? String(summary.targetTss) : 'TSS'}
                            className="bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext text-sm tabular-nums w-full max-w-[120px]"
                            aria-label="Manual weekly TSS target"
                        />
                    </label>
                    {hasManualOverride && (
                        <button
                            type="button"
                            onClick={clearOverride}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-cdmuted hover:text-cdtext cd-min-touch-y cd-focus-ring"
                        >
                            <RotateCcw size={14} aria-hidden />
                            Reset to calculated target
                        </button>
                    )}
                </div>
            )}

            {summary.targetTss > 0 && (
                <div className="mt-3 h-2 rounded-full bg-cdborder/60 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${barWidth > 115 ? 'bg-orange-400' : barWidth >= 85 ? 'bg-emerald-400' : 'bg-cdaccent'}`}
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            )}

            {summary.optimalBand?.max > 0 && (
                <p className="text-[11px] text-cdmuted mt-2">
                    Optimal band: {summary.optimalBand.min}–{summary.optimalBand.max} TSS this week.
                </p>
            )}
        </div>
    );
}
