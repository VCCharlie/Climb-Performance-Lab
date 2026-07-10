/**
 * Prefetch lazy-loaded tab chunks on navigation hover/focus (Bolt 4.3).
 * Each import is deduped by the module loader after the first call.
 */

const prefetched = new Set();

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
    ]),
    gearoptimizer: () => import('../components/GearOptimizer'),
    profiler: () => import('../components/ClimbProfiler'),
    bucketlist: () => import('../components/BucketList'),
    climbmap: () => import('../components/ClimbMap'),
    weather: () => import('../components/WeatherClimb'),
};

const DASHBOARD_SUBTAB_LOADERS = {
    form: () => import('../components/dashboard/FormTab'),
    power: () => import('../components/dashboard/PowerTab'),
    distance: () => import('../components/dashboard/DistanceTab'),
    volume: () => import('../components/dashboard/VolumeTotalsTab'),
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
}

/**
 * @param {string} subTabId Dashboard sub-tab id
 */
export function prefetchDashboardSubTabChunk(subTabId) {
    if (!subTabId || subTabId === 'overview') return;
    runPrefetch(`dash:${subTabId}`, DASHBOARD_SUBTAB_LOADERS[subTabId]);
}

/** Test-only */
export function resetPrefetchTabChunksForTests() {
    prefetched.clear();
}
