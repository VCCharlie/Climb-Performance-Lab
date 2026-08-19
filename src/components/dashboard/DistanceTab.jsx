import React from 'react';
import LongestRidesPanel from './LongestRidesPanel';

/**
 * Dashboard sub-tab: longest rides (distance) — separate from Power tab.
 */
const DistanceTab = ({
    activities,
    timeRange,
    customStart,
    customEnd,
    referenceEndDate,
    onOpenActivityInLog,
}) => (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="rounded-lg border border-cdborder bg-cdbg/30 p-3 text-xs text-cdmuted leading-relaxed">
            Longest rides by <strong className="text-cdtext">stored distance (km)</strong> in the same window as the global
            site preset (1M, 1Y, Custom, …). Comparison works like Power → Top 10 by duration.
        </div>
        <LongestRidesPanel
            activities={activities}
            timeRange={timeRange}
            customStart={customStart}
            customEnd={customEnd}
            referenceEndDate={referenceEndDate}
            onOpenActivityInLog={onOpenActivityInLog}
        />
    </div>
);

export default DistanceTab;
