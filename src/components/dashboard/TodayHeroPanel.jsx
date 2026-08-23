import React from 'react';
import { Sun } from 'lucide-react';
import ClimbingReadinessCard from './ClimbingReadinessCard';
import DailyHomePanel from './DailyHomePanel';
import TrainingStatusStrip from './TrainingStatusStrip';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';

/**
 * Overview hero: training status strip + climbing readiness + today's focus / latest ride.
 */
export default function TodayHeroPanel({
    activities,
    userSettings,
    onOpenActivityInLog,
    onGoToTraining,
}) {
    if (!activities?.length) return null;

    return (
        <CollapsibleDashboardCard
            title="Today"
            icon={Sun}
            description="Form, load, readiness, focus, and your latest ride"
            defaultExpanded
            className="p-0"
            bodyClassName="!pt-0 px-4 md:px-5 pb-4 md:pb-5"
        >
            <TrainingStatusStrip activities={activities} userSettings={userSettings} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4">
                <ClimbingReadinessCard
                    embedded
                    activities={activities}
                    userSettings={userSettings}
                />
                <DailyHomePanel
                    embedded
                    activities={activities}
                    userSettings={userSettings}
                    onOpenActivityInLog={onOpenActivityInLog}
                    onGoToTraining={onGoToTraining}
                />
            </div>
        </CollapsibleDashboardCard>
    );
}
