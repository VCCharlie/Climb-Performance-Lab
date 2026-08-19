import React, { useMemo } from 'react';
import PerformanceModule from '../PerformanceModule';
import BarChartCard from './charts/BarChartCard';
import ActivityHeatmap from './charts/ActivityHeatmap';
import { buildOverviewBarChartIndex } from '../../utils/dashboardBarChartBuckets';

/**
 * Recharts-heavy overview section — separate async chunk so first paint
 * (readiness cards, goals) does not pull the recharts vendor bundle.
 */
const OverviewChartsPanel = ({
    data,
    manualFtp,
    customTicks,
    onOpenActivityInLog,
    userSettings,
}) => {
    const barChartIndex = useMemo(() => buildOverviewBarChartIndex(data || []), [data]);

    return (
        <>
            <PerformanceModule
                data={data}
                manualFtp={manualFtp}
                customTicks={customTicks}
                onOpenActivityInLog={onOpenActivityInLog}
                userSettings={userSettings}
            />

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

            <ActivityHeatmap data={data} />
        </>
    );
};

export default OverviewChartsPanel;
