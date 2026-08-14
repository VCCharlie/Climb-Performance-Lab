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
import { horizonWeekPanelTitle } from '../../utils/coach/coachHorizonPlan';
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
    horizonWeeks: horizonWeeksProp,
    showHorizon = false,
    onToggleHorizon,
    eventHorizonActive = false,
    horizonWeekCount = 1,
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

    const visibleWeeks = useMemo(() => {
        if (showHorizon && horizonWeeksProp?.length) return horizonWeeksProp;
        return [weekPlan];
    }, [showHorizon, horizonWeeksProp, weekPlan]);

    useEffect(() => {
        for (const plan of visibleWeeks) {
            const matches = {};
            plan.sessions?.forEach((s) => {
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
            if (Object.keys(matches).length > 0 && plan.mondayYmd) {
                mergeSessionMatches(plan.mondayYmd, matches);
            }
        }
    }, [visibleWeeks, today]);

    const weekSubtitle = useMemo(() => {
        const dates = `${formatDateDDMMYYYY(weekPlan.mondayYmd)} – ${formatDateDDMMYYYY(weekPlan.sundayYmd)}`;
        const tss = `${weekPlan.actualTss}/${weekPlan.targetTss} TSS`;
        const phase = weekPlan.phaseLabel ? ` · ${weekPlan.phaseLabel}` : '';
        const horizon = showHorizon && horizonWeekCount > 1
            ? ` · ${horizonWeekCount} weeks in plan`
            : '';
        return `${dates} · ${tss}${phase}${horizon}${goalLabelFromWeekPlan(weekPlan)}`;
    }, [weekPlan, showHorizon, horizonWeekCount]);

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

    const toggleExpand = (key) => {
        setExpandedDate((current) => (current === key ? null : key));
    };

    const horizonToggleLabel = showHorizon
        ? 'This week only'
        : `Full plan (${horizonWeekCount} wk)`;

    return (
        <CollapsibleSection
            title="This week — fluid plan"
            subtitle={weekSubtitle}
            icon={CalendarDays}
            defaultExpanded
            headerExtra={eventHorizonActive && onToggleHorizon && horizonWeekCount > 1 ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleHorizon();
                    }}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                        showHorizon
                            ? 'border-cdaccent bg-cdaccent/15 text-cdaccent'
                            : 'border-cdborder text-cdmuted hover:text-cdtext'
                    }`}
                >
                    {horizonToggleLabel}
                </button>
            ) : null}
        >
            <div className="-mt-1">
                <FluidWeekSyncNote isSignedIn={isSignedIn} />

                {showHorizon && horizonWeekCount > 1 && (
                    <p className="text-[11px] text-cdmuted mb-2">
                        Scroll sideways through each week until your event — phases and TSS targets follow your Goals plan.
                    </p>
                )}

                <div
                    className={[
                        'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1',
                        visibleWeeks.length > 1 ? 'scroll-smooth' : '',
                    ].join(' ')}
                >
                    {visibleWeeks.map((plan, index) => {
                        const expandKeyPrefix = index === 0 ? '' : `w${index}-`;
                        const handlers = makeWeekHandlers(plan);
                        const isPreview = plan.isHorizonPreview
                            || (plan.mondayYmd > today);
                        return (
                            <FluidWeekPanel
                                key={plan.mondayYmd || index}
                                title={horizonWeekPanelTitle(plan, today)}
                                weekPlan={plan}
                                expandedDate={expandedDate}
                                onToggleExpand={toggleExpand}
                                expandKeyPrefix={expandKeyPrefix}
                                isPreview={isPreview}
                                className={[
                                    'min-w-[min(100%,340px)] max-w-full flex-shrink-0 snap-center',
                                    index > 0 ? 'border-l border-cdborder/50 pl-4' : '',
                                ].join(' ')}
                                {...handlers}
                            />
                        );
                    })}
                </div>

                {visibleWeeks.length > 1 && (
                    <p className="text-[10px] text-cdmuted text-center mt-2">
                        Swipe or scroll sideways to compare weeks
                    </p>
                )}
            </div>
        </CollapsibleSection>
    );
};

export default CoachFluidWeekPlan;
