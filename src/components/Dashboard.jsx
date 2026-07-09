import React, { useState, useMemo, useEffect } from 'react';
import { safeSessionStorageSet } from '../utils/safeStorage.js';
import { calculateBassettCorrection } from '../utils';
import { normalizeDate } from '../utils/formatters';
import {
    getDashboardWindowBounds,
    previousWindowBounds,
    filterActivitiesInBounds,
} from '../utils/dashboardActivityWindow';
import OverviewTab from './dashboard/OverviewTab';
import FormTab from './dashboard/FormTab';
import PowerTab from './dashboard/PowerTab';
import DistanceTab from './dashboard/DistanceTab';
import VolumeTotalsTab from './dashboard/VolumeTotalsTab';

const DASH_SUBTAB_STORAGE_KEY = 'cpl.dashboard.subTab.v1';

function readDashboardSubTab() {
    if (typeof sessionStorage === 'undefined') return 'overview';
    try {
        const v = sessionStorage.getItem(DASH_SUBTAB_STORAGE_KEY);
        if (['overview', 'form', 'power', 'distance', 'volume'].includes(v)) return v;
    } catch {
        /* ignore */
    }
    return 'overview';
}

function shiftDashboardBoundsByYears(bounds, deltaYears) {
    if (!bounds) return null;
    const s = new Date(bounds.start.getTime());
    const e = new Date(bounds.end.getTime());
    s.setFullYear(s.getFullYear() + deltaYears);
    e.setFullYear(e.getFullYear() + deltaYears);
    return { start: s, end: e };
}

/**
 * Enriches a single activity record with dashboard-specific derived fields:
 *  - eFTP:   Best 20-min power × 0.95 (classic threshold estimate)
 *  - eFTP60: Best 60-min power (direct threshold equivalent)
 *  - seaLevelPower: altitude-corrected avg power via Bassett model
 * Does NOT re-normalize — expects the record to already have correct field names.
 */
const enhanceActivity = (d, userFtp) => {
    let eFTP = d.best_20min ? Math.round(d.best_20min * 0.95) : null;
    let eFTP60 = d.best_60min ? Math.round(d.best_60min) : null;

    // Sanity filter — real FTP above 600W is extremely unusual
    if (eFTP > 600) eFTP = null;
    if (eFTP60 > 600) eFTP60 = null;

    const seaLevelPower = d.avg_altitude ? calculateBassettCorrection(d.avg_power, d.avg_altitude) : null;

    return {
        ...d,
        eFTP,
        eFTP60,
        ftp: d.ftp || userFtp,
        seaLevelPower,
    };
};

const Dashboard = ({
    manualFtp,
    activities: firestoreActivities = [],
    timeRange = '1Y',
    customStart = '',
    customEnd = '',
    onOpenActivityInLog,
    userWeightKg = 0,
    referenceEndDate,
    userSettings,
    updateUserSettings,
    cloudVolumeGoalsSynced = false,
    onOpenActivityLogDateRange,
}) => {
    const [dashboardTab, setDashboardTab] = useState(readDashboardSubTab);

    useEffect(() => {
        if (typeof sessionStorage === 'undefined') return;
        safeSessionStorageSet(DASH_SUBTAB_STORAGE_KEY, dashboardTab);
    }, [dashboardTab]);

    // Alle historische data zit in Firestore via de deep sync — GCF niet meer nodig.
    const chartData = useMemo(() => {
        return firestoreActivities
            .map(a => enhanceActivity(a, manualFtp))
            // Optimization: use string comparison for ISO dates to speed up sort
            .sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
    }, [firestoreActivities, manualFtp]);

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        if (!chartData.length) return [];

        let cutoffDate = new Date();
        // Reset tijd naar middernacht voor eerlijke vergelijking
        cutoffDate.setHours(0, 0, 0, 0);

        if (timeRange === 'Custom') {
            if (!customStart) return chartData;

            // Format start date safely
            const startStr = normalizeDate(customStart);

            // Format end date to today if not provided, safely extracting YYYY-MM-DD
            let endStr;
            if (customEnd) {
                endStr = normalizeDate(customEnd);
            } else {
                const today = new Date();
                const yy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                endStr = `${yy}-${mm}-${dd}`;
            }

            return chartData.filter(d => {
                if (!d.date) return false;
                // Optimization: string comparison is significantly faster than new Date()
                // Safely convert to string using normalizeDate to handle timestamps/objects properly
                const dStr = normalizeDate(d.date);
                return dStr >= startStr && dStr <= endStr;
            });
        }

        if (timeRange === '1M') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        else if (timeRange === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        else if (timeRange === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        else if (timeRange === '1Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        else if (timeRange === '3Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
        else if (timeRange === '6Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 6);
        else if (timeRange === 'ALL') cutoffDate = new Date('2000-01-01');

        // Note: ISO string formatting automatically handles local timezone shift to UTC properly if we just want YYYY-MM-DD
        // However, to perfectly mirror the previous behavior which relied on local date boundaries (`new Date().setHours(0,0,0,0)`),
        // we manually construct local 'YYYY-MM-DD'
        const yy = cutoffDate.getFullYear();
        const mm = String(cutoffDate.getMonth() + 1).padStart(2, '0');
        const dd = String(cutoffDate.getDate()).padStart(2, '0');
        const cutoffStr = `${yy}-${mm}-${dd}`;

        return chartData.filter(d => {
            if (!d.date) return false;
            // Safely convert to string using normalizeDate
            const dStr = normalizeDate(d.date);
            return dStr >= cutoffStr;
        });
    }, [chartData, timeRange, customStart, customEnd]);

    const volumeComparePrevPeriodActivities = useMemo(() => {
        const b = getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate);
        if (!b || !chartData.length) return [];
        const prev = previousWindowBounds(b);
        if (!prev) return [];
        return filterActivitiesInBounds(chartData, prev);
    }, [chartData, timeRange, customStart, customEnd, referenceEndDate]);

    const volumeComparePrevYearActivities = useMemo(() => {
        const b = getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate);
        if (!b || !chartData.length) return [];
        const shifted = shiftDashboardBoundsByYears(b, -1);
        if (!shifted) return [];
        return filterActivitiesInBounds(chartData, shifted);
    }, [chartData, timeRange, customStart, customEnd, referenceEndDate]);

    // --- SMART TICKS CALCULATOR ---
    // Dit lost het probleem van de "volle x-as" op.
    const customTicks = useMemo(() => {
        if (filteredData.length <= 6) return filteredData.map(d => d.date); // Bij weinig data: toon alles

        const ticks = [];
        const count = 6; // We willen max 6 datums op de as (Start, Einde, en 4 ertussen)
        const step = Math.floor((filteredData.length - 1) / (count - 1));

        for (let i = 0; i < count - 1; i++) {
            ticks.push(filteredData[i * step].date);
        }
        // Altijd de allerlaatste datum toevoegen
        ticks.push(filteredData[filteredData.length - 1].date);

        // Zorg voor unieke waarden (via Set)
        return [...new Set(ticks)];
    }, [filteredData]);


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER SECTION */}
            <div className="bg-cdsurface p-4 rounded-xl border border-cdborder shadow-md">
                <h2 className="text-2xl font-bold text-yellow-500 tracking-tight">Dashboard</h2>
                <p className="text-cdmuted text-sm">Performance metrics overview</p>
            </div>

            {/* SUB-TABS NAVIGATION */}
            <div className="flex flex-wrap border-b border-cdborder mb-4" role="tablist" aria-label="Dashboard Tabs">
                <button
                    type="button"
                    id="tab-overview"
                    role="tab"
                    aria-selected={dashboardTab === 'overview'}
                    aria-controls="tabpanel-overview"
                    onClick={() => setDashboardTab('overview')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'overview' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Overview</button>
                <button
                    type="button"
                    id="tab-form"
                    role="tab"
                    aria-selected={dashboardTab === 'form'}
                    aria-controls="tabpanel-form"
                    onClick={() => setDashboardTab('form')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'form' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Form</button>
                <button
                    type="button"
                    id="tab-power"
                    role="tab"
                    aria-selected={dashboardTab === 'power'}
                    aria-controls="tabpanel-power"
                    onClick={() => setDashboardTab('power')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'power' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Power</button>
                <button
                    type="button"
                    id="tab-distance"
                    role="tab"
                    aria-selected={dashboardTab === 'distance'}
                    aria-controls="tabpanel-distance"
                    onClick={() => setDashboardTab('distance')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'distance' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Distance</button>
                <button
                    type="button"
                    id="tab-volume"
                    role="tab"
                    aria-selected={dashboardTab === 'volume'}
                    aria-controls="tabpanel-volume"
                    onClick={() => setDashboardTab('volume')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'volume' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Volume</button>
            </div>

            {/* TAB CONTENT */}
            {dashboardTab === 'overview' && (
                <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
                    <OverviewTab
                        data={filteredData}
                        chartData={chartData}
                        manualFtp={manualFtp}
                        customTicks={customTicks}
                        onOpenActivityInLog={onOpenActivityInLog}
                        userSettings={userSettings}
                        updateUserSettings={updateUserSettings}
                        cloudVolumeGoalsSynced={cloudVolumeGoalsSynced}
                    />
                </div>
            )}

            {dashboardTab === 'form' && (
                <div role="tabpanel" id="tabpanel-form" aria-labelledby="tab-form">
                    <FormTab
                        data={filteredData}
                        customTicks={customTicks}
                    />
                </div>
            )}

            {dashboardTab === 'power' && (
                <div role="tabpanel" id="tabpanel-power" aria-labelledby="tab-power">
                    <PowerTab
                        data={filteredData}
                        customTicks={customTicks}
                        chartData={chartData}
                        manualFtp={manualFtp}
                        timeRange={timeRange}
                        customStart={customStart}
                        customEnd={customEnd}
                        referenceEndDate={referenceEndDate}
                        weightKg={userWeightKg}
                        onOpenActivityInLog={onOpenActivityInLog}
                    />
                </div>
            )}

            {dashboardTab === 'distance' && (
                <div role="tabpanel" id="tabpanel-distance" aria-labelledby="tab-distance">
                    <DistanceTab
                        chartData={chartData}
                        timeRange={timeRange}
                        customStart={customStart}
                        customEnd={customEnd}
                        referenceEndDate={referenceEndDate}
                        onOpenActivityInLog={onOpenActivityInLog}
                    />
                </div>
            )}

            {dashboardTab === 'volume' && (
                <div role="tabpanel" id="tabpanel-volume" aria-labelledby="tab-volume">
                    <VolumeTotalsTab
                        data={filteredData}
                        comparePrevPeriodActivities={volumeComparePrevPeriodActivities}
                        comparePrevYearActivities={volumeComparePrevYearActivities}
                        onOpenActivityLogDateRange={onOpenActivityLogDateRange}
                    />
                </div>
            )}
        </div>
    );
};

export default Dashboard;
