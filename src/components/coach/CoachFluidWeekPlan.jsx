import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { buildFluidWeekPlan } from '../../utils/coach/coachWeekPlan';
import {
    toggleSessionComplete,
    setSessionOverride,
    moveSessionToToday,
    clearSessionMove,
    toggleUnavailableDate,
    clearUnavailableDates,
    toggleAvailableDate,
    clearAvailableDates,
    mergeSessionMatches,
    dispatchCoachWeekUpdated,
    COACH_WEEK_UPDATED_EVENT,
} from '../../utils/coach/coachWeekState';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { todayYmd } from '../../utils/coach/coachHelpers';
import FluidWeekPanel, { FluidWeekSyncNote } from './FluidWeekPanel';
import CollapsibleSection from '../ui/CollapsibleSection';

function goalLabelFromWeekPlan(weekPlan) {
    if (weekPlan.targetTssSource !== 'event-goal' || !weekPlan.trainingGoal) return '';
    const name = weekPlan.trainingGoal.displayName || weekPlan.trainingGoal.eventName;
    return name ? ` · ${name}` : '';
}

const CoachFluidWeekPlan = ({
    activities,
    userSettings,
    coachContext,
    isSignedIn = false,
    weekPlan: weekPlanProp,
    showNextWeek = false,
    onToggleNextWeek,
    week2Plan: week2PlanProp,
}) => {
    const [weekRevision, setWeekRevision] = useState(0);
    const [expandedDate, setExpandedDate] = useState(null);
    const today = todayYmd();

    useEffect(() => {
        const onUpdate = () => setWeekRevision((n) => n + 1);
        window.addEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
    }, []);

    const weekPlan = useMemo(
        () => weekPlanProp || buildFluidWeekPlan({ activities, userSettings, coachContext, referenceYmd: today }),
        [weekPlanProp, activities, userSettings, coachContext, weekRevision, today],
    );

    const week2Plan = week2PlanProp || null;

    useEffect(() => {
        const matches = {};
        weekPlan.sessions.forEach((s) => {
            if (
                s.matchedOnDate
                && s.plannedStimulus !== 'rest'
                && !s.isUnavailable
                && s.date <= today
            ) {
                matches[s.date] = {
                    activityId: s.matchedActivityId || null,
                    activityDate: s.matchedOnDate,
                    matchedStimulus: s.matchedStimulus,
                };
            }
        });
        if (Object.keys(matches).length > 0) {
            mergeSessionMatches(weekPlan.mondayYmd, matches);
        }
    }, [weekPlan.mondayYmd, weekPlan.sessions]);

    useEffect(() => {
        if (!week2Plan?.sessions) return;
        const matches = {};
        week2Plan.sessions.forEach((s) => {
            if (
                s.matchedOnDate
                && s.plannedStimulus !== 'rest'
                && !s.isUnavailable
                && s.date <= today
            ) {
                matches[s.date] = {
                    activityId: s.matchedActivityId || null,
                    activityDate: s.matchedOnDate,
                    matchedStimulus: s.matchedStimulus,
                };
            }
        });
        if (Object.keys(matches).length > 0) {
            mergeSessionMatches(week2Plan.mondayYmd, matches);
        }
    }, [week2Plan?.mondayYmd, week2Plan?.sessions]);

    const weekSubtitle = useMemo(() => {
        const dates = `${formatDateDDMMYYYY(weekPlan.mondayYmd)} – ${formatDateDDMMYYYY(weekPlan.sundayYmd)}`;
        const tss = `${weekPlan.actualTss}/${weekPlan.targetTss} TSS`;
        const phase = weekPlan.phaseLabel ? ` · ${weekPlan.phaseLabel}` : '';
        return `${dates} · ${tss}${phase}${goalLabelFromWeekPlan(weekPlan)}`;
    }, [weekPlan]);

    const makeWeekHandlers = (plan) => ({
        onToggleDone: (dateYmd) => {
            toggleSessionComplete(plan.mondayYmd, dateYmd);
            dispatchCoachWeekUpdated();
        },
        onSwapRecovery: (dateYmd) => {
            setSessionOverride(plan.mondayYmd, dateYmd, 'recovery');
            dispatchCoachWeekUpdated();
        },
        onMoveToToday: (fromDateYmd) => {
            moveSessionToToday(plan.mondayYmd, fromDateYmd, today);
            dispatchCoachWeekUpdated();
        },
        onUndoMove: (fromDateYmd) => {
            clearSessionMove(plan.mondayYmd, fromDateYmd);
            dispatchCoachWeekUpdated();
        },
        onToggleUnavailable: (dateYmd) => {
            toggleUnavailableDate(plan.mondayYmd, dateYmd);
            dispatchCoachWeekUpdated();
        },
        onToggleAvailable: (dateYmd) => {
            toggleAvailableDate(plan.mondayYmd, dateYmd);
            dispatchCoachWeekUpdated();
        },
        onClearAvailability: () => {
            clearUnavailableDates(plan.mondayYmd);
            clearAvailableDates(plan.mondayYmd);
            dispatchCoachWeekUpdated();
        },
    });

    const week1Handlers = makeWeekHandlers(weekPlan);
    const week2Handlers = week2Plan ? makeWeekHandlers(week2Plan) : null;

    const toggleExpand = (key) => {
        setExpandedDate((current) => (current === key ? null : key));
    };

    return (
        <CollapsibleSection
            title="This week — fluid plan"
            subtitle={weekSubtitle}
            icon={CalendarDays}
            defaultExpanded
            headerExtra={onToggleNextWeek ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleNextWeek();
                    }}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                        showNextWeek
                            ? 'border-cdaccent bg-cdaccent/15 text-cdaccent'
                            : 'border-cdborder text-cdmuted hover:text-cdtext'
                    }`}
                >
                    {showNextWeek ? 'Hide week 2' : '+ Week 2'}
                </button>
            ) : null}
        >
            <div className="-mt-1">
                <FluidWeekSyncNote isSignedIn={isSignedIn} />

                <div
                    className={[
                        'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1',
                        showNextWeek && week2Plan?.sessions?.length ? 'scroll-smooth' : '',
                    ].join(' ')}
                >
                    <FluidWeekPanel
                        title="This week"
                        weekPlan={weekPlan}
                        expandedDate={expandedDate}
                        onToggleExpand={toggleExpand}
                        expandKeyPrefix=""
                        className="min-w-[min(100%,340px)] max-w-full flex-shrink-0 snap-center"
                        {...week1Handlers}
                    />

                    {showNextWeek && week2Plan?.sessions?.length > 0 && week2Handlers && (
                        <FluidWeekPanel
                            title="Next week"
                            weekPlan={week2Plan}
                            expandedDate={expandedDate}
                            onToggleExpand={toggleExpand}
                            expandKeyPrefix="w2-"
                            className="min-w-[min(100%,340px)] max-w-full flex-shrink-0 snap-center border-l border-cdborder/50 pl-4"
                            {...week2Handlers}
                        />
                    )}
                </div>

                {showNextWeek && week2Plan?.sessions?.length > 0 && (
                    <p className="text-[10px] text-cdmuted text-center mt-2 md:hidden">
                        Swipe sideways to compare weeks
                    </p>
                )}
            </div>
        </CollapsibleSection>
    );
};

export default CoachFluidWeekPlan;
