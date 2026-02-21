import React from 'react';
import PerformanceModule from '../PerformanceModule';

/**
 * OverviewTab: Shows the main dashboard metrics and performance charts.
 * Wraps the existing PerformanceModule which already contains:
 *   - StatCards (FTP, eFTP, Load, Rides)
 *   - PeriodStatistics summary
 *   - FTP Progression & Load chart
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
            <PerformanceModule
                data={data}
                manualFtp={manualFtp}
                customTicks={customTicks}
            />
        </div>
    );
};

export default OverviewTab;
