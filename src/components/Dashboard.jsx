import React, { useState, useMemo } from 'react';
import { calculateBassettCorrection } from '../utils';
import { normalizeDate } from '../utils/formatters';
import OverviewTab from './dashboard/OverviewTab';
import FormTab from './dashboard/FormTab';
import PowerTab from './dashboard/PowerTab';
import DistanceTab from './dashboard/DistanceTab';

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
}) => {
    const [dashboardTab, setDashboardTab] = useState('overview');

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
            <div className="flex flex-wrap border-b border-cdborder mb-4">
                <button
                    type="button"
                    onClick={() => setDashboardTab('overview')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'overview' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Overview</button>
                <button
                    type="button"
                    onClick={() => setDashboardTab('form')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'form' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Form</button>
                <button
                    type="button"
                    onClick={() => setDashboardTab('power')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'power' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Power</button>
                <button
                    type="button"
                    onClick={() => setDashboardTab('distance')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'distance' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Distance</button>
            </div>

            {/* TAB CONTENT */}
            {dashboardTab === 'overview' && (
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
            )}

            {dashboardTab === 'form' && (
                <FormTab
                    data={filteredData}
                    customTicks={customTicks}
                />
            )}

            {dashboardTab === 'power' && (
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
            )}

            {dashboardTab === 'distance' && (
                <DistanceTab
                    chartData={chartData}
                    timeRange={timeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    referenceEndDate={referenceEndDate}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}
        </div>
    );
};

export default Dashboard;
