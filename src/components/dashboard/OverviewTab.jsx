import React from 'react';
import PerformanceModule from '../PerformanceModule';
import BarChartCard from './charts/BarChartCard';
import ActivityHeatmap from './charts/ActivityHeatmap';

/**
 * OverviewTab: Main Dashboard overview.
 *  - StatCards + FTP Progression (PerformanceModule)
 *  - Bar charts: Distance / TSS / Elevation (each with Week/Month toggle)
 *  - 52-week Activity Heatmap
 */
const OverviewTab = ({ data, manualFtp, customTicks }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-cdmuted">
                Geen data beschikbaar voor deze periode.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stat cards + FTP progression chart */}
            <PerformanceModule
                data={data}
                manualFtp={manualFtp}
                customTicks={customTicks}
            />

            {/* Bar charts: 4 columns, each with their own week/month/year & rideType toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BarChartCard
                    data={data}
                    metric="distance"
                    title="Afstand"
                    unit="km"
                    color="rgba(59,130,246,0.75)"
                />
                <BarChartCard
                    data={data}
                    metric="moving_time"
                    title="Tijd"
                    unit="uur"
                    color="rgba(168,85,247,0.75)"
                />
                <BarChartCard
                    data={data}
                    metric="tss"
                    title="TSS"
                    unit="TSS"
                    color="rgba(249,115,22,0.75)"
                />
                <BarChartCard
                    data={data}
                    metric="elevation"
                    title="Hoogtemeters"
                    unit="m"
                    color="rgba(34,197,94,0.75)"
                />
            </div>

            {/* 52-week activity heatmap — always uses full dataset regardless of time filter */}
            <ActivityHeatmap data={data} />
        </div>
    );
};

export default OverviewTab;
