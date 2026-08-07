import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { Utensils, Brain, Route, Heart, Flag } from 'lucide-react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, reload } from "firebase/auth";
import { db, auth } from './firebase';
import { getDefaultClimb } from './services/climbDatabase';
import { useClimbDatabase } from './hooks/useClimbDatabase';
import { calculatePowerZones } from './utils';
import { devLog, redactSecrets } from './utils/safeLog';
import {
    stravaConfigForCloud,
    mergeStravaConfigFromCloud,
    intervalsConfigForCloud,
    mergeIntervalsConfigFromCloud,
    userSettingsForCloud,
    mergeUserSettingsFromCloud,
} from './utils/settingsCloudMerge';
import {
    userSettingsBodyForCloud,
    mergeUserSettingsBodyFromCloud,
} from './utils/settingsSecretsCloud';
import {
    hasStravaOAuthReturnInUrl,
    hasPendingStravaOAuthState,
    stripStravaOAuthParamsFromUrl,
    stripStaleStravaOAuthParamsFromUrl,
} from './utils/stravaOAuthUrl.js';

// Shell components (eager — needed for first paint and navigation)
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import PwaInstallBanner from './components/PwaInstallBanner';
import PwaUpdateBanner from './components/PwaUpdateBanner';
import OrientationGuard from './components/OrientationGuard';
import { LoadingPanel, SegmentedControl } from './components/ui';
import { MainNav, MobileBottomNav, GetStartedChecklist } from './components/shell';
import SignInGate from './components/SignInGate';
import { lazyWithRetry } from './utils/lazyWithRetry.js';

// Main tabs (lazy — loaded on first visit; Dashboard stays eager as default tab)
const PhysicsEngine = lazyWithRetry(() => import('./components/PhysicsEngine'), 'PhysicsEngine');
const DataHub = lazyWithRetry(() => import('./components/DataHub'), 'DataHub');
const FuelingStrategy = lazyWithRetry(() => import('./components/FuelingStrategy'), 'FuelingStrategy');
const AICoach = lazyWithRetry(() => import('./components/AICoach'), 'AICoach');
const TrainingGoalPlanner = lazyWithRetry(() => import('./components/TrainingGoalPlanner'), 'TrainingGoalPlanner');
const ClimbProfileCard = lazyWithRetry(() => import('./components/ClimbProfileCard'), 'ClimbProfileCard');
const RacePacing = lazyWithRetry(() => import('./components/RacePacing'), 'RacePacing');
const GearOptimizer = lazyWithRetry(() => import('./components/GearOptimizer'), 'GearOptimizer');
const ClimbProfiler = lazyWithRetry(() => import('./components/ClimbProfiler'), 'ClimbProfiler');
const RecoveryAdvisor = lazyWithRetry(() => import('./components/RecoveryAdvisor'), 'RecoveryAdvisor');
const BucketList = lazyWithRetry(() => import('./components/BucketList'), 'BucketList');
const WeatherClimb = lazyWithRetry(() => import('./components/WeatherClimb'), 'WeatherClimb');
const ClimbMap = lazyWithRetry(() => import('./components/ClimbMap'), 'ClimbMap');

import useStravaAuth from './hooks/useStravaAuth';
import { applyTheme } from './theme/applyTheme';
import { consumeNavRestore, persistMainTab, readPersistedMainTab, resolveInitialMainTab, resolveInitialDataHubInternalTab } from './utils/sessionNavRestore';
import { mergeVolumeGoals, hydrateYearlyGoalsFromLegacy } from './utils/volumeGoals';
import {
    clearSensitiveLocalStorage,
    consumeExplicitSignOut,
    clearExplicitSignOutFlag,
    getDefaultUserSettings,
    getDefaultIntervalsConfig,
    getDefaultStravaConfig,
    getDefaultBucketListState,
} from './utils/sessionData';
import { safeLocalStorageSet } from './utils/safeStorage.js';
import { migrateLegacyBucketState, setClimbBucketStatus } from './utils/bucketListState';
import {
    syncBucketListToFirestore,
    BUCKET_LIST_CLOUD_DEBOUNCE_MS,
    resolveBucketListOnSync,
    fetchBucketListFromFirestore,
    stampBucketListState,
    applyBucketListStateChange,
    shouldImmediateSyncBucketList,
} from './utils/bucketListCloudSync';
import {
    syncCoachWeekToFirestore,
    fetchCoachWeekFromFirestore,
    resolveCoachWeekOnSync,
    shouldApplyRemoteCoachWeek,
    shouldPushLocalCoachWeek,
    COACH_WEEK_CLOUD_DEBOUNCE_MS,
} from './utils/coach/coachWeekCloudSync';
import {
    readRawCoachWeekForSync,
    readRawCoachWeekForPush,
    applyCoachWeekStateToLocal,
    isoWeekKey,
    COACH_WEEK_UPDATED_EVENT,
    dispatchCoachWeekUpdated,
} from './utils/coach/coachWeekState';
import { todayYmd } from './utils/coach/coachHelpers';
import { runGoogleSignIn, isGoogleSignInInProgress, googleSignInErrorMessage, completeGoogleRedirectIfNeeded } from './utils/googleSignIn';
import { notify } from './utils/notify';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ActivitiesProvider, useActivitiesState } from './context/ActivitiesContext';
import { useActivitiesList } from './hooks/useActivities';
import { ActivityLogNavigationProvider, useActivityLogNavigation } from './context/ActivityLogNavigationContext';
import { ProfileFtpProvider } from './context/ProfileFtpContext';
import TrainingFtpContextNote from './components/coach/TrainingFtpContextNote';
import { TodayIntervalsSyncProvider } from './context/TodayIntervalsSyncContext';

function GetStartedStrip({ userSettings, intervalsConfig, onOpenSettings, onGoToActivities }) {
    const activities = useActivitiesList();
    return (
        <GetStartedChecklist
            userSettings={userSettings}
            intervalsConfig={intervalsConfig}
            activityCount={activities.length}
            onOpenSettings={onOpenSettings}
            onGoToActivities={onGoToActivities}
        />
    );
}

function AppLoadingGate({ authReady, user, authBusy, authError, onSignIn, children }) {
    const { isLoading: activitiesLoading, activities } = useActivitiesState();
    const waitingForInitialActivities = Boolean(user) && activitiesLoading && activities.length === 0;
    if (!authReady || authBusy || waitingForInitialActivities) {
        return <LoadingPanel />;
    }
    if (!user) {
        return <SignInGate onSignIn={onSignIn} authBusy={authBusy} authError={authError} />;
    }
    return children;
}

function DashboardWithNavigation(props) {
    const { openActivityInLog, openActivityLogDateRange } = useActivityLogNavigation();
    return (
        <Dashboard
            {...props}
            onOpenActivityInLog={openActivityInLog}
            onOpenActivityLogDateRange={openActivityLogDateRange}
        />
    );
}
function BucketListWithNavigation(props) {
    const { openActivityInLog } = useActivityLogNavigation();
    return (
        <BucketList
            {...props}
            onOpenActivityInLog={openActivityInLog}
        />
    );
}

const CLIMB_HEAVY_TABS = new Set([
    'profiler', 'bucketlist', 'climbmap', 'weather', 'gearoptimizer', 'physics', 'activities',
]);

const MAIN_TAB_IDS = new Set([
    'dashboard', 'physics', 'activities', 'training', 'race', 'gearoptimizer',
    'profiler', 'bucketlist', 'climbmap', 'weather',
]);

const App = () => {
    const [activeTab, setActiveTab] = useState(() => resolveInitialMainTab());
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleTabChange = useCallback((tab) => {
        if (tab && MAIN_TAB_IDS.has(tab)) {
            persistMainTab(tab);
            setActiveTab(tab);
        }
    }, []);

    const [userSettings, setUserSettings] = useState(() => {
        const saved = localStorage.getItem('userSettings');
        const defaults = getDefaultUserSettings();
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Corrupt localStorage (non-object JSON) must not crash the app on spread.
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return defaults;
                }
                return {
                    ...defaults,
                    ...parsed,
                    volumeGoals: mergeVolumeGoals(parsed.volumeGoals),
                    goals: hydrateYearlyGoalsFromLegacy(
                        { ...defaults.goals, ...parsed.goals },
                        parsed.volumeGoals,
                    ),
                };
            } catch { /* */ }
        }
        return defaults;
    });

    const [selectedClimb, setSelectedClimb] = useState(getDefaultClimb);
    const { climbs: climbDatabase, loadFull: loadFullClimbDatabase } = useClimbDatabase();

    useEffect(() => {
        if (CLIMB_HEAVY_TABS.has(activeTab)) {
            loadFullClimbDatabase();
        }
    }, [activeTab, loadFullClimbDatabase]);

    const [intervalsConfig, setIntervalsConfig] = useState(() => {
        const saved = localStorage.getItem('intervalsConfig');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return getDefaultIntervalsConfig();
    });

    // Strava config: connection metadata in localStorage + Firestore (tokens server-side only)
    const [stravaConfig, setStravaConfig] = useState(() => {
        const saved = localStorage.getItem('stravaConfig');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return getDefaultStravaConfig();
    });

    const updateStravaConfig = (key, value) => {
        setStravaConfig(prev => {
            const updated = { ...prev, [key]: value };
            safeLocalStorageSet('stravaConfig', JSON.stringify(updated));
            return updated;
        });
    };

    const stravaAuth = useStravaAuth(stravaConfig, setStravaConfig);

    // Strava verrijkingsresultaten: bewaard over tab-wissels heen (niet persistent)
    const [stravaEnrichResults, setStravaEnrichResults] = useState(null);

    // Strava profieldata: bewaard over tab-wissels én persistent via localStorage + Firestore
    const [stravaProfileData, setStravaProfileData] = useState(() => {
        const saved = localStorage.getItem('stravaProfileData');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return null;
    });

    // Globale periode-selector: gedeeld tussen Dashboard en andere tabs
    const [timeRange, setTimeRange] = useState(() => localStorage.getItem('dashboard_timeRange') || '1Y');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        safeLocalStorageSet('dashboard_timeRange', timeRange);
    }, [timeRange]);

    // Berekende start/end strings (voor StravaEnrichTab e.a.)
    const globalStartDate = useMemo(() => {
        if (timeRange === 'Custom') return customStart || '';
        const d = new Date();
        if (timeRange === '1M') d.setMonth(d.getMonth() - 1);
        else if (timeRange === '3M') d.setMonth(d.getMonth() - 3);
        else if (timeRange === '6M') d.setMonth(d.getMonth() - 6);
        else if (timeRange === '1Y') d.setFullYear(d.getFullYear() - 1);
        else if (timeRange === '3Y') d.setFullYear(d.getFullYear() - 3);
        else if (timeRange === '6Y') d.setFullYear(d.getFullYear() - 6);
        else if (timeRange === 'ALL') return '2000-01-01';
        return d.toISOString().split('T')[0];
    }, [timeRange, customStart]);

    const globalEndDate = useMemo(() => {
        if (timeRange === 'Custom') return customEnd || new Date().toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    }, [timeRange, customEnd]);

    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState(null);

    // ⚡ Bolt: Stable ref so memo(Header) can skip re-renders when only unrelated state changes.
    const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);

    const applySignedOutSessionWipe = useCallback(() => {
        clearSensitiveLocalStorage();
        setUserSettings(getDefaultUserSettings());
        setIntervalsConfig(getDefaultIntervalsConfig());
        setStravaConfig(getDefaultStravaConfig());
        setStravaProfileData(null);
        setStravaEnrichResults(null);
        setBucketListState(getDefaultBucketListState());
    }, []);

    const handleSignIn = useCallback(async () => {
        if (authBusy) return;
        try {
            await completeGoogleRedirectIfNeeded();
        } catch (err) {
            const message = googleSignInErrorMessage(err);
            setAuthError(message);
            return;
        }
        if (hasStravaOAuthReturnInUrl() && !hasPendingStravaOAuthState()) {
            stripStaleStravaOAuthParamsFromUrl();
        }
        setAuthError(null);
        setAuthBusy(true);
        try {
            await runGoogleSignIn();
        } catch (err) {
            const message = googleSignInErrorMessage(err);
            setAuthError(message);
        } finally {
            setAuthBusy(false);
        }
    }, [authBusy]);

    /** Strava profile: update UI + localStorage + Firestore (must be after `user` — avoids TDZ if placed above). */
    const handleStravaProfileData = useCallback((next) => {
        setStravaProfileData(next);
        const forPersistence = next
            ? (() => {
                const { scannedBikeActivities: _s, ...rest } = next;
                return rest;
            })()
            : null;
        if (forPersistence) {
            try {
                if (user) {
                    safeLocalStorageSet('stravaProfileData', JSON.stringify(forPersistence));
                }
            } catch { /* quota */ }
        } else {
            localStorage.removeItem('stravaProfileData');
        }
        if (!db || !user) return;
        const settingsId = user ? `user_${user.uid}` : 'user_prefs';
        setDoc(doc(db, 'settings', settingsId), { stravaProfile: forPersistence }, { merge: true }).catch((e) => {
            console.warn('[Strava profile] Could not sync to Firestore:', e);
        });
    }, [user]);

    // State for new features (persistent across tab switches)
    const [racePacingState, setRacePacingState] = useState({
        selectedClimbs: [],
        recoveryMinutes: {},
        targetIntensity: 0.85
    });
    const [gearOptimizerState, setGearOptimizerState] = useState({
        selectedClimb: getDefaultClimb(),
        chainrings: [50, 34],
        cassette: [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28],
        wheelDiameter: 700,
        tyreMm: 25,
        targetCadence: 80
    });
    const [climbProfilerState, setClimbProfilerState] = useState({
        selectedClimb: getDefaultClimb(),
        showPowerZones: true,
        targetIntensity: 0.85
    });

    const handleOpenProfilerFromActivity = useCallback((_activity, climb) => {
        const target = climb && climb.id ? climb : getDefaultClimb();
        setClimbProfilerState((prev) => ({
            ...prev,
            selectedClimb: target,
        }));
        setActiveTab('profiler');
        persistMainTab('profiler');
    }, []);

    const handleOpenProfilerForClimb = useCallback((climb) => {
        if (!climb?.id) return;
        setClimbProfilerState((prev) => ({
            ...prev,
            selectedClimb: climb,
        }));
        setActiveTab('profiler');
        persistMainTab('profiler');
    }, []);

    const [fuelingState, setFuelingState] = useState({
        duration: 180,
        intensity: 0.85,
        carbsPerHour: null,
        totalCarbs: null,
        altitude: 0,
        fromRacePacing: false,
    });
    const [bucketListState, setBucketListState] = useState(() => {
        const saved = localStorage.getItem('bucketListState');
        if (saved) {
            try {
                return migrateLegacyBucketState(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse bucketListState from localStorage", e);
            }
        }
        return getDefaultBucketListState();
    });
    /** Bumps when bucket list is replaced from cloud/login — not on local edits (avoids wiping toggles). */
    const [bucketListRemoteRevision, setBucketListRemoteRevision] = useState(0);
    const bumpBucketListRemoteRevision = useCallback(() => {
        setBucketListRemoteRevision((n) => n + 1);
    }, []);







    // Persist userSettings to localStorage (secrets stay local — never in Firestore).
    useEffect(() => {
        safeLocalStorageSet('userSettings', JSON.stringify(userSettings));
    }, [userSettings]);

    // Persist intervalsConfig to localStorage (API key stays local — never in Firestore).
    useEffect(() => {
        safeLocalStorageSet('intervalsConfig', JSON.stringify(intervalsConfig));
    }, [intervalsConfig]);

    useEffect(() => {
        safeLocalStorageSet('bucketListState', JSON.stringify(bucketListState));
    }, [bucketListState]);

    const photoReloadAttemptedRef = useRef(new Set());
    const authenticatedUserRef = useRef(null);
    const bucketListCloudReadyRef = useRef(false);
    const bucketListStateRef = useRef(bucketListState);
    bucketListStateRef.current = bucketListState;

    // Auto-sync bucket list to Firestore when signed in (cross-device).
    useEffect(() => {
        if (!user || !db || !bucketListCloudReadyRef.current) return undefined;

        const timer = setTimeout(() => {
            syncBucketListToFirestore(db, user.uid, bucketListState);
        }, BUCKET_LIST_CLOUD_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [bucketListState, user]);

    const handleBucketListStateChange = useCallback((state) => {
        // Compute outside the setState updater so sync is not a render-phase side effect
        // (Strict Mode can double-invoke updaters) and so we enqueue exactly one write.
        const previous = migrateLegacyBucketState(bucketListStateRef.current);
        const stamped = applyBucketListStateChange(previous, state);
        bucketListStateRef.current = stamped;
        setBucketListState(stamped);
        if (
            user
            && db
            && bucketListCloudReadyRef.current
            && shouldImmediateSyncBucketList(previous, stamped)
        ) {
            syncBucketListToFirestore(db, user.uid, stamped);
        }
    }, [user]);

    const [weatherClimbState, setWeatherClimbState] = useState({
        selectedClimb: getDefaultClimb(),
        targetPower: 280 * 0.85,
        temperature: 20,
        windSpeed: 0,
        windDirection: 'none',
        humidity: 50
    });

    // Sub-tab states for merged tabs
    const [trainingSubTab, setTrainingSubTab] = useState('coach'); // 'coach' | 'goal' | 'recovery'

    /** Vanuit Dashboard: focus één activiteit in DataHub log; handled via ActivityLogNavigationContext. */
    const [raceSubTab, setRaceSubTab] = useState('fueling');       // 'fueling' | 'racepacing'

    // Auth Listener — finish redirect sign-in first, then listen for session changes.
    useEffect(() => {
        if (!auth) {
            setAuthReady(true);
            return;
        }

        let cancelled = false;

        const finishRedirectSignIn = async () => {
            try {
                setAuthBusy(true);
                await completeGoogleRedirectIfNeeded();
            } catch (err) {
                if (!cancelled) {
                    const message = googleSignInErrorMessage(err);
                    setAuthError(message);
                }
            } finally {
                if (!cancelled) setAuthBusy(false);
            }
        };

        finishRedirectSignIn();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                photoReloadAttemptedRef.current.clear();
                if (isGoogleSignInInProgress()) {
                    // Popup open — keep SignInGate visible; do not wipe session mid sign-in.
                    setAuthReady(true);
                    return;
                }
                if (consumeExplicitSignOut()) {
                    applySignedOutSessionWipe();
                }
                authenticatedUserRef.current = null;
                setUser(null);
                setAuthReady(true);
                return;
            }
            if (!firebaseUser.photoURL) {
                const uid = firebaseUser.uid;
                if (!photoReloadAttemptedRef.current.has(uid)) {
                    photoReloadAttemptedRef.current.add(uid);
                    try {
                        await reload(firebaseUser);
                    } catch {
                        photoReloadAttemptedRef.current.delete(uid);
                    }
                }
            }
            clearExplicitSignOutFlag();
            setUser(auth.currentUser);
            authenticatedUserRef.current = auth.currentUser;
            setAuthReady(true);
        });
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [applySignedOutSessionWipe]);

    // Drop stale Strava ?code= params after Google redirect handling (shared boot guard).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await completeGoogleRedirectIfNeeded();
            } catch {
                /* auth listener / SignInGate surface errors */
            }
            if (cancelled) return;
            stripStaleStravaOAuthParamsFromUrl();
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Strava OAuth callback: wait for Firebase session after redirect from Strava
    const stravaOAuthHandledRef = useRef(false);
    useEffect(() => {
        if (!authReady || !user || stravaOAuthHandledRef.current) return;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        if (!code) return;

        if (!hasPendingStravaOAuthState()) {
            stripStravaOAuthParamsFromUrl();
            return;
        }

        stravaOAuthHandledRef.current = true;
        stravaAuth.handleOAuthCallback(code, state)
            .then((result) => {
                if (result?.stale) {
                    console.info('[Strava] Ignored stale OAuth redirect params in URL.');
                }
            })
            .catch((e) => {
                console.error('Strava OAuth error:', e);
                notify('Strava connection failed: ' + e.message, { variant: 'error', durationMs: 10000 });
            });
    }, [authReady, user, stravaAuth]);

    useEffect(() => {
        if (user) setAuthError(null);
    }, [user]);

    // 1. Settings Laden (One-time fetch) — signed-in only
    useEffect(() => {
        if (!user) {
            bucketListCloudReadyRef.current = false;
            return undefined;
        }

        let cancelled = false;
        bucketListCloudReadyRef.current = false;

        const loadSettings = async () => {
            if (!db || !user) return;

            try {
                const settingsId = `user_${user.uid}`;
                const docRef = doc(db, "settings", settingsId);
                const docSnap = await getDoc(docRef);
                if (cancelled) return;

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.intervals) {
                        setIntervalsConfig((prev) => mergeIntervalsConfigFromCloud(data.intervals, prev));
                    }
                    if (data.body) {
                        let localPrev = getDefaultUserSettings();
                        try {
                            const raw = localStorage.getItem('userSettings');
                            if (raw) localPrev = { ...localPrev, ...JSON.parse(raw) };
                        } catch {
                            /* ignore */
                        }
                        const mergedBody = await mergeUserSettingsBodyFromCloud(
                            data.body,
                            localPrev,
                            user.uid,
                        );
                        if (cancelled) return;
                        setUserSettings((prev) => {
                            const merged = { ...prev, ...mergedBody };
                            merged.volumeGoals = mergeVolumeGoals(data.body.volumeGoals ?? prev.volumeGoals);
                            merged.goals = hydrateYearlyGoalsFromLegacy(merged.goals, merged.volumeGoals);
                            return merged;
                        });
                    }
                    if (data.theme) {
                        setTheme(data.theme);
                        safeLocalStorageSet('theme', data.theme);
                    }
                    if (data.bucketList) {
                        let localRaw = null;
                        try {
                            const saved = localStorage.getItem('bucketListState');
                            if (saved) localRaw = JSON.parse(saved);
                        } catch {
                            localRaw = null;
                        }
                        const localMigrated = migrateLegacyBucketState(localRaw);
                        const resolved = resolveBucketListOnSync(
                            localMigrated,
                            localMigrated.updatedAt,
                            data.bucketList,
                            data.bucketListUpdatedAt,
                        );
                        setBucketListState(resolved.state);
                        safeLocalStorageSet('bucketListState', JSON.stringify(resolved.state));
                        if (resolved.source === 'cloud') {
                            bumpBucketListRemoteRevision();
                        }
                    }
                    if (data.strava) {
                        setStravaConfig((prev) => {
                            const merged = mergeStravaConfigFromCloud(data.strava, prev);
                            safeLocalStorageSet('stravaConfig', JSON.stringify(merged));
                            return merged;
                        });
                    }
                    if (data.stravaProfile) {
                        setStravaProfileData(data.stravaProfile);
                        safeLocalStorageSet('stravaProfileData', JSON.stringify(data.stravaProfile));
                    }
                }

                const weekKey = isoWeekKey(todayYmd());
                const cloudWeek = docSnap.exists() ? docSnap.data()?.coachWeekState : null;
                const resolvedWeek = resolveCoachWeekOnSync(
                    readRawCoachWeekForSync(),
                    cloudWeek,
                    weekKey,
                );
                applyCoachWeekStateToLocal(resolvedWeek.state);
                if (resolvedWeek.source === 'cloud') {
                    dispatchCoachWeekUpdated();
                }
            } catch (e) {
                console.error("Error loading settings", e);
            } finally {
                if (!cancelled) {
                    bucketListCloudReadyRef.current = true;
                }
            }
        };
        loadSettings();
        return () => {
            cancelled = true;
            bucketListCloudReadyRef.current = false;
        };
    }, [user]);

    // Push coach week edits to Firestore when signed in (blocked days, moves, completions).
    useEffect(() => {
        if (!user || !db || !bucketListCloudReadyRef.current) return undefined;

        let timer = null;

        const pushCoachWeek = () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const raw = readRawCoachWeekForPush();
                if (!raw?.weekKey) return;

                try {
                    const remote = await fetchCoachWeekFromFirestore(db, user.uid);
                    if (!shouldPushLocalCoachWeek(raw, remote?.state ?? null, raw.weekKey)) {
                        return;
                    }
                    await syncCoachWeekToFirestore(db, user.uid, raw);
                } catch (err) {
                    console.warn('[Coach week] Could not push to Firestore:', err);
                }
            }, COACH_WEEK_CLOUD_DEBOUNCE_MS);
        };

        window.addEventListener(COACH_WEEK_UPDATED_EVENT, pushCoachWeek);
        return () => {
            window.removeEventListener(COACH_WEEK_UPDATED_EVENT, pushCoachWeek);
            clearTimeout(timer);
        };
    }, [user]);

    // Pull coach week from cloud on sign-in, Training tab, and when the tab regains focus.
    useEffect(() => {
        if (!user || !db) return undefined;

        let cancelled = false;

        const refreshCoachWeekFromCloud = async () => {
            if (!bucketListCloudReadyRef.current || cancelled) return;

            try {
                const remote = await fetchCoachWeekFromFirestore(db, user.uid);
                if (cancelled) return;

                const weekKey = isoWeekKey(todayYmd());
                const localRaw = readRawCoachWeekForSync();

                if (!remote?.state) {
                    if (localRaw?.weekKey && shouldPushLocalCoachWeek(localRaw, null, weekKey)) {
                        await syncCoachWeekToFirestore(db, user.uid, readRawCoachWeekForPush());
                    }
                    return;
                }

                if (!shouldApplyRemoteCoachWeek(localRaw, remote.state, weekKey)) {
                    if (localRaw?.weekKey && shouldPushLocalCoachWeek(localRaw, remote.state, weekKey)) {
                        await syncCoachWeekToFirestore(db, user.uid, readRawCoachWeekForPush());
                    }
                    return;
                }

                const resolved = resolveCoachWeekOnSync(localRaw, remote.state, weekKey);
                applyCoachWeekStateToLocal(resolved.state);
                dispatchCoachWeekUpdated();
            } catch (err) {
                console.warn('[Coach week] Could not refresh from cloud:', err);
            }
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshCoachWeekFromCloud();
            }
        };

        if (activeTab === 'training') {
            refreshCoachWeekFromCloud();
        }

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [activeTab, user]);

    // Refresh bucket list from Firestore when opening the tab (keeps mobile/PC in sync).
    useEffect(() => {
        if (!user || !db || activeTab !== 'bucketlist' || !bucketListCloudReadyRef.current) {
            return undefined;
        }

        let cancelled = false;

        const refresh = async () => {
            await new Promise((resolve) => {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(() => resolve(), { timeout: 2000 });
                } else {
                    setTimeout(resolve, 32);
                }
            });
            if (cancelled) return;
            try {
                const remote = await fetchBucketListFromFirestore(db, user.uid);
                if (cancelled || !remote?.state) return;

                setBucketListState((prev) => {
                    const resolved = resolveBucketListOnSync(
                        prev,
                        prev.updatedAt,
                        remote.state,
                        remote.updatedAt,
                    );
                    if (resolved.source === 'cloud') {
                        safeLocalStorageSet('bucketListState', JSON.stringify(resolved.state));
                        bumpBucketListRemoteRevision();
                    }
                    return resolved.state;
                });
            } catch (err) {
                console.warn('[Bucket list] Could not refresh from cloud:', err);
            }
        };

        refresh();
        return () => {
            cancelled = true;
        };
    }, [activeTab, user, bumpBucketListRemoteRevision]);

    // Update Power Zones
    useEffect(() => {
        if (userSettings.ftp && (!userSettings.powerZones || userSettings.powerZones.length === 0)) {
            setUserSettings(prev => ({ ...prev, powerZones: calculatePowerZones(prev.ftp) }));
        }
    }, [userSettings.ftp, userSettings.powerZones]);

    const saveSettingsToCloud = async () => {
        if (!db || !user) return;
        try {
            const settingsId = user ? `user_${user.uid}` : "user_prefs";

            // SECURITY: Never save raw API keys, secrets, or OAuth tokens to Firestore
            const safeIntervals = intervalsConfigForCloud(intervalsConfig);
            const safeBody = await userSettingsBodyForCloud(userSettings, user.uid);
            const safeStrava = stravaConfigForCloud(stravaConfig);
            devLog('Saving Settings to Cloud:', redactSecrets({
                intervals: intervalsConfig,
                body: userSettings,
                theme,
                bucketList: bucketListState,
                strava: stravaConfig,
                stravaProfile: stravaProfileData,
            }));

            // Resolve against remote first so a stale in-memory bucket list cannot
            // overwrite newer PB/status data written by another device.
            let bucketToSync = bucketListState;
            try {
                const remote = await fetchBucketListFromFirestore(db, user.uid);
                if (remote?.state) {
                    const resolved = resolveBucketListOnSync(
                        bucketListState,
                        bucketListState.updatedAt,
                        remote.state,
                        remote.updatedAt,
                    );
                    bucketToSync = resolved.state;
                    if (resolved.source === 'cloud') {
                        setBucketListState(resolved.state);
                        safeLocalStorageSet('bucketListState', JSON.stringify(resolved.state));
                        bumpBucketListRemoteRevision();
                    }
                }
            } catch (err) {
                console.warn('[Bucket list] Could not resolve before settings save:', err);
            }

            await setDoc(doc(db, "settings", settingsId), {
                intervals: safeIntervals,
                body: safeBody,
                theme: theme,
                strava: safeStrava,
                stravaProfile: stravaProfileData,
                // bucketList + bucketListUpdatedAt: only via syncBucketListToFirestore
            }, { merge: true });

            await syncBucketListToFirestore(db, user.uid, bucketToSync);
            notify('Settings saved.', { variant: 'success' });
        } catch (e) { notify('Error saving settings: ' + e.message, { variant: 'error', durationMs: 10000 }); }
    };

    const cleanupCloudTokens = async () => {
        if (!db) {
            notify('Cloud database is not available.', { variant: 'error' });
            return;
        }
        try {
            const settingsId = user ? `user_${user.uid}` : 'user_prefs';
            await setDoc(doc(db, 'settings', settingsId), {
                strava: stravaConfigForCloud(stravaConfig),
            }, { merge: true });
            notify('Stored OAuth tokens were removed from the cloud. Your local Strava connection is unchanged.', { variant: 'success' });
        } catch (e) {
            notify('Could not clean cloud tokens: ' + e.message, { variant: 'error', durationMs: 10000 });
        }
    };

    const handleImportBackup = (backupData) => {
        if (backupData.settings) {
            setUserSettings((prev) => ({ ...prev, ...backupData.settings }));
        }
        if (backupData.intervals) {
            setIntervalsConfig((prev) => ({ ...prev, ...backupData.intervals }));
        }
        if (backupData.bucketList) {
            setBucketListState(stampBucketListState(migrateLegacyBucketState(backupData.bucketList)));
            bumpBucketListRemoteRevision();
        }
        if (backupData.strava) {
            setStravaConfig((prev) => {
                const merged = { ...prev, ...backupData.strava };
                safeLocalStorageSet('stravaConfig', JSON.stringify(merged));
                return merged;
            });
        }
        if (backupData.stravaProfile) {
            setStravaProfileData(backupData.stravaProfile);
            safeLocalStorageSet('stravaProfileData', JSON.stringify(backupData.stravaProfile));
        }
        if (backupData.theme) {
            setTheme(backupData.theme);
            safeLocalStorageSet('theme', backupData.theme);
        }
        notify('Backup restored successfully!', { variant: 'success' });
    };

    // Chart Data logic moved to Dashboard.jsx


    const navigateToActivities = useCallback(() => {
        persistMainTab('activities');
        setActiveTab('activities');
    }, []);

    const [dataHubMountKey, setDataHubMountKey] = useState(0);
    const [dataHubMountTab, setDataHubMountTab] = useState(() => resolveInitialDataHubInternalTab());

    const navigateToActivitiesSync = useCallback(() => {
        persistMainTab('activities');
        setDataHubMountTab('import');
        setDataHubMountKey((key) => key + 1);
        setActiveTab('activities');
    }, []);

    const isDark = theme === 'dark';
    const mainClass = isDark ? 'bg-cdbg text-cdtext' : 'bg-cdbg text-cdtext';

    return (
        <ToastProvider>
        <ConfirmProvider>
        <ActivitiesProvider key={user?.uid ?? 'signed-out'} user={user}>
            <ActivityLogNavigationProvider onNavigateToActivities={navigateToActivities}>
                <ProfileFtpProvider userSettings={userSettings}>
                    <TodayIntervalsSyncProvider
                        intervalsConfig={intervalsConfig}
                        stravaGetToken={stravaAuth.isConnected ? stravaAuth.getValidToken : null}
                        userSettings={userSettings}
                    >
                <div className={`min-h-screen font-sans pb-20 md:pb-20 transition-colors duration-300 ${mainClass}`}>
                    <a href="#main-content" className="cd-skip-link">
                        Skip to main content
                    </a>

                    <Header
                        userSettings={userSettings}
                        onOpenSettings={handleOpenSettings}
                        user={user}
                        activeTab={user ? activeTab : null}
                        timeRange={timeRange}
                        onTimeRangeChange={setTimeRange}
                        customStart={customStart}
                        customEnd={customEnd}
                        onCustomStart={setCustomStart}
                        onCustomEnd={setCustomEnd}
                    />

                    <main id="main-content" className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'activities' && user ? 'max-w-[95%]' : 'max-w-7xl'}`}>
                        {user && (
                            <MainNav
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                timeRange={timeRange}
                                onTimeRangeChange={setTimeRange}
                                customStart={customStart}
                                customEnd={customEnd}
                                onCustomStart={setCustomStart}
                                onCustomEnd={setCustomEnd}
                            />
                        )}

                        {user && (
                            <GetStartedStrip
                                userSettings={userSettings}
                                intervalsConfig={intervalsConfig}
                                onOpenSettings={handleOpenSettings}
                                onGoToActivities={navigateToActivities}
                            />
                        )}

                        <AppLoadingGate authReady={authReady} user={user} authBusy={authBusy} authError={authError} onSignIn={handleSignIn}>
                            <div className="cd-enter">
                                {activeTab === 'dashboard' && (
                                    <DashboardWithNavigation
                                        theme={theme}
                                        manualFtp={userSettings.ftp}
                                        timeRange={timeRange}
                                        customStart={customStart}
                                        customEnd={customEnd}
                                        userWeightKg={userSettings.weight}
                                        referenceEndDate={globalEndDate}
                                        userSettings={userSettings}
                                        onOpenSettings={handleOpenSettings}
                                        onGoToActivities={navigateToActivities}
                                        stravaGetToken={stravaAuth.isConnected ? stravaAuth.getValidToken : null}
                                        stravaAthleteId={stravaConfig?.athlete_id}
                                        stravaProfileData={stravaProfileData}
                                        onStravaProfileData={handleStravaProfileData}
                                    />
                                )}

                                {activeTab !== 'dashboard' && (
                                    <Suspense fallback={<LoadingPanel message="Loading tab…" />}>
                                        {activeTab === 'physics' && (
                                            <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />
                                        )}

                                        {activeTab === 'activities' && (
                                            <DataHub
                                                key={dataHubMountKey}
                                                intervalsConfig={intervalsConfig}
                                                stravaGetToken={stravaAuth.isConnected ? stravaAuth.getValidToken : null}
                                                startDate={globalStartDate}
                                                endDate={globalEndDate}
                                                stravaEnrichResults={stravaEnrichResults}
                                                onStravaEnrichResults={setStravaEnrichResults}
                                                onOpenProfilerFromActivity={handleOpenProfilerFromActivity}
                                                climbDatabaseForMatch={climbDatabase}
                                                initialInternalTab={dataHubMountTab}
                                                profileFtp={userSettings?.ftp}
                                                profileMaxHr={userSettings?.maxHr}
                                                userSettings={userSettings}
                                                isSignedIn={!!user}
                                            />
                                        )}

                                        {activeTab === 'training' && (
                                            <div>
                                                <TrainingFtpContextNote userSettings={userSettings} />
                                                <SegmentedControl
                                                    className="mb-4"
                                                    size="lg"
                                                    caps={false}
                                                    value={trainingSubTab}
                                                    onChange={setTrainingSubTab}
                                                    aria-label="Training section"
                                                    options={[
                                                        { value: 'coach', label: 'AI Coach', icon: Brain },
                                                        { value: 'goal', label: 'Goals & Planning', icon: Flag },
                                                        { value: 'recovery', label: 'Recovery', icon: Heart },
                                                    ]}
                                                />
                                                {trainingSubTab === 'coach' && (
                                                    <AICoach
                                                        userSettings={userSettings}
                                                        setUserSettings={setUserSettings}
                                                        startDate={globalStartDate}
                                                        endDate={globalEndDate}
                                                        isSignedIn={Boolean(user)}
                                                        intervalsConfig={intervalsConfig}
                                                        onGoToActivities={navigateToActivities}
                                                        onOpenSettings={handleOpenSettings}
                                                    />
                                                )}
                                                {trainingSubTab === 'goal' && (
                                                    <TrainingGoalPlanner
                                                        userSettings={userSettings}
                                                        startDate={globalStartDate}
                                                        endDate={globalEndDate}
                                                        onOpenRecovery={() => setTrainingSubTab('recovery')}
                                                    />
                                                )}
                                                {trainingSubTab === 'recovery' && (
                                                    <RecoveryAdvisor
                                                        startDate={globalStartDate}
                                                        endDate={globalEndDate}
                                                        onGoToActivities={navigateToActivities}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'race' && (
                                    <div>
                                        <SegmentedControl
                                            className="mb-4"
                                            size="lg"
                                            caps={false}
                                            value={raceSubTab}
                                            onChange={setRaceSubTab}
                                            aria-label="Race section"
                                            options={[
                                                { value: 'fueling', label: 'Fueling', icon: Utensils },
                                                { value: 'racepacing', label: 'Race Pacing', icon: Route },
                                            ]}
                                        />
                                        {raceSubTab === 'fueling' && (
                                            <FuelingStrategy
                                                initialDuration={fuelingState.duration}
                                                initialIntensity={fuelingState.intensity}
                                                initialCarbsPerHour={fuelingState.carbsPerHour}
                                                initialTotalCarbs={fuelingState.totalCarbs}
                                                initialAltitude={fuelingState.altitude}
                                                fromRacePacing={fuelingState.fromRacePacing}
                                            />
                                        )}
                                        {raceSubTab === 'racepacing' && (
                                            <RacePacing
                                                userSettings={userSettings}
                                                initialState={racePacingState}
                                                onStateChange={setRacePacingState}
                                                onExportToFueling={(handoff) => {
                                                    if (!handoff) return;
                                                    setFuelingState({
                                                        duration: handoff.duration,
                                                        intensity: handoff.intensity,
                                                        carbsPerHour: handoff.carbsPerHour,
                                                        totalCarbs: handoff.totalCarbs,
                                                        altitude: handoff.altitude,
                                                        fromRacePacing: true,
                                                    });
                                                    setRaceSubTab('fueling');
                                                }}
                                            />
                                        )}
                                    </div>
                                )}

                                {activeTab === 'gearoptimizer' && (
                                    <GearOptimizer
                                        userSettings={userSettings}
                                        initialState={gearOptimizerState}
                                        onStateChange={setGearOptimizerState}
                                    />
                                )}

                                {/* Profiler: ClimbProfiler + ClimbProfileCard side by side */}
                                {activeTab === 'profiler' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="lg:col-span-2">
                                            <ClimbProfiler
                                                userSettings={userSettings}
                                                theme={theme}
                                                initialState={climbProfilerState}
                                                onStateChange={setClimbProfilerState}
                                                onOpenBucketList={() => handleTabChange('bucketlist')}
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <ClimbProfileCard climb={climbProfilerState.selectedClimb} />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bucketlist' && (
                                    <BucketListWithNavigation
                                        initialState={bucketListState}
                                        remoteRevision={bucketListRemoteRevision}
                                        isSignedIn={!!user}
                                        onStateChange={handleBucketListStateChange}
                                        onOpenWeatherForClimb={(climb) => {
                                            setWeatherClimbState((prev) => ({
                                                ...prev,
                                                selectedClimb: climb,
                                            }));
                                            setActiveTab('weather');
                                            persistMainTab('weather');
                                        }}
                                        onOpenProfilerForClimb={handleOpenProfilerForClimb}
                                        onOpenMapTab={() => handleTabChange('climbmap')}
                                    />
                                )}

                                {activeTab === 'climbmap' && (
                                    <ClimbMap
                                        bucketListState={bucketListState}
                                        onUpdateBucketList={(action, climbId) => {
                                            setBucketListState((prev) => stampBucketListState(
                                                setClimbBucketStatus(prev, climbId, action),
                                            ));
                                        }}
                                    />
                                )}

                                {activeTab === 'weather' && (
                                    <WeatherClimb
                                        userSettings={userSettings}
                                        initialState={weatherClimbState}
                                        onStateChange={setWeatherClimbState}
                                    />
                                )}
                            </Suspense>
                        )}
                            </div>
                        </AppLoadingGate>

                        {isSettingsOpen && (
                            <SettingsModal
                                onClose={() => setIsSettingsOpen(false)}
                                intervalsConfig={intervalsConfig}
                                updateIntervalsConfig={(k, v) => setIntervalsConfig(p => ({ ...p, [k]: v }))}
                                userSettings={userSettings}
                                updateUserSettings={(k, v) => setUserSettings(p => ({ ...p, [k]: v }))}
                                onSaveToCloud={saveSettingsToCloud}
                                theme={theme}
                                setTheme={(newTheme) => {
                                    setTheme(newTheme);
                                    safeLocalStorageSet('theme', newTheme);
                                }}
                                backupExtras={{
                                    settings: userSettings,
                                    intervals: intervalsConfig,
                                    bucketList: bucketListState,
                                    strava: stravaConfig,
                                    stravaProfile: stravaProfileData,
                                    theme,
                                }}
                                onImportBackup={handleImportBackup}
                                onCleanupCloudTokens={cleanupCloudTokens}
                                stravaConfig={stravaConfig}
                                isSignedIn={Boolean(user)}
                                updateStravaConfig={updateStravaConfig}
                                stravaAuth={stravaAuth}
                                onGoToActivitiesSync={navigateToActivitiesSync}
                            />
                        )}
                    </main>
                    {user && (
                        <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
                    )}
                    {user && <PwaInstallBanner />}
                    <PwaUpdateBanner />
                    <OrientationGuard />
                </div>
                    </TodayIntervalsSyncProvider>
                </ProfileFtpProvider>
            </ActivityLogNavigationProvider>
        </ActivitiesProvider>
        </ConfirmProvider>
        </ToastProvider>
    );
};

export default App;
