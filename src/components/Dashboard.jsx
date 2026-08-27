import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { safeSessionStorageSet } from '../utils/safeStorage.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import { resolveInitialDashboardSubTab } from '../utils/sessionNavRestore.js';
import {
    getDashboardWindowBounds,
    previousWindowBounds,
    filterActivitiesInBounds,
    filterActivitiesByDashboardTimeRange,
    getDashboardDisplayBoundsYmd,
} from '../utils/dashboardActivityWindow';
import { enhanceAndSortActivities } from '../utils/enhanceActivity';
import { prefetchDashboardSubTabChunk } from '../utils/prefetchTabChunks';
import { useActivitiesList } from '../hooks/useActivities';
import { SkeletonChartCard } from './ui/Skeleton';
import DashboardTodaySyncButton from './dashboard/DashboardTodaySyncButton';
import { useProfileFtp } from '../context/ProfileFtpContext';
import { useTodayIntervalsSync } from '../context/IntervalsSyncContext';
import { useTabListKeyboard } from '../hooks/useTabListKeyboard';
import OverviewTab from './dashboard/OverviewTab';
import DashboardSubTabNav from './dashboard/DashboardSubTabNav';
import TabPageShell from './shell/TabPageShell';

const CompareTab = lazyWithRetry(() => import('./dashboard/CompareTab'), 'CompareTab');

const FormTab = lazyWithRetry(() => import('./dashboard/FormTab'), 'FormTab');
const PowerTab = lazyWithRetry(() => import('./dashboard/PowerTab'), 'PowerTab');
const DistanceTab = lazyWithRetry(() => import('./dashboard/DistanceTab'), 'DistanceTab');
const VolumeTotalsTab = lazyWithRetry(() => import('./dashboard/VolumeTotalsTab'), 'VolumeTotalsTab');
const StravaProfileTab = lazyWithRetry(() => import('./data-hub/StravaProfileTab'), 'StravaProfileTab');

const DASH_SUBTAB_STORAGE_KEY = 'cpl.dashboard.subTab.v1';
const BASE_DASHBOARD_TAB_IDS = ['overview', 'form', 'power', 'distance', 'volume', 'compare'];

function readDashboardSubTab() {
    return resolveInitialDashboardSubTab();
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
    onGoToActivities,
    onGoToTraining,
    onGoToCoachHrDrift,
    stravaGetToken = null,
    stravaAthleteId = null,
    stravaProfileData = null,
    onStravaProfileData,
}) => {
    const activitiesFromContext = useActivitiesList();
    const firestoreActivities = activitiesProp ?? activitiesFromContext;
    const profileFtp = useProfileFtp();
    const manualFtp = profileFtp.ftp || manualFtpProp || 0;
    const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();
    const stravaConnected = Boolean(stravaGetToken);

    const dashboardTabIds = useMemo(
        () => (stravaConnected ? [...BASE_DASHBOARD_TAB_IDS, 'strava'] : BASE_DASHBOARD_TAB_IDS),
        [stravaConnected],
    );

    const [dashboardTab, setDashboardTab] = useState(readDashboardSubTab);

    const onDashboardTabKeyDown = useTabListKeyboard(dashboardTabIds, dashboardTab, setDashboardTab);

    useEffect(() => {
        if (!stravaConnected && dashboardTab === 'strava') {
            setDashboardTab('overview');
        }
    }, [stravaConnected, dashboardTab]);

    const handleDashboardSubTabIntent = (tabId) => {
        prefetchDashboardSubTabChunk(tabId);
    };

    useEffect(() => {
        if (typeof sessionStorage === 'undefined') return;
        safeSessionStorageSet(DASH_SUBTAB_STORAGE_KEY, dashboardTab);
    }, [dashboardTab]);

    const needsFullChartData = dashboardTab === 'power';

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

    const formDisplayBoundsYmd = useMemo(
        () => getDashboardDisplayBoundsYmd(timeRange, customStart, customEnd),
        [timeRange, customStart, customEnd],
    );

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
        <TabPageShell
            title="Dashboard"
            subtitle="Performance metrics overview"
            action={(
                <DashboardTodaySyncButton
                    onSync={syncTodayActivities}
                    isBusy={isTodaySyncBusy}
                    className="shrink-0 hidden md:flex lg:hidden"
                />
            )}
            subNav={(
                <DashboardSubTabNav
                    activeTab={dashboardTab}
                    onTabChange={setDashboardTab}
                    onTabIntent={handleDashboardSubTabIntent}
                    onKeyDown={onDashboardTabKeyDown}
                    stravaConnected={stravaConnected}
                />
            )}
        >
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
                        onGoToActivities={onGoToActivities}
                        onGoToTraining={onGoToTraining}
                        onGoToCoachHrDrift={onGoToCoachHrDrift}
                    />
                </div>
            )}

            {dashboardTab !== 'overview' && (
                <Suspense fallback={<SkeletonChartCard className="mt-2" />}>
                    {dashboardTab === 'compare' && (
                        <div role="tabpanel" id="tabpanel-compare" aria-labelledby="tab-compare">
                            <CompareTab allActivities={firestoreActivities} manualFtp={manualFtp} onGoToActivities={onGoToActivities} />
                        </div>
                    )}

                    {dashboardTab === 'form' && (
                        <div role="tabpanel" id="tabpanel-form" aria-labelledby="tab-form">
                            <FormTab
                                data={filteredData}
                                allActivities={firestoreActivities}
                                displayStartYmd={formDisplayBoundsYmd.displayStartYmd}
                                displayEndYmd={formDisplayBoundsYmd.displayEndYmd}
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
                                activities={firestoreActivities}
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

                    {dashboardTab === 'strava' && stravaConnected && (
                        <div
                            role="tabpanel"
                            id="tabpanel-strava"
                            aria-labelledby="tab-strava"
                            className="bg-cdsurface rounded-xl border border-cdborder shadow-md overflow-hidden flex flex-col p-4"
                        >
                            <StravaProfileTab
                                getStravaToken={stravaGetToken}
                                athleteId={stravaAthleteId}
                                persistedData={stravaProfileData}
                                onDataChange={onStravaProfileData}
                                activities={firestoreActivities}
                            />
                        </div>
                    )}
                </Suspense>
            )}
        </TabPageShell>
    );
};

export default Dashboard;
