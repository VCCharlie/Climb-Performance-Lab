import React, { useMemo } from 'react';
import { buildCoachContext } from '../../utils/coach/coachPayloadBuilder';
import { buildRideInsights, getLatestRideActivity } from '../../utils/rideInsights';
import TodaysFocusCard from '../coach/TodaysFocusCard';
import PostRideInsightCard from './PostRideInsightCard';

/**
 * Dashboard “daily loop”: training focus for today + narrative on the latest ride.
 */
export default function DailyHomePanel({
    activities,
    userSettings,
    onOpenActivityInLog,
    onGoToTraining,
    embedded = false,
}) {
    const coachContext = useMemo(
        () => buildCoachContext(activities || [], userSettings || {}),
        [activities, userSettings],
    );

    const latestRide = useMemo(() => getLatestRideActivity(activities || []), [activities]);

    const rideInsight = useMemo(
        () => buildRideInsights(latestRide, {
            profileFtp: userSettings?.ftp,
            allActivities: activities || [],
        }),
        [latestRide, userSettings?.ftp, activities],
    );

    const showFocus = Boolean(coachContext?.fluidWorkout);
    if (!showFocus && !rideInsight) return null;

    return (
        <section
            aria-label={embedded ? 'Today focus and latest ride' : 'Today at a glance'}
            className={`space-y-4 ${embedded ? 'rounded-lg border border-cdborder/60 bg-cdbg/20 p-3 md:p-4' : ''}`}
        >
            {embedded && (showFocus || rideInsight) ? (
                <h4 className="text-xs font-bold text-cdtext uppercase tracking-wider">Focus &amp; latest ride</h4>
            ) : null}
            {showFocus && (
                <div>
                    <TodaysFocusCard coachContext={coachContext} />
                    {onGoToTraining && (
                        <p className="text-xs text-cdmuted mt-2 text-center">
                            <button
                                type="button"
                                onClick={onGoToTraining}
                                className="text-cdprimary font-semibold hover:underline cd-focus-ring rounded"
                            >
                                Open full training plan
                            </button>
                        </p>
                    )}
                </div>
            )}
            <PostRideInsightCard
                insight={rideInsight}
                onOpenActivity={latestRide && onOpenActivityInLog
                    ? () => onOpenActivityInLog(latestRide)
                    : null}
            />
        </section>
    );
}
