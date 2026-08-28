import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { CalendarDays, LayoutList, LayoutGrid } from 'lucide-react';
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
import {
    COACH_WEEK_VIEW_MODES,
    readCoachWeekViewMode,
    writeCoachWeekViewMode,
} from '../../utils/coach/coachWeekCalendar';

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
    const [viewMode, setViewMode] = useState(() => readCoachWeekViewMode());
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

    const handleViewModeChange = useCallback((nextMode) => {
        const safe = nextMode === COACH_WEEK_VIEW_MODES.CALENDAR
            ? COACH_WEEK_VIEW_MODES.CALENDAR
            : COACH_WEEK_VIEW_MODES.LIST;
        setViewMode(safe);
        writeCoachWeekViewMode(safe);
        setExpandedDate(null);
    }, []);

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
                            ? 'border-cdaccent/40 text-cdtext bg-cdborder/10'
                            : 'border-cdborder text-cdmuted hover:text-cdtext hover:border-cdborder/80'
                    }`}
                >
                    {horizonToggleLabel}
                </button>
            ) : null}
        >
            <div>
                <FluidWeekSyncNote isSignedIn={isSignedIn} />

                <div className="flex items-center justify-end gap-1 mb-3">
                    <span className="text-[10px] text-cdmuted uppercase tracking-wide mr-1">View</span>
                    <button
                        type="button"
                        onClick={() => handleViewModeChange(COACH_WEEK_VIEW_MODES.LIST)}
                        aria-pressed={viewMode === COACH_WEEK_VIEW_MODES.LIST}
                        title="List view"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                            viewMode === COACH_WEEK_VIEW_MODES.LIST
                                ? 'border-cdaccent/40 text-cdtext bg-cdborder/10'
                                : 'border-cdborder text-cdmuted hover:text-cdtext hover:border-cdborder/80'
                        }`}
                    >
                        <LayoutList size={12} aria-hidden />
                        List
                    </button>
                    <button
                        type="button"
                        onClick={() => handleViewModeChange(COACH_WEEK_VIEW_MODES.CALENDAR)}
                        aria-pressed={viewMode === COACH_WEEK_VIEW_MODES.CALENDAR}
                        title="Calendar view"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                            viewMode === COACH_WEEK_VIEW_MODES.CALENDAR
                                ? 'border-cdaccent/40 text-cdtext bg-cdborder/10'
                                : 'border-cdborder text-cdmuted hover:text-cdtext hover:border-cdborder/80'
                        }`}
                    >
                        <LayoutGrid size={12} aria-hidden />
                        Calendar
                    </button>
                </div>

                {showHorizon && horizonWeekCount > 1 && (
                    <p className="text-[10px] text-cdmuted mb-1.5">
                        Scroll sideways — phases and TSS follow your Goals plan.
                    </p>
                )}

                <div className="-mx-1 px-1 pt-2 pb-1 overflow-visible">
                    <div
                        className={[
                            'flex gap-4 sm:gap-5 overflow-x-auto overflow-y-visible snap-x snap-mandatory pb-4 pt-1 items-start',
                            visibleWeeks.length > 1 ? 'scroll-smooth' : '',
                        ].join(' ')}
                    >
                    {visibleWeeks.map((plan, index) => {
                        const expandKeyPrefix = index === 0 ? '' : `w${index}-`;
                        const handlers = makeWeekHandlers(plan);
                        const isPreview = plan.isHorizonPreview
                            || (plan.mondayYmd > today);
                        const isCompareColumn = visibleWeeks.length > 1 && index > 0;
                        const alignHorizon = visibleWeeks.length > 1;
                        return (
                            <FluidWeekPanel
                                key={plan.mondayYmd || index}
                                title={horizonWeekPanelTitle(plan, today)}
                                weekPlan={plan}
                                expandedDate={expandedDate}
                                onToggleExpand={toggleExpand}
                                expandKeyPrefix={expandKeyPrefix}
                                isPreview={isPreview}
                                compact={isCompareColumn}
                                alignHorizon={alignHorizon}
                                showClimbingHint={!isCompareColumn}
                                className={[
                                    'max-w-full flex-shrink-0 snap-center overflow-visible',
                                    isCompareColumn
                                        ? 'min-w-[min(78%,280px)] border-l border-cdborder/40 pl-4'
                                        : 'min-w-[min(100%,300px)]',
                                ].join(' ')}
                                viewMode={viewMode}
                                activities={activities}
                                weeklyHours={Number(userSettings?.weeklyHoursTarget) || 5}
                                referenceYmd={today}
                                userSettings={userSettings}
                                compactCalendar={visibleWeeks.length > 1}
                                {...handlers}
                            />
                        );
                    })}
                    </div>
                </div>

                {visibleWeeks.length > 1 && (
                    <p className="text-[9px] text-cdmuted text-center mt-1">
                        Swipe or scroll sideways to compare weeks
                    </p>
                )}
            </div>
        </CollapsibleSection>
    );
};

export default CoachFluidWeekPlan;
