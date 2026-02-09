import React, { useState, useEffect, useMemo } from 'react';
import { fetchIntervalsData } from '../services/intervalsService';
import { calculateBassettCorrection } from '../utils';
import PerformanceModule from './PerformanceModule';

const Dashboard = ({ theme, manualFtp }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState(() => localStorage.getItem('dashboard_timeRange') || '1Y');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        localStorage.setItem('dashboard_timeRange', timeRange);
    }, [timeRange]);

    useEffect(() => {
        const processRawData = (data, userFtp) => {
            return data.map(d => {
                let eFTP = d.best_20min ? Math.round(d.best_20min * 0.95) : null;

                // Filter uitschieters (bad sensor data)
                if (eFTP > 600) eFTP = null;

                const seaLevelPower = d.avg_altitude ? calculateBassettCorrection(d.avg_power, d.avg_altitude) : null;

                return {
                    ...d,
                    eFTP,
                    ftp: d.ftp || userFtp,
                    seaLevelPower
                };
            });
        };

        const loadData = async () => {
            try {
                setLoading(true);

                // STEP 1: Fast Load (Recent)
                const recentData = await fetchIntervalsData('2025-01-01', '2026-12-31');
                const processedRecent = processRawData(recentData, manualFtp);

                setChartData(processedRecent); // Direct tonen
                setLoading(false);
                setError(null);

                // STEP 2: Background Load (Historie)
                const historyData = await fetchIntervalsData('2020-01-01', '2024-12-31');
                const processedHistory = processRawData(historyData, manualFtp);

                // STRICT MERGE & DEDUPE
                setChartData(prev => {
                    const combined = [...processedHistory, ...prev];

                    // Ontdubbelen op basis van unieke ID (Map behoudt laatste versie)
                    const uniqueMap = new Map();
                    combined.forEach(item => {
                        if (item.id) uniqueMap.set(item.id, item);
                    });

                    const uniqueArray = Array.from(uniqueMap.values());

                    // Altijd sorteren op datum
                    return uniqueArray.sort((a, b) => new Date(a.date) - new Date(b.date));
                });

            } catch (err) {
                console.error(err);
                // Alleen error tonen als we helemaal geen data hebben
                if (chartData.length === 0) setError('Kon data niet ophalen van Intervals.icu');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [manualFtp]); // Let op: Als manualFtp verandert, herrekent hij alles. Dat is goed.

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


    if (loading && chartData.length === 0) {
        return <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">Laden van dashboard data...</div>;
    }

    if (error) {
        return <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">Error: {error}</div>;
    }

    const ranges = ['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL', 'Custom'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-yellow-500 tracking-tight">Dashboard</h2>
                    <p className="text-slate-400 text-sm">Performance metrics overview</p>
                </div>
            </div>
            {/* PERFORMANCE MODULE (Nu met customTicks prop en controls) */}
            <PerformanceModule
                data={filteredData}
                manualFtp={manualFtp}
                customTicks={customTicks}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                customStart={customStart}
                setCustomStart={setCustomStart}
                customEnd={customEnd}
                setCustomEnd={setCustomEnd}
            />
        </div>
    );
};

export default Dashboard;
