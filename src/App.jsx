import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Utensils, Brain, Route, Heart, Flag } from 'lucide-react';
import { doc, setDoc, getDoc, collection, onSnapshot, getDocsFromServer, waitForPendingWrites } from "firebase/firestore";
import { onAuthStateChanged, reload } from "firebase/auth";
import { db, auth } from './firebase';
import { CLIMB_DATABASE } from './climbs';
import { calculatePowerZones } from './utils';

// Components
import Header from './components/Header';
import PhysicsEngine from './components/PhysicsEngine';
import DataHub from './components/DataHub';
import FuelingStrategy from './components/FuelingStrategy';
import AICoach from './components/AICoach';
import TrainingGoalPlanner from './components/TrainingGoalPlanner';
import ClimbProfileCard from './components/ClimbProfileCard';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import RacePacing from './components/RacePacing';
import GearOptimizer from './components/GearOptimizer';
import ClimbProfiler from './components/ClimbProfiler';
import RecoveryAdvisor from './components/RecoveryAdvisor';
import BucketList from './components/BucketList';
import WeatherClimb from './components/WeatherClimb';
import ClimbMap from './components/ClimbMap';
import PwaInstallBanner from './components/PwaInstallBanner';
import { SegmentedControl } from './components/ui';
import { MainNav } from './components/shell';

import useIntervalsSync from './hooks/useIntervalsSync';
import useStravaAuth from './hooks/useStravaAuth';
import { applyTheme } from './theme/applyTheme';
import { SPORT_TYPES } from './config';
import { consumeNavRestore } from './utils/sessionNavRestore';
import { mergeVolumeGoals } from './utils/volumeGoals';
import {
    mergeActivitiesPreservingEnrichment,
    prepareProtectedActivityUpsertsFromCurrent,
} from './utils/activityUpsert';

const MAIN_TAB_IDS = new Set([
    'dashboard', 'physics', 'activities', 'training', 'race', 'gearoptimizer',
    'profiler', 'bucketlist', 'climbmap', 'weather',
]);
const DATAHUB_INTERNAL_TABS = new Set(['log', 'strava-profile', 'import']);

let cachedNavRestore = null;
function peekNavRestoreOnce() {
    if (cachedNavRestore === null) {
        cachedNavRestore = consumeNavRestore();
    }
    return cachedNavRestore;
}

function dataHubInternalTabFromRestore() {
    const r = peekNavRestoreOnce();
    const t = r?.dataHubInternalTab;
    return t && DATAHUB_INTERNAL_TABS.has(t) ? t : 'log';
}

const App = () => {
    const [activeTab, setActiveTab] = useState(() => {
        const r = peekNavRestoreOnce();
        const t = r?.activeTab;
        return t && MAIN_TAB_IDS.has(t) ? t : 'dashboard';
    });
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



    const [userSettings, setUserSettings] = useState(() => {
        const saved = localStorage.getItem('userSettings');
        const defaults = {
            weight: 70.0,
            bikeWeight: 7.5,
            ftp: 280,
            maxHr: 190,
            privacyMode: false,
            goals: { yearlyKm: 10000, targetFtp: 300, targetWeight: 68 },
            volumeGoals: mergeVolumeGoals(null),
            notifications: { highLoad: 150, lowPower: 150, minWeight: 67, restDay: 3 },
            powerZones: [],
            githubPat: '', // GitHub PAT for manual nightly-sync trigger
            openweatherApiKey: '' // OpenWeather API Key
        };
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return { ...defaults, ...parsed, volumeGoals: mergeVolumeGoals(parsed.volumeGoals) };
            } catch { /* */ }
        }
        return defaults;
    });

    const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE?.[0] || { id: 'dummy', name: 'Loading', lengthKm: 0, elevation: 0, avgGrade: 0 });

    const [intervalsConfig, setIntervalsConfig] = useState(() => {
        const saved = localStorage.getItem('intervalsConfig');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return { apiKey: '', athleteId: '' };
    });

    // Strava config: opgeslagen in localStorage + Firestore (cross-device)
    const [stravaConfig, setStravaConfig] = useState(() => {
        const saved = localStorage.getItem('stravaConfig');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return { client_id: '', client_secret: '' };
    });

    const updateStravaConfig = (key, value) => {
        setStravaConfig(prev => {
            const updated = { ...prev, [key]: value };
            localStorage.setItem('stravaConfig', JSON.stringify(updated));
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
        localStorage.setItem('dashboard_timeRange', timeRange);
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

    // --- Sync State for SettingsModal ---
    const { syncIntervals, isSyncing, syncProgress } = useIntervalsSync(intervalsConfig);
    const [syncDates, setSyncDates] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [sportFilters, setSportFilters] = useState(
        SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
    );

    const [activities, setActivities] = useState([]);
    const activitiesRef = useRef([]);
    const setActivitiesState = useCallback((nextActivities) => {
        if (typeof nextActivities !== 'function') {
            activitiesRef.current = nextActivities;
            setActivities(nextActivities);
            return;
        }

        setActivities((prev) => {
            const resolvedActivities = nextActivities(prev);
            activitiesRef.current = resolvedActivities;
            return resolvedActivities;
        });
    }, []);

    useEffect(() => {
        activitiesRef.current = activities;
    }, [activities]);

    // Meest recente activiteitsdatum voor de "Bijgewerkt" indicator in de header
    const lastActivityDate = useMemo(() => {
        if (!activities || activities.length === 0) return null;
        // activities zijn al gesorteerd op datum (nieuwste eerst) door de Firebase listener
        return activities[0]?.date || null;
    }, [activities]);

    // Stable DataHub Handlers
    const handleImportActivities = useCallback((n) => {
        setActivitiesState((prev) => mergeActivitiesPreservingEnrichment(prev, n));
    }, [setActivitiesState]);

    const handleSettingsSyncComplete = useCallback(async (newActs) => {
        if (!newActs || newActs.length === 0) return 0;

        const mergedActivities = prepareProtectedActivityUpsertsFromCurrent(
            () => activitiesRef.current,
            newActs,
        );

        if (db) {
            await Promise.all(
                mergedActivities
                    .filter((act) => act?.id != null)
                    .map((act) => setDoc(doc(db, 'activities', String(act.id)), act, { merge: true })),
            );
        }

        handleImportActivities(mergedActivities);
        return mergedActivities.length;
    }, [handleImportActivities]);

    const handleDeleteActivity = useCallback((id) => {
        // Optimistic local update: verwijder direct uit state zodat de UI meteen reageert.
        // De Firebase onSnapshot listener (regel ~317) bevestigt de delete daarna vanuit de server.
        setActivitiesState(prev => prev.filter(a => String(a.id) !== String(id)));
    }, [setActivitiesState]);

    const handleClearActivities = useCallback(() => {
        setActivitiesState([]);
    }, [setActivitiesState]);

    // Manual refresh: wacht op lokale writes, haal daarna bewust van de server (niet van cache).
    const forceRefreshActivities = useCallback(async () => {
        if (!db) return;
        try {
            try {
                await waitForPendingWrites(db);
            } catch {
                // Offline of geen pending writes: toch verversen proberen
            }
            const actCol = collection(db, "activities");
            const snapshot = await getDocsFromServer(actCol);
            const loadedActs = snapshot.docs.map(d => d.data());

            if (loadedActs.length > 0) {
                // Optimization: use string comparison for ISO dates to speed up sort
                loadedActs.sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : 0));
                setActivitiesState(loadedActs);
                console.log(`[Refresh] Server-fetch van ${loadedActs.length} activiteiten.`);
            } else {
                setActivitiesState([]);
            }
        } catch (e) {
            console.error("Fout tijdens handmatig vernieuwen:", e);
        }
    }, [setActivitiesState]); // db is een module-level constante, geen reactive state

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
                localStorage.setItem('stravaProfileData', JSON.stringify(forPersistence));
            } catch { /* quota */ }
        } else {
            localStorage.removeItem('stravaProfileData');
        }
        if (!db) return;
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
        selectedClimb: CLIMB_DATABASE[0],
        chainrings: [50, 34],
        cassette: [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28],
        wheelDiameter: 700,
        tyreMm: 25,
        targetCadence: 80
    });
    const [climbProfilerState, setClimbProfilerState] = useState({
        selectedClimb: CLIMB_DATABASE[0],
        showPowerZones: true,
        targetIntensity: 0.85
    });

    const handleOpenProfilerFromActivity = useCallback((_activity, climb) => {
        const target = climb && climb.id ? climb : CLIMB_DATABASE[0];
        setClimbProfilerState((prev) => ({
            ...prev,
            selectedClimb: target,
        }));
        setActiveTab('profiler');
    }, []);

    const clearActivityLogFilters = useCallback(() => {
        setLogIsolateActivityId(null);
        setLogDateRangeFilter(null);
        setActivityFocusId(null);
    }, []);

    const openActivityLogDateRange = useCallback((range) => {
        if (!range?.startYmd || !range?.endYmd) return;
        setLogDateRangeFilter({ startYmd: range.startYmd, endYmd: range.endYmd });
        setLogIsolateActivityId(null);
        setActivityFocusId(null);
        setActiveTab('activities');
    }, []);
    const [fuelingState, setFuelingState] = useState({
        duration: 180,
        intensity: 0.85
    });
    const [bucketListState, setBucketListState] = useState(() => {
        const saved = localStorage.getItem('bucketListState');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse bucketListState from localStorage", e);
            }
        }
        return { climbStatus: {} };
    });







    // Auto-save userSettings naar localStorage
    useEffect(() => {
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
    }, [userSettings]);

    /** Debounced Firestore sync for dashboard training volume goals (avoids wiping other `body` fields). */
    const volumeGoalsCloudTimerRef = useRef(null);
    const lastVolumeGoalsSyncedJsonRef = useRef('');
    useEffect(() => {
        if (!db || !user) return;
        const merged = mergeVolumeGoals(userSettings.volumeGoals);
        const serialized = JSON.stringify(merged);
        if (serialized === lastVolumeGoalsSyncedJsonRef.current) return;
        if (volumeGoalsCloudTimerRef.current) clearTimeout(volumeGoalsCloudTimerRef.current);
        volumeGoalsCloudTimerRef.current = setTimeout(() => {
            volumeGoalsCloudTimerRef.current = null;
            const settingsId = `user_${user.uid}`;
            setDoc(doc(db, 'settings', settingsId), { body: { volumeGoals: merged } }, { merge: true })
                .then(() => {
                    lastVolumeGoalsSyncedJsonRef.current = serialized;
                })
                .catch((e) => {
                    console.warn('[volumeGoals] Firestore sync failed:', e);
                });
        }, 800);
        return () => {
            if (volumeGoalsCloudTimerRef.current) clearTimeout(volumeGoalsCloudTimerRef.current);
        };
    }, [user, userSettings.volumeGoals]);

    /** Real-time merge of training volume goals from Firestore (other devices / tabs). */
    useEffect(() => {
        if (!db || !user) return;
        const settingsId = `user_${user.uid}`;
        const docRef = doc(db, 'settings', settingsId);
        const unsub = onSnapshot(
            docRef,
            (snap) => {
                if (!snap.exists()) return;
                if (snap.metadata.hasPendingWrites) return;
                const data = snap.data();
                const vg = data.body?.volumeGoals;
                if (vg == null) return;
                const merged = mergeVolumeGoals(vg);
                const serialized = JSON.stringify(merged);
                lastVolumeGoalsSyncedJsonRef.current = serialized;
                setUserSettings((prev) => {
                    const prevSerialized = JSON.stringify(mergeVolumeGoals(prev.volumeGoals));
                    if (prevSerialized === serialized) return prev;
                    return { ...prev, volumeGoals: merged };
                });
            },
            (e) => console.warn('[volumeGoals] Firestore listener error:', e)
        );
        return () => unsub();
    }, [user]);

    // Auto-save intervalsConfig naar localStorage
    useEffect(() => {
        localStorage.setItem('intervalsConfig', JSON.stringify(intervalsConfig));
    }, [intervalsConfig]);

    const [weatherClimbState, setWeatherClimbState] = useState({
        selectedClimb: CLIMB_DATABASE[0],
        targetPower: 280 * 0.85,
        temperature: 20,
        windSpeed: 0,
        windDirection: 'none',
        humidity: 50
    });

    // Sub-tab states for merged tabs
    const [trainingSubTab, setTrainingSubTab] = useState('coach'); // 'coach' | 'goal' | 'recovery'

    /** Vanuit Dashboard: focus één activiteit in DataHub log; optioneel alleen die rit tonen (Peak eFTP). */
    const [activityFocusId, setActivityFocusId] = useState(null);
    const [logIsolateActivityId, setLogIsolateActivityId] = useState(null);
    /** Activity Log: show only activities between these YYYY-MM-DD dates (from Dashboard Volume). */
    const [logDateRangeFilter, setLogDateRangeFilter] = useState(null);
    /** Activity Log → Ranges panel: dicht na refresh; blijft open/dicht bij tab-wissel */
    const [activityLogRangesExpanded, setActivityLogRangesExpanded] = useState(false);
    const [raceSubTab, setRaceSubTab] = useState('fueling');       // 'fueling' | 'racepacing'

    const photoReloadAttemptedRef = useRef(new Set());

    // Auth Listener — one optional reload if Google did not attach a photo URL yet.
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                photoReloadAttemptedRef.current.clear();
                setUser(null);
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
            setUser(auth.currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Strava OAuth callback: verwerk ?code= parameter bij terugkeer van Strava
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        if (code && stravaConfig?.client_id && stravaConfig?.client_secret) {
            stravaAuth.handleOAuthCallback(code, state).catch(e => {
                console.error('Strava OAuth fout:', e);
                alert('Strava koppeling mislukt: ' + e.message);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 1. Settings Laden (One-time fetch)
    useEffect(() => {
        const loadSettings = async () => {
            if (!db) return;
            // Only set loading true initially
            if (activities.length === 0) setIsLoading(true);

            try {
                const settingsId = user ? `user_${user.uid}` : "user_prefs";
                const docRef = doc(db, "settings", settingsId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.intervals) setIntervalsConfig(data.intervals);
                    if (data.body) {
                        setUserSettings((prev) => {
                            const merged = { ...prev, ...data.body };
                            merged.volumeGoals = mergeVolumeGoals(merged.volumeGoals);
                            return merged;
                        });
                    }
                    if (data.theme) {
                        setTheme(data.theme);
                        localStorage.setItem('theme', data.theme);
                    }
                    if (data.bucketList) {
                        setBucketListState(data.bucketList);
                        localStorage.setItem('bucketListState', JSON.stringify(data.bucketList));
                    }
                    if (data.strava) {
                        setStravaConfig(data.strava);
                        localStorage.setItem('stravaConfig', JSON.stringify(data.strava));
                    }
                    if (data.stravaProfile) {
                        setStravaProfileData(data.stravaProfile);
                        localStorage.setItem('stravaProfileData', JSON.stringify(data.stravaProfile));
                    }
                }
            } catch (e) {
                console.error("Error loading settings", e);
            } finally {
                // We don't set loading false here because we wait for activities
            }
        };
        loadSettings();
    }, [user, activities.length]);

    // 2. Real-time Activities Sync (onSnapshot)
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const actCol = collection(db, "activities");

        // This listener handles both initial load AND real-time updates
        const unsubscribe = onSnapshot(actCol, (snapshot) => {
            const byNormId = new Map();
            snapshot.docs.forEach((d) => {
                const data = d.data();
                const act = { ...data, id: data.id ?? d.id };
                if (act.id == null) return;
                const k = String(act.id);
                const cur = byNormId.get(k);
                byNormId.set(k, cur ? { ...cur, ...act } : act);
            });
            const loadedActs = Array.from(byNormId.values());

            if (loadedActs.length > 0) {
                // Optimization: use string comparison for ISO dates to speed up sort
                loadedActs.sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : 0));
                React.startTransition(() => {
                    setActivitiesState(loadedActs);
                });
            } else {
                React.startTransition(() => {
                    setActivitiesState([]);
                });
            }

            // Check if changes are local (latency compensation) or synced
            const hasPendingWrites = snapshot.metadata.hasPendingWrites;
            setSyncStatus(hasPendingWrites ? 'syncing' : 'synced');

            setIsLoading(false);
        }, (error) => {
            console.error("Real-time sync error:", error);
            setSyncStatus('error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, setActivitiesState]); // Re-subscribe if user changes (security rules might change)

    // Update Power Zones
    useEffect(() => {
        if (userSettings.ftp && (!userSettings.powerZones || userSettings.powerZones.length === 0)) {
            setUserSettings(prev => ({ ...prev, powerZones: calculatePowerZones(prev.ftp) }));
        }
    }, [userSettings.ftp, userSettings.powerZones]);

    const saveSettingsToCloud = async () => {
        if (!db) return;
        try {
            const settingsId = user ? `user_${user.uid}` : "user_prefs";

            // SECURITY: Never save raw API keys or secrets to the cloud database
            const safeIntervals = { ...intervalsConfig, apiKey: intervalsConfig.apiKey ? '' : '' };
            const safeBody = {
                ...userSettings,
                githubPat: userSettings.githubPat ? '' : '',
                openweatherApiKey: userSettings.openweatherApiKey ? '' : ''
            };
            const safeStrava = { ...stravaConfig, client_secret: stravaConfig.client_secret ? '' : '' };
            const intervalsForLog = {
                ...intervalsConfig,
                apiKey: intervalsConfig.apiKey ? '***REDACTED***' : ''
            };

            const bodyForLog = {
                ...userSettings,
                githubPat: userSettings.githubPat ? '***REDACTED***' : '',
                openweatherApiKey: userSettings.openweatherApiKey ? '***REDACTED***' : ''
            };

            const stravaForLog = {
                ...stravaConfig,
                client_secret: stravaConfig.client_secret ? '***REDACTED***' : '',
                access_token: stravaConfig.access_token ? '***REDACTED***' : '',
                refresh_token: stravaConfig.refresh_token ? '***REDACTED***' : ''
            };

            console.log("Saving Settings to Cloud:", {
                intervals: intervalsForLog,
                body: bodyForLog,
                theme,
                bucketList: bucketListState,
                strava: stravaForLog,
                stravaProfile: stravaProfileData
            });
            await setDoc(doc(db, "settings", settingsId), {
                intervals: safeIntervals,
                body: safeBody,
                theme: theme,
                bucketList: bucketListState,
                strava: safeStrava,
                stravaProfile: stravaProfileData
            }, { merge: true });
            alert("Settings saved! Bike Weight: " + (userSettings.bikeWeight || 'N/A'));
        } catch (e) { alert("Error saving settings: " + e.message); }
    };

    const handleImportBackup = (backupData) => {
        if (backupData.settings) setUserSettings(prev => ({ ...prev, ...backupData.settings }));
        if (backupData.intervals) setIntervalsConfig(backupData.intervals);
        if (backupData.activities) setActivitiesState(backupData.activities);
        if (backupData.bucketList) setBucketListState(backupData.bucketList);
        alert("Backup restored successfully!");
    };

    // Chart Data logic moved to Dashboard.jsx


    const isDark = theme === 'dark';
    const mainClass = isDark ? 'bg-cdbg text-cdtext' : 'bg-cdbg text-cdtext';

    return (
        <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${mainClass}`}>

            <Header
                userSettings={userSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                user={user}
                syncStatus={syncStatus}
                lastActivityDate={lastActivityDate}
            />

            <main className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'activities' ? 'max-w-[95%]' : 'max-w-7xl'}`}>
                <MainNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStart={setCustomStart}
                    onCustomEnd={setCustomEnd}
                    isMobileMenuOpen={isMobileMenuOpen}
                    onMobileMenuOpenChange={setIsMobileMenuOpen}
                />

                {isLoading ? (
                    <div className="flex justify-center items-center h-64 text-cdmuted animate-pulse">Loading data…</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <Dashboard
                                theme={theme}
                                manualFtp={userSettings.ftp}
                                activities={activities}
                                timeRange={timeRange}
                                customStart={customStart}
                                customEnd={customEnd}
                                userWeightKg={userSettings.weight}
                                referenceEndDate={globalEndDate}
                                userSettings={userSettings}
                                updateUserSettings={(k, v) => setUserSettings((p) => ({ ...p, [k]: v }))}
                                cloudVolumeGoalsSynced={!!user}
                                onOpenActivityInLog={(id, opts) => {
                                    if (id == null) return;
                                    setActivityFocusId(String(id));
                                    setLogIsolateActivityId(opts?.isolate ? String(id) : null);
                                    setLogDateRangeFilter(null);
                                    setActiveTab('activities');
                                }}
                                onOpenActivityLogDateRange={openActivityLogDateRange}
                            />
                        )}

                        {activeTab === 'physics' && (
                            <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />
                        )}

                        {activeTab === 'activities' && (
                            <DataHub
                                activities={activities}
                                onImport={handleImportActivities}
                                onDelete={handleDeleteActivity}
                                onClear={handleClearActivities}
                                githubPat={userSettings.githubPat}
                                intervalsConfig={intervalsConfig}
                                stravaGetToken={stravaAuth.isConnected ? stravaAuth.getValidToken : null}
                                startDate={globalStartDate}
                                endDate={globalEndDate}
                                stravaEnrichResults={stravaEnrichResults}
                                onStravaEnrichResults={setStravaEnrichResults}
                                stravaAthleteId={stravaConfig?.athlete_id}
                                stravaProfileData={stravaProfileData}
                                onStravaProfileData={handleStravaProfileData}
                                onRefresh={forceRefreshActivities}
                                focusActivityId={activityFocusId}
                                onFocusActivityCleared={() => setActivityFocusId(null)}
                                isolateActivityId={logIsolateActivityId}
                                onClearLogIsolate={clearActivityLogFilters}
                                logDateRangeFilter={logDateRangeFilter}
                                onClearLogDateRange={clearActivityLogFilters}
                                onOpenProfilerFromActivity={handleOpenProfilerFromActivity}
                                climbDatabaseForMatch={CLIMB_DATABASE}
                                activityLogRangesExpanded={activityLogRangesExpanded}
                                onActivityLogRangesExpandedChange={setActivityLogRangesExpanded}
                                initialInternalTab={dataHubInternalTabFromRestore()}
                                profileFtp={userSettings?.ftp}
                            />
                        )}

                        {/* Training: AI Coach + Recovery Advisor (sub-tabs) */}
                        {activeTab === 'training' && (
                            <div>
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
                                        activities={activities}
                                        userSettings={userSettings}
                                        startDate={globalStartDate}
                                        endDate={globalEndDate}
                                    />
                                )}
                                {trainingSubTab === 'goal' && (
                                    <TrainingGoalPlanner
                                        activities={activities}
                                        userSettings={userSettings}
                                        startDate={globalStartDate}
                                        endDate={globalEndDate}
                                        onOpenRecovery={() => setTrainingSubTab('recovery')}
                                    />
                                )}
                                {trainingSubTab === 'recovery' && (
                                    <RecoveryAdvisor
                                        activities={activities}
                                        startDate={globalStartDate}
                                        endDate={globalEndDate}
                                    />
                                )}
                            </div>
                        )}

                        {/* Race: Fueling + Race Pacing (sub-tabs) */}
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
                                    />
                                )}
                                {raceSubTab === 'racepacing' && (
                                    <RacePacing
                                        userSettings={userSettings}
                                        initialState={racePacingState}
                                        onStateChange={setRacePacingState}
                                        onExportToFueling={(duration, intensity) => {
                                            setFuelingState({ duration, intensity });
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
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <ClimbProfileCard climb={climbProfilerState.selectedClimb} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'bucketlist' && (
                            <BucketList
                                initialState={bucketListState}
                                onStateChange={setBucketListState}
                            />
                        )}

                        {activeTab === 'climbmap' && (
                            <ClimbMap
                                bucketListState={bucketListState}
                                onUpdateBucketList={(action, climbId) => {
                                    setBucketListState(prev => {
                                        const next = {
                                            done: [...(prev.done || [])],
                                            planned: [...(prev.planned || [])],
                                            want: [...(prev.want || [])],
                                        };
                                        // Verwijder uit alle lijsten eerst
                                        ['done', 'planned', 'want'].forEach(k => {
                                            next[k] = next[k].filter(id => id !== climbId);
                                        });
                                        next[action] = [...next[action], climbId];
                                        return next;
                                    });
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
                                    localStorage.setItem('theme', newTheme);
                                }}
                                fullData={{ activities, settings: userSettings, intervals: intervalsConfig, bucketList: bucketListState }}
                                onImportBackup={handleImportBackup}
                                syncState={{ syncDates, setSyncDates, sportFilters, setSportFilters, isSyncing, syncProgress, syncIntervals }}
                                onSyncComplete={handleSettingsSyncComplete}
                                stravaConfig={stravaConfig}
                                updateStravaConfig={updateStravaConfig}
                                stravaAuth={stravaAuth}
                            />
                        )}
                    </>
                )}
            </main>

            <PwaInstallBanner />
        </div>
    );
};

export default App;
