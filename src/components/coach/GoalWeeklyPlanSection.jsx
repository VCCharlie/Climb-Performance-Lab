import React from 'react';
import { Target } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';

/**
 * Multi-week TSS schedule toward an active event goal (Goals tab plan, shown on Coach tab).
 */
export default function GoalWeeklyPlanSection({ goalSnapshot }) {
    if (!goalSnapshot?.weeks?.length) return null;

    const displayName = goalSnapshot.displayName || goalSnapshot.eventName || 'Training goal';
    const currentWeekNum = goalSnapshot.currentWeekNum ?? null;
    const planSummary = goalSnapshot.planSummary || '';
    const developmentMode = goalSnapshot.developmentMode || 'progress';
    const developmentRationale = goalSnapshot.developmentRationale || null;

    return (
        <div className="bg-cdsurface p-5 rounded-xl border border-cdborder space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                    <Target size={16} className="text-cdaccent shrink-0" aria-hidden />
                    Weekly plan toward your goal
                </h3>
                <span className="text-xs text-cdmuted">
                    <span className="font-semibold text-cdtext">{displayName}</span>
                    {' · '}
                    {formatDateDDMMYYYY(goalSnapshot.goalDate)}
                </span>
            </div>

            {planSummary ? (
                <p className="text-sm text-cdmuted">{planSummary}</p>
            ) : null}

            {developmentMode !== 'progress' && (
                <p className="text-xs text-cdaccent leading-relaxed rounded-lg border border-cdaccent/30 bg-cdaccent/5 px-3 py-2">
                    {developmentRationale
                        || 'This plan deliberately keeps weekly TSS below your recent habit so aerobic fitness can rebuild.'}
                </p>
            )}

            <div className="md:hidden space-y-2">
                {goalSnapshot.weeks.map((w) => {
                    const isCurrent = currentWeekNum === w.weekNum;
                    return (
                        <div
                            key={w.weekNum}
                            className={`rounded-lg border p-3 space-y-1 ${
                                isCurrent
                                    ? 'border-cdaccent bg-cdaccent/5'
                                    : 'border-cdborder bg-cdborder/10'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-cdmuted">
                                    Week {w.weekNum}
                                    {isCurrent ? ' · now' : ''}
                                </span>
                                <span className="font-bold tabular-nums text-cdtext">{w.targetTss} TSS</span>
                            </div>
                            <p className="text-sm font-semibold text-cdtext">{w.phaseLabel}</p>
                            <p className="text-xs text-cdmuted leading-relaxed">{w.focus}</p>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block -mx-1 overflow-x-auto rounded-lg border border-cdborder overscroll-x-contain">
                <table className="w-full text-sm text-left min-w-[640px]">
                    <thead>
                        <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                            <th className="px-3 py-2 font-semibold">Week</th>
                            <th className="px-3 py-2 font-semibold">Phase</th>
                            <th className="px-3 py-2 font-semibold text-right">Target TSS/wk</th>
                            <th className="px-3 py-2 font-semibold min-w-[280px]">Focus</th>
                        </tr>
                    </thead>
                    <tbody className="text-cdtext">
                        {goalSnapshot.weeks.map((w) => {
                            const isCurrent = currentWeekNum === w.weekNum;
                            return (
                                <tr
                                    key={w.weekNum}
                                    className={`border-t border-cdborder ${
                                        isCurrent ? 'bg-cdaccent/10' : ''
                                    }`}
                                >
                                    <td className="px-3 py-2 font-bold tabular-nums">
                                        {w.weekNum}
                                        {isCurrent ? (
                                            <span className="ml-1 text-[10px] uppercase text-cdaccent">now</span>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-cdmuted">{w.phaseLabel}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{w.targetTss}</td>
                                    <td className="px-3 py-2 text-xs text-cdmuted">{w.focus}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
