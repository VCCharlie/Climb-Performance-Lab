import React, { useState, useEffect } from 'react';
import { fetchIntervalsData } from '../services/intervalsService';
import PerformanceModule from './PerformanceModule';


const Dashboard = ({ theme, manualFtp }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('1Y');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Fetch wide range to support all filters locally
                const startDate = '2020-01-01';
                const endDate = '2026-12-31'; // Future proof

                const rawData = await fetchIntervalsData(startDate, endDate);

                // Process Data: Add eFTP if missing, using best_20min * 0.95
                // Also ensure FTP is backfilled if missing
                const processedData = rawData.map(d => ({
                    ...d,
                    eFTP: d.best_20min ? Math.round(d.best_20min * 0.95) : null,
                    ftp: d.ftp || manualFtp // Use activity FTP or fallback to manual
                }));

                setChartData(processedData);
                setError(null);
            } catch (err) {
                setError('Kon data niet ophalen van Intervals.icu');
                console.error(err);
            } finally {
                setLoading(false);
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
                    <p className="text-slate-400 text-sm">Performance metrics overview</p>
                </div>

                {/* TIME FILTER BUTTONS */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
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

            {/* PERFORMANCE MODULE (Refactored) */}
            <PerformanceModule data={filteredData} manualFtp={manualFtp} />

        </div>
    );
};
export default Dashboard;