import React, { useState, useEffect } from 'react';
import { fetchIntervalsData } from '../services/intervalsService';
import { calculateBassettCorrection } from '../utils'; // Import Bassett correction
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
                // Calculate eFTP from best 20min power
                let eFTP = d.best_20min ? Math.round(d.best_20min * 0.95) : null;

                // SANITY CHECK: Filter out unrealistic spikes (e.g. > 600W)
                // This handles sensor errors or bad data inputs
                if (eFTP > 600) {
                    console.warn(`[Dashboard] Filtering outlier eFTP: ${eFTP}W on ${d.date}`);
                    eFTP = null;
                }

                // Calculate Bassett Correction (Sea Level Power) if altitude is available
                // We need avg_altitude from the CSV parsing (added in utils.js)
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

                // STEP 1: Fast Load (Current Year + Future)
                // This gives an "instant" feel for the most relevant data
                const fastStart = '2025-01-01';
                const fastEnd = '2026-12-31';

                const recentData = await fetchIntervalsData(fastStart, fastEnd);
                const processedRecent = processRawData(recentData, manualFtp);

                // Show dashboard immediately with recent data
                setChartData(processedRecent);
                setLoading(false);
                setError(null);

                // STEP 2: Background Load (Historical Data)
                // Silently fetch older data and merge it
                const historyStart = '2020-01-01';
                const historyEnd = '2024-12-31';

                const historyData = await fetchIntervalsData(historyStart, historyEnd);
                const processedHistory = processRawData(historyData, manualFtp);

                // Merge and Sort (ensure chronological order)
                setChartData(prev => {
                    const combined = [...processedHistory, ...prev];
                    // simple dedupe based on date string could be added if overlap risks existed, 
                    // but ranges are distinct here. 
                    return combined.sort((a, b) => new Date(a.date) - new Date(b.date));
                });

            } catch (err) {
                setError('Kon data niet ophalen van Intervals.icu');
                console.error(err);
                setLoading(false); // Ensure loading stops on error
            }
        };

        loadData();
    }, [manualFtp]);

    // --- Filter Logic ---
    const getFilteredData = () => {
        if (!chartData.length) return [];
        if (timeRange === 'ALL') return chartData;

        const now = new Date();
        const cutoffDate = new Date();

        if (timeRange === '1M') cutoffDate.setMonth(now.getMonth() - 1);
        if (timeRange === '3M') cutoffDate.setMonth(now.getMonth() - 3);
        if (timeRange === '6M') cutoffDate.setMonth(now.getMonth() - 6);
        if (timeRange === '1Y') cutoffDate.setFullYear(now.getFullYear() - 1);
        if (timeRange === '3Y') cutoffDate.setFullYear(now.getFullYear() - 3);
        if (timeRange === '6Y') cutoffDate.setFullYear(now.getFullYear() - 6);

        return chartData.filter(d => new Date(d.date) >= cutoffDate);
    };

    const filteredData = getFilteredData();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-slate-400 animate-pulse">Laden van dashboard data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">
                Error: {error}
            </div>
        );
    }

    // --- 1. Stat Calculation (Based on FILTERED Data) ---
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : (chartData.length > 0 ? chartData[chartData.length - 1] : null);

    // Display Manual FTP if set, otherwise from latest activity
    const displayFtp = manualFtp || latest?.ftp || 0;

    // Find max eFTP in the filtered dataset
    const maxEftp = filteredData.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);

    // Find latest valid eFTP
    const lastValidEftp = [...filteredData].reverse().find(d => d.eFTP > 0)?.eFTP || 0;

    const currentLoad = latest?.load || 0;
    const totalActivities = filteredData.length;

    const ranges = ['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-yellow-500 tracking-tight">Dashboard</h2>
                    <p className="text-slate-400 text-sm">Performance metrics overview</p>
                </div>

                {/* TIME FILTER BUTTONS */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {ranges.map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === range
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* CUSTOM DATE PICKER (Conditional) */}
            {timeRange === 'Custom' && (
                <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase mr-2">Select Range:</span>
                        <input
                            type="date"
                            value={customStart}
                            onChange={e => setCustomStart(e.target.value)}
                            className="bg-slate-900 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 ring-blue-500 border border-slate-600"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={e => setCustomEnd(e.target.value)}
                            className="bg-slate-900 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 ring-blue-500 border border-slate-600"
                        />
                    </div>
                </div>
            )}
        </div>

            {/* PERFORMANCE MODULE (Refactored) */ }
    <PerformanceModule data={filteredData} manualFtp={manualFtp} />

        </div >
    );
};
export default Dashboard;