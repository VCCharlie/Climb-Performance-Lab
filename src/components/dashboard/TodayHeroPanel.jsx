import React from 'react';
import { Sun } from 'lucide-react';
import ClimbingReadinessCard from './ClimbingReadinessCard';
import DailyHomePanel from './DailyHomePanel';
import TrainingStatusStrip from './TrainingStatusStrip';
import { chartCardClass } from '../../utils/chartTheme';

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
        <section className={`${chartCardClass} p-4 md:p-5`} aria-label="Today">
            <div className="flex items-center gap-2 mb-4">
                <Sun className="w-5 h-5 text-cdaccent shrink-0" aria-hidden />
                <div>
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Today</h3>
                    <p className="text-[11px] text-cdmuted">Form, load, readiness, focus, and your latest ride</p>
                </div>
            </div>

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
        </section>
    );
}
