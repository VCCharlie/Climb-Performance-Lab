/**
 * Prefetch lazy-loaded tab chunks on navigation hover/focus (Bolt 4.3).
 * Each import is deduped by the module loader after the first call.
 */

import { loadFullClimbDatabase } from '../services/climbDatabase';
import { loadLeaflet } from './loadLeaflet';

const prefetched = new Set();

const CLIMB_TAB_IDS = new Set(['bucketlist', 'profiler', 'climbmap', 'weather']);
const LEAFLET_TAB_IDS = new Set(['climbmap', 'race']);

function prefetchClimbDatabase() {
    runPrefetch('asset:climbs', () => loadFullClimbDatabase());
}

function prefetchLeafletBundle() {
    runPrefetch('asset:leaflet', () => loadLeaflet());
}

const TAB_CHUNK_LOADERS = {
    physics: () => import('../components/PhysicsEngine'),
    activities: () => import('../components/DataHub'),
    training: () => Promise.all([
        import('../components/AICoach'),
        import('../components/TrainingGoalPlanner'),
        import('../components/RecoveryAdvisor'),
    ]),
    race: () => Promise.all([
        import('../components/FuelingStrategy'),
        import('../components/ClimbProfileCard'),
        import('../components/RacePacing'),
        prefetchLeafletBundle(),
    ]),
    gearoptimizer: () => import('../components/GearOptimizer'),
    profiler: () => Promise.all([
        import('../components/ClimbProfiler'),
        prefetchClimbDatabase(),
    ]),
    bucketlist: () => Promise.all([
        import('../components/BucketList'),
        prefetchClimbDatabase(),
    ]),
    climbmap: () => Promise.all([
        import('../components/ClimbMap'),
        prefetchClimbDatabase(),
        prefetchLeafletBundle(),
    ]),
    weather: () => Promise.all([
        import('../components/WeatherClimb'),
        prefetchClimbDatabase(),
    ]),
};

const DASHBOARD_SUBTAB_LOADERS = {
    form: () => import('../components/dashboard/FormTab'),
    power: () => import('../components/dashboard/PowerTab'),
    distance: () => import('../components/dashboard/DistanceTab'),
    volume: () => import('../components/dashboard/VolumeTotalsTab'),
    compare: () => import('../components/dashboard/CompareTab'),
    strava: () => import('../components/data-hub/StravaProfileTab'),
    overview: () => import('../components/dashboard/OverviewChartsPanel'),
};

function runPrefetch(key, loader) {
    if (prefetched.has(key) || typeof loader !== 'function') return;
    prefetched.add(key);
    loader().catch(() => {
        prefetched.delete(key);
    });
}

/**
 * @param {string} tabId Main nav tab id (see MAIN_NAV_TABS)
 */
export function prefetchMainTabChunk(tabId) {
    if (!tabId || tabId === 'dashboard') return;
    runPrefetch(`tab:${tabId}`, TAB_CHUNK_LOADERS[tabId]);
    if (CLIMB_TAB_IDS.has(tabId)) prefetchClimbDatabase();
    if (LEAFLET_TAB_IDS.has(tabId)) prefetchLeafletBundle();
}

/**
 * @param {string} subTabId Dashboard sub-tab id
 */
export function prefetchDashboardSubTabChunk(subTabId) {
    if (!subTabId) return;
    runPrefetch(`dash:${subTabId}`, DASHBOARD_SUBTAB_LOADERS[subTabId]);
}

/** Test-only */
export function resetPrefetchTabChunksForTests() {
    prefetched.clear();
}
