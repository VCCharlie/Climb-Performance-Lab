import React, { useMemo } from 'react';
import PerformanceModule from '../PerformanceModule';
import BarChartCard from './charts/BarChartCard';
import ActivityHeatmap from './charts/ActivityHeatmap';
import VolumeGoalsPanel from './VolumeGoalsPanel';
import { buildOverviewBarChartIndex } from '../../utils/dashboardBarChartBuckets';

/**
 * OverviewTab: Main Dashboard overview.
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
}) => {
    const barChartIndex = useMemo(() => buildOverviewBarChartIndex(data), [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-cdmuted">
                No data available for this period.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {userSettings && (
                <VolumeGoalsPanel
                    chartData={allActivities || data}
                    userSettings={userSettings}
                    onOpenSettings={onOpenSettings}
                />
            )}

            {/* Stat cards + FTP progression chart */}
            <PerformanceModule
                data={data}
                manualFtp={manualFtp}
                customTicks={customTicks}
                onOpenActivityInLog={onOpenActivityInLog}
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
        </div>
    );
};

export default OverviewTab;
