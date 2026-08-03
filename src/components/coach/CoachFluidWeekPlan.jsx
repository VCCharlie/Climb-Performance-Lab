import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, Circle, RefreshCw, Heart } from 'lucide-react';
import { buildFluidWeekPlan } from '../../utils/coach/coachWeekPlan';
import {
    toggleSessionComplete,
    setSessionOverride,
    dispatchCoachWeekUpdated,
    COACH_WEEK_UPDATED_EVENT,
} from '../../utils/coach/coachWeekState';
import { formatDateDDMMYYYY } from '../../utils/formatters';

const STIMULUS_COLORS = {
    rest: 'text-cdmuted border-cdborder',
    recovery: 'text-green-400 border-green-500/40',
    endurance: 'text-blue-400 border-blue-500/40',
    sweetspot: 'text-yellow-400 border-yellow-500/40',
    threshold: 'text-orange-400 border-orange-500/40',
    vo2: 'text-red-400 border-red-500/40',
    completed: 'text-emerald-400 border-emerald-500/40',
};

const CoachFluidWeekPlan = ({ activities, userSettings, coachContext }) => {
    const [weekRevision, setWeekRevision] = useState(0);

    useEffect(() => {
        const onUpdate = () => setWeekRevision((n) => n + 1);
        window.addEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
    }, []);

    const weekPlan = useMemo(
        () => buildFluidWeekPlan({ activities, userSettings, coachContext }),
        [activities, userSettings, coachContext, weekRevision],
    );

    const handleToggleDone = (dateYmd) => {
        toggleSessionComplete(weekPlan.mondayYmd, dateYmd);
        dispatchCoachWeekUpdated();
    };

    const handleSwapRecovery = (dateYmd) => {
        setSessionOverride(weekPlan.mondayYmd, dateYmd, 'recovery');
        dispatchCoachWeekUpdated();
    };

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden">
            <div className="p-5 border-b border-cdborder">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            <CalendarDays size={20} className="text-cdaccent" />
                            This week — fluid plan
                        </h3>
                        <p className="text-xs text-cdmuted mt-1">
                            {formatDateDDMMYYYY(weekPlan.mondayYmd)} – {formatDateDDMMYYYY(weekPlan.sundayYmd)}
                            {' '}· auto-rebalances when you ride more or less than planned
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-cdtext tabular-nums">
                            {weekPlan.actualTss}
                            <span className="text-cdmuted text-base font-normal"> / {weekPlan.targetTss} TSS</span>
                        </div>
                        <div className="text-[10px] text-cdmuted uppercase">{weekPlan.compliancePct}% of weekly target</div>
                    </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-cdborder/50 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-cdaccent transition-all duration-500"
                        style={{ width: `${Math.min(100, weekPlan.compliancePct)}%` }}
                    />
                </div>

                {weekPlan.rebalanceNote && (
                    <p className="text-xs text-cdaccent mt-3 flex items-start gap-2">
                        <RefreshCw size={13} className="shrink-0 mt-0.5" />
                        {weekPlan.rebalanceNote}
                    </p>
                )}
            </div>

            <div className="divide-y divide-cdborder">
                {weekPlan.sessions.map((session) => {
                    const colorClass = STIMULUS_COLORS[session.stimulus] || STIMULUS_COLORS.rest;
                    const canAct = session.stimulus !== 'rest' && !session.isPast;

                    return (
                        <div
                            key={session.date}
                            className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${session.isToday ? 'bg-cdaccent/5' : ''}`}
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => canAct && handleToggleDone(session.date)}
                                    disabled={session.stimulus === 'rest'}
                                    className={`shrink-0 mt-0.5 ${session.stimulus === 'rest' ? 'opacity-30 cursor-default' : 'hover:opacity-80'}`}
                                    aria-label={session.completed ? 'Mark incomplete' : 'Mark done'}
                                >
                                    {session.completed ? (
                                        <CheckCircle2 size={20} className="text-emerald-400" />
                                    ) : (
                                        <Circle size={20} className="text-cdmuted" />
                                    )}
                                </button>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-cdtext text-sm">{session.day}</span>
                                        {session.isToday && (
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cdaccent/20 text-cdaccent">
                                                Today
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${colorClass}`}>
                                            {session.stimulus}
                                        </span>
                                    </div>
                                    <p className="text-sm text-cdtext mt-0.5">{session.workoutName}</p>
                                    {session.note && (
                                        <p className="text-xs text-cdmuted mt-1">{session.note}</p>
                                    )}
                                    {session.fluidWorkout?.mainSet?.blocks?.length > 0 && (
                                        <p className="text-xs text-cdmuted mt-1">
                                            {session.fluidWorkout.mainSet.blocks.map((b) =>
                                                `${b.reps}× ${b.workMin} min ${b.zone}`
                                            ).join(' · ')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {canAct && session.stimulus !== 'recovery' && session.stimulus !== 'completed' && (
                                <button
                                    type="button"
                                    onClick={() => handleSwapRecovery(session.date)}
                                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/40 flex items-center gap-1.5"
                                >
                                    <Heart size={12} />
                                    Swap to recovery
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CoachFluidWeekPlan;
