import React from 'react';
import { Target } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import CollapsibleCoachNote from './CollapsibleCoachNote';

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
        <div className="bg-cdsurface p-3 rounded-xl border border-cdborder space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold text-cdtext uppercase tracking-wide flex items-center gap-1.5">
                    <Target size={14} className="text-cdmuted shrink-0" aria-hidden />
                    Weekly plan toward your goal
                </h3>
                <span className="text-[10px] text-cdmuted">
                    <span className="font-semibold text-cdtext">{displayName}</span>
                    {' · '}
                    {formatDateDDMMYYYY(goalSnapshot.goalDate)}
                </span>
            </div>

            {planSummary ? (
                <p className="text-[11px] text-cdmuted leading-snug">{planSummary}</p>
            ) : null}

            {developmentMode !== 'progress' && (
                <CollapsibleCoachNote
                    text={developmentRationale
                        || 'This plan deliberately keeps weekly TSS below your recent habit so aerobic fitness can rebuild.'}
                    expandLabel="Why this plan?"
                    tone="muted"
                    maxSummaryLen={88}
                />
            )}

            <div className="md:hidden space-y-1.5">
                {goalSnapshot.weeks.map((w) => {
                    const isCurrent = currentWeekNum === w.weekNum;
                    return (
                        <div
                            key={w.weekNum}
                            className={`rounded-md border px-2.5 py-2 space-y-0.5 ${
                                isCurrent
                                    ? 'border-cdborder border-l-2 border-l-cdaccent bg-cdaccent/8 ring-1 ring-inset ring-cdaccent/25'
                                    : 'border-cdborder/60 bg-cdsurface'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                                    Week {w.weekNum}
                                    {isCurrent ? (
                                        <span className="text-cdaccent font-semibold"> · now</span>
                                    ) : null}
                                </span>
                                <span className="text-xs font-bold tabular-nums text-cdtext">{w.targetTss} TSS</span>
                            </div>
                            <p className="text-[11px] font-semibold text-cdtext">{w.phaseLabel}</p>
                            <p className="text-[10px] text-cdmuted leading-snug line-clamp-2">{w.focus}</p>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block -mx-1 overflow-x-auto rounded-lg border border-cdborder overscroll-x-contain">
                <table className="w-full text-xs text-left min-w-[560px]">
                    <thead>
                        <tr className="bg-cdborder/40 text-cdmuted text-[10px] uppercase">
                            <th className="px-2 py-1.5 font-semibold">Week</th>
                            <th className="px-2 py-1.5 font-semibold">Phase</th>
                            <th className="px-2 py-1.5 font-semibold text-right">Target TSS/wk</th>
                            <th className="px-2 py-1.5 font-semibold min-w-[220px]">Focus</th>
                        </tr>
                    </thead>
                    <tbody className="text-cdtext">
                        {goalSnapshot.weeks.map((w) => {
                            const isCurrent = currentWeekNum === w.weekNum;
                            return (
                                <tr
                                    key={w.weekNum}
                                    className={`border-t border-cdborder ${
                                        isCurrent
                                            ? 'bg-cdaccent/8 border-l-2 border-l-cdaccent ring-1 ring-inset ring-cdaccent/20'
                                            : ''
                                    }`}
                                >
                                    <td className="px-2 py-1.5 font-bold tabular-nums">
                                        {w.weekNum}
                                        {isCurrent ? (
                                            <span className="ml-1 text-[9px] uppercase text-cdaccent font-semibold">now</span>
                                        ) : null}
                                    </td>
                                    <td className="px-2 py-1.5 text-cdmuted">{w.phaseLabel}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{w.targetTss}</td>
                                    <td className="px-2 py-1.5 text-[10px] text-cdmuted leading-snug">{w.focus}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
