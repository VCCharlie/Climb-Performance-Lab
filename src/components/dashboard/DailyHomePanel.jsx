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
        <section aria-label="Today at a glance" className="space-y-4">
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
