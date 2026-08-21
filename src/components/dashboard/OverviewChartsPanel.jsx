import React, { useMemo } from 'react';
import PerformanceModule from '../PerformanceModule';
import OverviewBarChartsCard from './OverviewBarChartsCard';
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
    onGoToPowerTab,
}) => {
    const barChartIndex = useMemo(() => buildOverviewBarChartIndex(data || []), [data]);

    return (
        <>
            <PerformanceModule
                variant="overview"
                data={data}
                manualFtp={manualFtp}
                customTicks={customTicks}
                onOpenActivityInLog={onOpenActivityInLog}
                userSettings={userSettings}
                onGoToPowerTab={onGoToPowerTab}
            />

            <OverviewBarChartsCard barChartIndex={barChartIndex} userSettings={userSettings} />

            <ActivityHeatmap data={data} />
        </>
    );
};

export default OverviewChartsPanel;
