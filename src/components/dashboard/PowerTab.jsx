import React, { useMemo } from 'react';
import PowerDurationTable from './PowerDurationTable';
import PowerTopTenByDurationPanel from './PowerTopTenByDurationPanel';
import PowerTabDetails from './PowerTabDetails';
import PowerProfileRadar from './PowerProfileRadar';
import PowerLongevitySection from './PowerLongevitySection';
import PeakPowerDurationBarCard from './PeakPowerDurationBarCard';
import TimeInZonesCard from './TimeInZonesCard';
import CollapsibleInfoCard from '../ui/CollapsibleInfoCard';
import { findBestPowerActivity, DASHBOARD_FTP_CAPS } from '../../utils/dashboardActivityPeaks';
import { getDashboardDisplayBoundsYmd } from '../../utils/dashboardActivityWindow';
import { dashboardFilterLabel } from '../../utils/powerDurationTable';

/**
 * PowerTab: power metrics, top-10 tables per duration, intervals.icu-style matrix, monthly chart, MMP.
 */

const getMonthKey = (dateStr) => dateStr.slice(0, 7);

const StatCard = ({ label, value, unit, color = 'text-cdtext' }) => (
    <div className="bg-cdsurface border border-cdborder rounded-lg p-4">
        <div className="text-xs uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>
            {value ?? '—'}
            {value && unit && <span className="text-sm font-normal text-cdmuted ml-1">{unit}</span>}
        </div>
    </div>
);

const FTP_CAPS = DASHBOARD_FTP_CAPS;

const cappedMax = (activities, key, manualFtp) => {
    const cap = manualFtp > 0 ? manualFtp * FTP_CAPS[key] : 1500;
    // Optimization: Single pass loop prevents array allocations and avoids call stack size exceeded on large arrays
    let max = 0;
    for (const a of activities) {
        const val = Number(a[key]) || 0;
        if (val <= cap && val > max) {
            max = val;
        }
    }
    return max;
};

const POWER_TABLE_KEYS = [
    { key: 'best_1min', label: '1 min' },
    { key: 'best_5min', label: '5 min' },
    { key: 'best_10min', label: '10 min' },
    { key: 'best_20min', label: '20 min' },
    { key: 'best_60min', label: '60 min' },
];

const PowerTab = ({
    data,
    chartData = [],
    manualFtp,
    timeRange = '1Y',
    customStart = '',
    customEnd = '',
    referenceEndDate,
    weightKg = 0,
    userSettings,
    onOpenActivityInLog,
}) => {
    const effectiveWeightKg = Number(weightKg) > 0 ? Number(weightKg) : 0;

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;

        const best1m  = cappedMax(data, 'best_1min',  manualFtp);
        const best5m  = cappedMax(data, 'best_5min',  manualFtp);
        const best20m = cappedMax(data, 'best_20min', manualFtp);
        const best60m = cappedMax(data, 'best_60min', manualFtp);

        const eFTP = best20m > 0 ? Math.round(best20m * 0.95) : 0;
        const eFTPkg = eFTP > 0 && effectiveWeightKg > 0 ? (eFTP / effectiveWeightKg).toFixed(2) : null;
        const wkg20m = best20m > 0 && effectiveWeightKg > 0 ? (best20m / effectiveWeightKg).toFixed(2) : null;

        return { best1m, best5m, best20m, best60m, eFTP, eFTPkg, wkg20m };
    }, [data, manualFtp, effectiveWeightKg]);

    const monthlyBests = useMemo(() => {
        if (!data || data.length === 0) return [];

        const cap5  = manualFtp > 0 ? manualFtp * FTP_CAPS.best_5min  : 1500;
        const cap20 = manualFtp > 0 ? manualFtp * FTP_CAPS.best_20min : 1500;
        const cap60 = manualFtp > 0 ? manualFtp * FTP_CAPS.best_60min : 1500;

        const map = {};
        data.forEach(a => {
            const mo = getMonthKey(a.date);
            if (!map[mo]) map[mo] = { b5: 0, b20: 0, b60: 0 };
            const v5  = Number(a.best_5min)  || 0;
            const v20 = Number(a.best_20min) || 0;
            const v60 = Number(a.best_60min) || 0;
            if (v5  <= cap5  && v5  > map[mo].b5)  map[mo].b5  = v5;
            if (v20 <= cap20 && v20 > map[mo].b20) map[mo].b20 = v20;
            if (v60 <= cap60 && v60 > map[mo].b60) map[mo].b60 = v60;
        });

        const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return Object.keys(map).sort().map(mo => {
            const [y, m] = mo.split('-');
            // Optimization: avoid slow toLocaleString
            const label = `${EN_MONTHS_SHORT[parseInt(m, 10) - 1]} ${y.slice(-2)}`;
            return {
                label,
                'a_5min':  map[mo].b5  || null,
                'b_20min': map[mo].b20 || null,
                'c_60min': map[mo].b60 || null,
            };
        });
    }, [data, manualFtp]);

    const powerPeakRows = useMemo(() => {
        if (!data?.length) return [];
        return POWER_TABLE_KEYS.map(({ key, label }) => {
            const { activity, watts } = findBestPowerActivity(data, key, manualFtp);
            return { key, label, watts, activity };
        });
    }, [data, manualFtp]);

    /** Best per duration over full dashboard ride history (for radar outer ring). */
    const historyPowerPeakRows = useMemo(() => {
        if (!chartData?.length) return null;
        return POWER_TABLE_KEYS.map(({ key, label }) => {
            const { activity, watts } = findBestPowerActivity(chartData, key, manualFtp);
            return { key, label, watts, activity };
        });
    }, [chartData, manualFtp]);

    const periodLabel = dashboardFilterLabel(timeRange);
    const hasPeriodData = Boolean(data?.length);
    const hasHistory = Boolean(chartData?.length);

    const dashboardDisplayBounds = useMemo(
        () => getDashboardDisplayBoundsYmd(timeRange, customStart, customEnd),
        [timeRange, customStart, customEnd],
    );

    const zoneChartReferenceEndYmd = useMemo(() => {
        if (referenceEndDate) return String(referenceEndDate).slice(0, 10);
        return dashboardDisplayBounds.displayEndYmd;
    }, [referenceEndDate, dashboardDisplayBounds.displayEndYmd]);

    if (!hasPeriodData && !hasHistory) {
        return (
            <div className="flex items-center justify-center h-40 text-cdmuted">
                No power data available.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {chartData.length > 0 && (
                <PowerLongevitySection
                    activities={chartData}
                    manualFtp={manualFtp}
                    weightKg={effectiveWeightKg}
                    userSettings={userSettings}
                />
            )}

            {!hasPeriodData && hasHistory && (
                <CollapsibleInfoCard
                    title="No rides in selected period"
                    defaultExpanded
                    variant="default"
                    className="!shadow-none"
                    bodyClassName="!text-sm !text-cdmuted"
                >
                    No rides in <span className="text-cdtext font-semibold">{periodLabel}</span> — the power-duration matrix still uses
                    your full history; pick another period at the top for the other power sections.
                </CollapsibleInfoCard>
            )}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="1 min Best" value={stats.best1m || null} unit="W" />
                    <StatCard label="5 min Best" value={stats.best5m || null} unit="W" color="text-blue-400" />
                    <StatCard label="20 min Best" value={stats.best20m || null} unit="W" />
                    <StatCard label="60 min Best" value={stats.best60m || null} unit="W" color="text-blue-400" />
                    <StatCard label="eFTP" value={stats.eFTP || null} unit="W" color="text-green-400" />
                    <StatCard label="eFTP W/kg" value={stats.eFTPkg || null} unit="w/kg" color="text-green-400" />
                    <StatCard label="20m W/kg" value={stats.wkg20m || null} unit="w/kg" />
                </div>
            )}

            {powerPeakRows.some((r) => (Number(r.watts) || 0) > 0) && (
                <PowerProfileRadar
                    powerPeakRows={powerPeakRows}
                    historyPeakRows={historyPowerPeakRows}
                    manualFtp={manualFtp}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}

            {chartData.length > 0 && (
                <TimeInZonesCard
                    activities={chartData}
                    dashboardStartYmd={dashboardDisplayBounds.displayStartYmd}
                    dashboardEndYmd={dashboardDisplayBounds.displayEndYmd}
                    referenceEndYmd={zoneChartReferenceEndYmd}
                />
            )}

            {chartData.length > 0 && (
                <PeakPowerDurationBarCard
                    chartData={chartData}
                    periodData={data}
                    timeRange={timeRange}
                    manualFtp={manualFtp}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}

            {chartData.length > 0 && (
                <PowerTopTenByDurationPanel
                    chartData={chartData}
                    manualFtp={manualFtp}
                    timeRange={timeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    referenceEndDate={referenceEndDate}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}

            {chartData.length > 0 && (
                <PowerDurationTable
                    chartData={chartData}
                    filteredData={data}
                    manualFtp={manualFtp}
                    timeRange={timeRange}
                    referenceEndDate={referenceEndDate}
                    weightKg={effectiveWeightKg}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}

            {stats && (
                <PowerTabDetails
                    monthlyBests={monthlyBests}
                    data={data}
                    manualFtp={manualFtp}
                />
            )}

            {!stats && hasHistory && (
                <CollapsibleInfoCard
                    title="Period stats unavailable"
                    defaultExpanded={false}
                    variant="default"
                    className="!shadow-none"
                    bodyClassName="!text-xs !text-cdmuted"
                >
                    Choose a period with rides to see eFTP, the monthly chart, and the MMP curve.
                </CollapsibleInfoCard>
            )}
        </div>
    );
};

export default PowerTab;
