import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Gauge, Mountain, Activity, Utensils, Brain, Route, Settings as SettingsIcon, TrendingUp, Menu, X, Heart, Trophy, Cloud, ChevronRight, Map as MapIcon, Flag } from 'lucide-react';
import { doc, setDoc, getDoc, collection, onSnapshot, getDocsFromServer, waitForPendingWrites } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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
import NlDateInput from './components/NlDateInput';

import useIntervalsSync from './hooks/useIntervalsSync';
import useStravaAuth from './hooks/useStravaAuth';
import { SPORT_TYPES } from './config';

const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



    const [userSettings, setUserSettings] = useState(() => {
        const saved = localStorage.getItem('userSettings');
        if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
        return {
            weight: 70.0,
            bikeWeight: 7.5,
            ftp: 280,
            maxHr: 190,
            privacyMode: false,
            goals: { yearlyKm: 10000, targetFtp: 300, targetWeight: 68 },
            notifications: { highLoad: 150, lowPower: 150, minWeight: 67, restDay: 3 },
            powerZones: [],
            githubPat: '', // GitHub PAT for manual nightly-sync trigger
            openweatherApiKey: '' // OpenWeather API Key
        };
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

    // Meest recente activiteitsdatum voor de "Bijgewerkt" indicator in de header
    const lastActivityDate = useMemo(() => {
        if (!activities || activities.length === 0) return null;
        // activities zijn al gesorteerd op datum (nieuwste eerst) door de Firebase listener
        return activities[0]?.date || null;
    }, [activities]);

    // Stable DataHub Handlers
    const handleImportActivities = useCallback((n) => {
        setActivities((prev) => {
            const map = new Map();
            const upsert = (act) => {
                if (!act || act.id == null) return;
                const k = String(act.id);
                const cur = map.get(k);
                map.set(k, cur ? { ...cur, ...act } : act);
            };
            (prev || []).forEach(upsert);
            (n || []).forEach(upsert);
            return Array.from(map.values());
        });
    }, []);

    const handleDeleteActivity = useCallback((id) => {
        // Optimistic local update: verwijder direct uit state zodat de UI meteen reageert.
        // De Firebase onSnapshot listener (regel ~317) bevestigt de delete daarna vanuit de server.
        setActivities(prev => prev.filter(a => String(a.id) !== String(id)));
    }, []);

    const handleClearActivities = useCallback(() => {
        setActivities([]);
    }, []);

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
                setActivities(loadedActs);
                console.log(`[Refresh] Server-fetch van ${loadedActs.length} activiteiten.`);
            } else {
                setActivities([]);
            }
        } catch (e) {
            console.error("Fout tijdens handmatig vernieuwen:", e);
        }
    }, []); // db is een module-level constante, geen reactive state

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

    /** Vanuit Dashboard: focus één activiteit in DataHub log */
    const [activityFocusId, setActivityFocusId] = useState(null);
    /** Activity Log → Ranges panel: dicht na refresh; blijft open/dicht bij tab-wissel */
    const [activityLogRangesExpanded, setActivityLogRangesExpanded] = useState(false);
    const [raceSubTab, setRaceSubTab] = useState('fueling');       // 'fueling' | 'racepacing'

    // Auth Listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsubscribe();
    }, []);

    // Strava OAuth callback: verwerk ?code= parameter bij terugkeer van Strava
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code && stravaConfig?.client_id && stravaConfig?.client_secret) {
            stravaAuth.handleOAuthCallback(code).catch(e => {
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
                    if (data.body) setUserSettings(prev => ({ ...prev, ...data.body }));
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
                    setActivities(loadedActs);
                });
            } else {
                React.startTransition(() => {
                    setActivities([]);
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
    }, [user]); // Re-subscribe if user changes (security rules might change)

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
            console.log("Saving Settings to Cloud:", {
                intervals: { ...intervalsConfig, apiKey: intervalsConfig.apiKey ? '***REDACTED***' : '' },
                body: userSettings,
                theme,
                bucketList: bucketListState,
                strava: { ...stravaConfig, client_secret: stravaConfig.client_secret ? '***REDACTED***' : '' },
                stravaProfile: stravaProfileData
            });
            await setDoc(doc(db, "settings", settingsId), {
                intervals: intervalsConfig,
                body: userSettings,
                theme: theme,
                bucketList: bucketListState,
                strava: stravaConfig,
                stravaProfile: stravaProfileData
            }, { merge: true });
            alert("Settings saved! Bike Weight: " + (userSettings.bikeWeight || 'N/A'));
        } catch (e) { alert("Error saving settings: " + e.message); }
    };

    const handleImportBackup = (backupData) => {
        if (backupData.settings) setUserSettings(prev => ({ ...prev, ...backupData.settings }));
        if (backupData.intervals) setIntervalsConfig(backupData.intervals);
        if (backupData.activities) setActivities(backupData.activities);
        if (backupData.bucketList) setBucketListState(backupData.bucketList);
        alert("Backup succesvol hersteld!");
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
                {/* Navigation - Desktop & Mobile */}
                {(() => {
                    // 9 main tabs (Training = coach+recovery, Race = fueling+racepacing)
                    const mainTabs = [
                        { id: 'dashboard', label: 'Dashboard', icon: Gauge },
                        { id: 'activities', label: 'Activities', icon: Activity },
                        { id: 'training', label: 'Training', icon: Brain },
                        { id: 'physics', label: 'Climbs', icon: Mountain },
                        { id: 'race', label: 'Race', icon: Route },
                        { id: 'gearoptimizer', label: 'Gear', icon: SettingsIcon },
                        { id: 'profiler', label: 'Profiler', icon: TrendingUp },
                        { id: 'bucketlist', label: 'Bucket List', icon: Trophy },
                        { id: 'climbmap', label: 'Map', icon: MapIcon },
                        { id: 'weather', label: 'Weather', icon: Cloud },
                    ];

                    // Map old sub-tabs to their parent for mobile label
                    const mobileLabel = mainTabs.find(t => t.id === activeTab)?.label || 'Menu';

                    return (
                        <div className="relative">
                            {/* Mobile: Hamburger Button */}
                            <div className="flex items-center gap-2 mb-4 md:hidden">
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-cdsurface rounded border border-cdborder text-cdtext flex-1"
                                >
                                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                                    <span className="font-bold text-sm">{mobileLabel}</span>
                                </button>

                                {/* Mobile-only Range Display / Quick Toggle */}
                                <div className="flex bg-cdbg/50 rounded border border-cdborder p-1 gap-1">
                                    {(timeRange === 'Custom' ? ['Custom'] : [timeRange, '1Y']).filter((v, i, a) => a.indexOf(v) === i).map(r => (
                                        <button
                                            key={`mob-quick-${r}`}
                                            onClick={() => setTimeRange(r)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded ${timeRange === r ? 'bg-cdaccent text-white' : 'text-cdmuted'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Range Selector (Scrollable Bar) */}
                            <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-3 mb-1 no-scrollbar -mx-1 px-1">
                                {['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL', 'Custom'].map(r => (
                                    <button
                                        key={`mob-range-${r}`}
                                        onClick={() => setTimeRange(r)}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded whitespace-nowrap transition-all border ${timeRange === r
                                            ? 'bg-cdaccent text-white border-cdaccent shadow'
                                            : 'text-cdmuted hover:text-cdtext bg-cdbg/50 border-cdborder'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Custom Date Inputs */}
                            {timeRange === 'Custom' && (
                                <div className="md:hidden flex items-center gap-2 bg-cdbg/50 p-2 rounded-lg border border-cdborder mb-4 animate-in fade-in slide-in-from-top-2">
                                    <NlDateInput value={customStart} onChange={setCustomStart}
                                        className="bg-cdsurface text-cdtext text-[10px] rounded px-2 py-1.5 outline-none border border-cdborder flex-1"
                                        aria-label="Startdatum (dd/mm/jjjj)" />
                                    <span className="text-cdmuted text-[10px]">–</span>
                                    <NlDateInput value={customEnd} onChange={setCustomEnd}
                                        className="bg-cdsurface text-cdtext text-[10px] rounded px-2 py-1.5 outline-none border border-cdborder flex-1"
                                        aria-label="Einddatum (dd/mm/jjjj)" />
                                </div>
                            )}

                            {/* Mobile: Dropdown Menu */}
                            {isMobileMenuOpen && (
                                <div className="md:hidden absolute top-12 left-0 right-0 bg-cdsurface border border-cdborder rounded-lg shadow-xl z-50 mb-4">
                                    {mainTabs.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-cdaccent/20 text-cdaccent border-l-4 border-cdaccent' : 'text-cdtext hover:bg-cdborder'}`}
                                            >
                                                <item.icon className="w-4 h-4" />
                                                {item.label}
                                                {(item.id === 'training' || item.id === 'race') && (
                                                    <ChevronRight size={12} className="ml-auto text-cdmuted" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Desktop: Horizontal Tabs + globale periode-selector rechts */}
                            <div className="hidden md:block border-b border-cdborder/50 mb-4">
                                <div className="flex items-end justify-between pb-2">
                                    <nav className="flex overflow-x-auto gap-1">
                                        {mainTabs.map(item => {
                                            const isActive = activeTab === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveTab(item.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${isActive ? 'border-cdaccent text-cdtext' : 'border-transparent text-cdmuted hover:text-cdtext'}`}
                                                >
                                                    <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-cdaccent' : ''}`} />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </nav>
                                    {/* Periode-selector – altijd zichtbaar in tab-lint */}
                                    <div className="flex items-center gap-1 bg-cdbg/50 rounded-lg p-1 border border-cdborder shrink-0 ml-4">
                                        {['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL', 'Custom'].map(r => (
                                            <button
                                                key={`desk-range-${r}`}
                                                onClick={() => setTimeRange(r)}
                                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all ${timeRange === r
                                                    ? 'bg-cdaccent text-white shadow border border-cdaccent'
                                                    : 'text-cdmuted hover:text-cdtext hover:bg-cdsurface border border-transparent'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Custom datum-inputs – toon alleen bij Custom */}
                                {timeRange === 'Custom' && (
                                    <div className="flex justify-end pb-1.5 -mt-1 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center gap-2 bg-cdbg/50 p-1.5 rounded-lg border border-cdborder">
                                            <NlDateInput value={customStart} onChange={setCustomStart}
                                                className="bg-cdsurface text-cdtext text-[10px] rounded px-2 py-1 outline-none border border-cdborder"
                                                aria-label="Startdatum (dd/mm/jjjj)" />
                                            <span className="text-cdmuted text-[10px]">–</span>
                                            <NlDateInput value={customEnd} onChange={setCustomEnd}
                                                className="bg-cdsurface text-cdtext text-[10px] rounded px-2 py-1 outline-none border border-cdborder"
                                                aria-label="Einddatum (dd/mm/jjjj)" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {isLoading ? (
                    <div className="flex justify-center items-center h-64 text-cdmuted animate-pulse">Laden van data...</div>
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
                                onOpenActivityInLog={(id) => {
                                    if (id == null) return;
                                    setActivityFocusId(String(id));
                                    setActiveTab('activities');
                                }}
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
                                onOpenProfilerFromActivity={handleOpenProfilerFromActivity}
                                climbDatabaseForMatch={CLIMB_DATABASE}
                                activityLogRangesExpanded={activityLogRangesExpanded}
                                onActivityLogRangesExpandedChange={setActivityLogRangesExpanded}
                            />
                        )}

                        {/* Training: AI Coach + Recovery Advisor (sub-tabs) */}
                        {activeTab === 'training' && (
                            <div>
                                <div className="flex gap-1 mb-4 border-b border-cdborder/50 pb-2">
                                    <button
                                        onClick={() => setTrainingSubTab('coach')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${trainingSubTab === 'coach' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Brain size={14} /> AI Coach
                                    </button>
                                    <button
                                        onClick={() => setTrainingSubTab('goal')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${trainingSubTab === 'goal' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Flag size={14} /> Doel & planning
                                    </button>
                                    <button
                                        onClick={() => setTrainingSubTab('recovery')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${trainingSubTab === 'recovery' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Heart size={14} /> Recovery
                                    </button>
                                </div>
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
                                <div className="flex gap-1 mb-4 border-b border-cdborder/50 pb-2">
                                    <button
                                        onClick={() => setRaceSubTab('fueling')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${raceSubTab === 'fueling' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Utensils size={14} /> Fueling
                                    </button>
                                    <button
                                        onClick={() => setRaceSubTab('racepacing')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${raceSubTab === 'racepacing' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Route size={14} /> Race Pacing
                                    </button>
                                </div>
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
                                onSyncComplete={(newActs) => {
                                    setActivities(prev => {
                                        const map = new Map();
                                        prev.forEach(act => map.set(act.id, act));
                                        newActs.forEach(act => map.set(act.id, act));
                                        return Array.from(map.values());
                                    });
                                }}
                                stravaConfig={stravaConfig}
                                updateStravaConfig={updateStravaConfig}
                                stravaAuth={stravaAuth}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default App;
