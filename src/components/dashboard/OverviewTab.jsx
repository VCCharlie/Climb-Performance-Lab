import React, { useMemo } from 'react';
import PerformanceModule from '../PerformanceModule';
import BarChartCard from './charts/BarChartCard';
import ActivityHeatmap from './charts/ActivityHeatmap';
import VolumeGoalsPanel from './VolumeGoalsPanel';
import ClimbingReadinessCard from './ClimbingReadinessCard';
import YtdCompareCard from './YtdCompareCard';
import PowerLongevityCard from './PowerLongevityCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { buildOverviewBarChartIndex } from '../../utils/dashboardBarChartBuckets';
import { BarChart3 } from 'lucide-react';

/**
 * OverviewTab: Main Dashboard overview.
 *  - Climbing readiness (full activity history for TSB / this-week metrics)
 *  - StatCards + FTP Progression (PerformanceModule)
 *  - Bar charts: Distance / TSS / Elevation (each with Week/Month toggle)
 *  - 52-week Activity Heatmap
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
}) => {
    const activitySource = allActivities || data || [];
    const hasFilteredData = data && data.length > 0;
    const barChartIndex = useMemo(() => buildOverviewBarChartIndex(data || []), [data]);

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
            <ClimbingReadinessCard
                activities={activitySource}
                userSettings={userSettings}
            />

            <YtdCompareCard activities={activitySource} manualFtp={manualFtp} />

            <PowerLongevityCard
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
                <>
                    {/* Stat cards + FTP progression chart */}
                    <PerformanceModule
                        data={data}
                        manualFtp={manualFtp}
                        customTicks={customTicks}
                        onOpenActivityInLog={onOpenActivityInLog}
                        userSettings={userSettings}
                    />

                    {/* Bar charts: 4 columns, each with their own week/month/year & rideType toggle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <BarChartCard
                            barChartIndex={barChartIndex}
                            metric="distance"
                            title="Distance"
                            unit="km"
                            color="rgba(59,130,246,0.75)"
                            userSettings={userSettings}
                        />
                        <BarChartCard
                            barChartIndex={barChartIndex}
                            metric="moving_time"
                            title="Time"
                            unit="hour"
                            color="rgba(168,85,247,0.75)"
                            userSettings={userSettings}
                        />
                        <BarChartCard
                            barChartIndex={barChartIndex}
                            metric="tss"
                            title="TSS"
                            unit="TSS"
                            color="rgba(249,115,22,0.75)"
                            userSettings={userSettings}
                        />
                        <BarChartCard
                            barChartIndex={barChartIndex}
                            metric="elevation"
                            title="Elevation"
                            unit="m"
                            color="rgba(34,197,94,0.75)"
                            userSettings={userSettings}
                        />
                    </div>

                    {/* 52-week activity heatmap — always uses full dataset regardless of time filter */}
                    <ActivityHeatmap data={data} />
                </>
            )}
        </div>
    );
};

export default OverviewTab;
