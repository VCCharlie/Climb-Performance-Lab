import React, { Suspense } from 'react';
import VolumeGoalsPanel from './VolumeGoalsPanel';
import TodayHeroPanel from './TodayHeroPanel';
import YtdPowerTrendCard from './YtdPowerTrendCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { SkeletonChartCard } from '../ui/Skeleton';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { BarChart3 } from 'lucide-react';

const OverviewChartsPanel = lazyWithRetry(
    () => import('./OverviewChartsPanel'),
    'OverviewChartsPanel',
);

/**
 * OverviewTab: Main Dashboard overview.
 *  - Today hero (readiness + focus / latest ride)
 *  - YTD volume + long-term power (merged card)
 *  - Volume goals (collapsed on mobile by default)
 *  - Compact performance KPIs + unified volume charts + heatmap
 */
const OverviewTab = ({
    data,
    allActivities,
    manualFtp,
    customTicks,
    onOpenActivityInLog,
    userSettings,
    onOpenSettings,
    onGoToPowerTab,
    onGoToActivities,
    onGoToTraining,
}) => {
    const activitySource = allActivities || data || [];
    const hasFilteredData = data && data.length > 0;

    if (!activitySource.length) {
        return (
            <EmptyStateCard
                icon={BarChart3}
                title="No activities yet"
                message="Import or sync your training data to see performance trends, volume goals, and climbing readiness."
                primaryLabel="Go to Activities"
                onPrimary={onGoToActivities}
                secondaryLabel="Open settings"
                onSecondary={onOpenSettings}
                className="min-h-[12rem]"
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <TodayHeroPanel
                activities={activitySource}
                userSettings={userSettings}
                onOpenActivityInLog={onOpenActivityInLog}
                onGoToTraining={onGoToTraining}
            />

            <YtdPowerTrendCard
                activities={activitySource}
                manualFtp={manualFtp}
                weightKg={userSettings?.weight}
                userSettings={userSettings}
                onGoToPowerTab={onGoToPowerTab}
            />

            {userSettings && (
                <VolumeGoalsPanel
                    chartData={activitySource}
                    userSettings={userSettings}
                    onOpenSettings={onOpenSettings}
                />
            )}

            {!hasFilteredData ? (
                <div className="rounded-xl border border-cdborder bg-cdsurface px-4 py-6 text-center text-sm text-cdmuted">
                    No activities in the selected dashboard period. Climbing readiness above uses your full log;
                    widen the period filter to see charts and stats here.
                </div>
            ) : (
                <Suspense fallback={<SkeletonChartCard className="min-h-[28rem]" />}>
                    <OverviewChartsPanel
                        data={data}
                        manualFtp={manualFtp}
                        customTicks={customTicks}
                        onOpenActivityInLog={onOpenActivityInLog}
                        userSettings={userSettings}
                        onGoToPowerTab={onGoToPowerTab}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default OverviewTab;
