import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { safeSessionStorageSet } from '../utils/safeStorage.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import {
    getDashboardWindowBounds,
    previousWindowBounds,
    filterActivitiesInBounds,
    filterActivitiesByDashboardTimeRange,
} from '../utils/dashboardActivityWindow';
import { enhanceAndSortActivities } from '../utils/enhanceActivity';
import { prefetchDashboardSubTabChunk } from '../utils/prefetchTabChunks';
import { useActivitiesList } from '../hooks/useActivities';
import { SkeletonChartCard } from './ui/Skeleton';
import DashboardTodaySyncButton from './dashboard/DashboardTodaySyncButton';
import { useProfileFtp } from '../context/ProfileFtpContext';
import { useTodayIntervalsSync } from '../context/TodayIntervalsSyncContext';
import OverviewTab from './dashboard/OverviewTab';

const CompareTab = lazyWithRetry(() => import('./dashboard/CompareTab'), 'CompareTab');

const FormTab = lazyWithRetry(() => import('./dashboard/FormTab'), 'FormTab');
const PowerTab = lazyWithRetry(() => import('./dashboard/PowerTab'), 'PowerTab');
const DistanceTab = lazyWithRetry(() => import('./dashboard/DistanceTab'), 'DistanceTab');
const VolumeTotalsTab = lazyWithRetry(() => import('./dashboard/VolumeTotalsTab'), 'VolumeTotalsTab');

const DASH_SUBTAB_STORAGE_KEY = 'cpl.dashboard.subTab.v1';

function readDashboardSubTab() {
    if (typeof sessionStorage === 'undefined') return 'overview';
    try {
        const v = sessionStorage.getItem(DASH_SUBTAB_STORAGE_KEY);
        if (['overview', 'form', 'power', 'distance', 'volume', 'compare'].includes(v)) return v;
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

const Dashboard = ({
    manualFtp: manualFtpProp,
    activities: activitiesProp,
    timeRange = '1Y',
    customStart = '',
    customEnd = '',
    onOpenActivityInLog,
    userWeightKg = 0,
    referenceEndDate,
    userSettings,
    onOpenSettings,
    onOpenActivityLogDateRange,
}) => {
    const activitiesFromContext = useActivitiesList();
    const firestoreActivities = activitiesProp ?? activitiesFromContext;
    const profileFtp = useProfileFtp();
    const manualFtp = profileFtp.ftp || manualFtpProp || 0;
    const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();

    const [dashboardTab, setDashboardTab] = useState(readDashboardSubTab);

    const handleDashboardSubTabIntent = (tabId) => {
        prefetchDashboardSubTabChunk(tabId);
    };

    useEffect(() => {
        if (typeof sessionStorage === 'undefined') return;
        safeSessionStorageSet(DASH_SUBTAB_STORAGE_KEY, dashboardTab);
    }, [dashboardTab]);

    const needsFullChartData = dashboardTab === 'power' || dashboardTab === 'distance';

    // Full enriched history — only when Power or Distance sub-tabs need multi-window curves.
    const chartData = useMemo(() => {
        if (!needsFullChartData || !firestoreActivities?.length) return [];
        return enhanceAndSortActivities(firestoreActivities, manualFtp);
    }, [firestoreActivities, manualFtp, needsFullChartData]);

    // Filter raw activities first, then enrich only the visible window.
    const filteredData = useMemo(() => {
        const inRange = filterActivitiesByDashboardTimeRange(
            firestoreActivities,
            timeRange,
            customStart,
            customEnd,
        );
        if (!inRange.length) return [];
        return enhanceAndSortActivities(inRange, manualFtp);
    }, [firestoreActivities, manualFtp, timeRange, customStart, customEnd]);

    const volumeComparePrevPeriodActivities = useMemo(() => {
        const b = getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate);
        if (!b || !firestoreActivities?.length) return [];
        const prev = previousWindowBounds(b);
        if (!prev) return [];
        return filterActivitiesInBounds(firestoreActivities, prev);
    }, [firestoreActivities, timeRange, customStart, customEnd, referenceEndDate]);

    const volumeComparePrevYearActivities = useMemo(() => {
        const b = getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate);
        if (!b || !firestoreActivities?.length) return [];
        const shifted = shiftDashboardBoundsByYears(b, -1);
        if (!shifted) return [];
        return filterActivitiesInBounds(firestoreActivities, shifted);
    }, [firestoreActivities, timeRange, customStart, customEnd, referenceEndDate]);

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
            <div className="bg-cdsurface p-4 rounded-xl border border-cdborder shadow-md flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-yellow-500 tracking-tight">Dashboard</h2>
                    <p className="text-cdmuted text-sm">Performance metrics overview</p>
                </div>
                <DashboardTodaySyncButton
                    onSync={syncTodayActivities}
                    isBusy={isTodaySyncBusy}
                    className="shrink-0 hidden md:flex"
                />
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
                    onMouseEnter={() => handleDashboardSubTabIntent('form')}
                    onFocus={() => handleDashboardSubTabIntent('form')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'form' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Form</button>
                <button
                    type="button"
                    id="tab-power"
                    role="tab"
                    aria-selected={dashboardTab === 'power'}
                    aria-controls="tabpanel-power"
                    onClick={() => setDashboardTab('power')}
                    onMouseEnter={() => handleDashboardSubTabIntent('power')}
                    onFocus={() => handleDashboardSubTabIntent('power')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'power' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Power</button>
                <button
                    type="button"
                    id="tab-distance"
                    role="tab"
                    aria-selected={dashboardTab === 'distance'}
                    aria-controls="tabpanel-distance"
                    onClick={() => setDashboardTab('distance')}
                    onMouseEnter={() => handleDashboardSubTabIntent('distance')}
                    onFocus={() => handleDashboardSubTabIntent('distance')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'distance' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Distance</button>
                <button
                    type="button"
                    id="tab-volume"
                    role="tab"
                    aria-selected={dashboardTab === 'volume'}
                    aria-controls="tabpanel-volume"
                    onClick={() => setDashboardTab('volume')}
                    onMouseEnter={() => handleDashboardSubTabIntent('volume')}
                    onFocus={() => handleDashboardSubTabIntent('volume')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'volume' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Volume</button>
                <button
                    type="button"
                    id="tab-compare"
                    role="tab"
                    aria-selected={dashboardTab === 'compare'}
                    aria-controls="tabpanel-compare"
                    onClick={() => setDashboardTab('compare')}
                    onMouseEnter={() => handleDashboardSubTabIntent('compare')}
                    onFocus={() => handleDashboardSubTabIntent('compare')}
                    className={`flex-1 min-w-[5.5rem] py-3 text-sm font-bold ${dashboardTab === 'compare' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}
                >Compare</button>
            </div>

            {/* TAB CONTENT */}
            {dashboardTab === 'overview' && (
                <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
                    <OverviewTab
                        data={filteredData}
                        allActivities={firestoreActivities}
                        manualFtp={manualFtp}
                        customTicks={customTicks}
                        onOpenActivityInLog={onOpenActivityInLog}
                        userSettings={userSettings}
                        onOpenSettings={onOpenSettings}
                        onGoToPowerTab={() => setDashboardTab('power')}
                    />
                </div>
            )}

            {dashboardTab !== 'overview' && (
                <Suspense fallback={<SkeletonChartCard className="mt-2" />}>
                    {dashboardTab === 'compare' && (
                        <div role="tabpanel" id="tabpanel-compare" aria-labelledby="tab-compare">
                            <CompareTab allActivities={firestoreActivities} />
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
                                userSettings={userSettings}
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
                </Suspense>
            )}
        </div>
    );
};

export default Dashboard;
