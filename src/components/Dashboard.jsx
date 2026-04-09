import React, { useState, useMemo } from 'react';
import { calculateBassettCorrection } from '../utils';
import OverviewTab from './dashboard/OverviewTab';
import FormTab from './dashboard/FormTab';
import PowerTab from './dashboard/PowerTab';

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
}) => {
    const [dashboardTab, setDashboardTab] = useState('overview');

    // Alle historische data zit in Firestore via de deep sync — GCF niet meer nodig.
    const chartData = useMemo(() => {
        return firestoreActivities
            .map(a => enhanceActivity(a, manualFtp))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [firestoreActivities, manualFtp]);

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        if (!chartData.length) return [];

        let cutoffDate = new Date();
        // Reset tijd naar middernacht voor eerlijke vergelijking
        cutoffDate.setHours(0, 0, 0, 0);

        if (timeRange === 'Custom') {
            if (!customStart) return chartData;
            const start = new Date(customStart);
            const end = customEnd ? new Date(customEnd) : new Date();
            return chartData.filter(d => {
                const date = new Date(d.date);
                return date >= start && date <= end;
            });
        }

        if (timeRange === '1M') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        else if (timeRange === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        else if (timeRange === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        else if (timeRange === '1Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        else if (timeRange === '3Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
        else if (timeRange === '6Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 6);
        else if (timeRange === 'ALL') cutoffDate = new Date('2000-01-01');

        return chartData.filter(d => new Date(d.date) >= cutoffDate);
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
            <div className="flex border-b border-cdborder mb-4">
                <button
                    onClick={() => setDashboardTab('overview')}
                    className={`flex-1 py-3 text-sm font-bold ${dashboardTab === 'overview' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Overview</button>
                <button
                    onClick={() => setDashboardTab('form')}
                    className={`flex-1 py-3 text-sm font-bold ${dashboardTab === 'form' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Form</button>
                <button
                    onClick={() => setDashboardTab('power')}
                    className={`flex-1 py-3 text-sm font-bold ${dashboardTab === 'power' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Power</button>
            </div>

            {/* TAB CONTENT */}
            {dashboardTab === 'overview' && (
                <OverviewTab
                    data={filteredData}
                    manualFtp={manualFtp}
                    customTicks={customTicks}
                    onOpenActivityInLog={onOpenActivityInLog}
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
                    referenceEndDate={referenceEndDate}
                    weightKg={userWeightKg}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}
        </div>
    );
};

export default Dashboard;
