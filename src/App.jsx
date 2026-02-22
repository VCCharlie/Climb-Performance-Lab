import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gauge, Mountain, Activity, Utensils, Brain, Route, Settings as SettingsIcon, TrendingUp, Menu, X, Heart, Trophy, Cloud, ChevronRight } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
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
import ClimbProfileCard from './components/ClimbProfileCard';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import RacePacing from './components/RacePacing';
import GearOptimizer from './components/GearOptimizer';
import ClimbProfiler from './components/ClimbProfiler';
import RecoveryAdvisor from './components/RecoveryAdvisor';
import BucketList from './components/BucketList';
import WeatherClimb from './components/WeatherClimb';

import useIntervalsSync from './hooks/useIntervalsSync';
import { SPORT_TYPES } from './config';

const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



    const [userSettings, setUserSettings] = useState({
        weight: 70.0,
        bikeWeight: 7.5,
        ftp: 280,
        maxHr: 190,
        privacyMode: false,
        goals: { yearlyKm: 10000, targetFtp: 300, targetWeight: 68 },
        notifications: { highLoad: 150, lowPower: 150, minWeight: 67, restDay: 3 },
        powerZones: []
    });

    const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE?.[0] || { id: 'dummy', name: 'Loading', lengthKm: 0, elevation: 0, avgGrade: 0 });
    const [intervalsConfig, setIntervalsConfig] = useState({ apiKey: '', athleteId: '' });

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

    // Stable DataHub Handlers
    const handleImportActivities = useCallback((n) => {
        setActivities(prev => {
            const map = new Map(prev.map(a => [a.id, a]));
            n.forEach(act => map.set(act.id, act));
            return Array.from(map.values());
        });
    }, []);

    const handleDeleteActivity = useCallback((id) => {
        setActivities(prev => prev.filter(a => a.id !== id));
    }, []);

    const handleClearActivities = useCallback(() => {
        setActivities([]);
    }, []);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
        showPowerZones: true
    });
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

    useEffect(() => {
        localStorage.setItem('bucketListState', JSON.stringify(bucketListState));

        // Auto-save to Firebase
        if (db && user && bucketListState && Object.keys(bucketListState.climbStatus || {}).length > 0) {
            const settingsId = `user_${user.uid}`;
            setDoc(doc(db, "settings", settingsId), {
                bucketList: bucketListState
            }, { merge: true }).catch(e => console.error("Error auto-saving bucketlist:", e));
        }
    }, [bucketListState, user]);

    const [weatherClimbState, setWeatherClimbState] = useState({
        selectedClimb: CLIMB_DATABASE[0],
        targetPower: 280 * 0.85,
        temperature: 20,
        windSpeed: 0,
        windDirection: 'none',
        humidity: 50
    });

    // Sub-tab states for merged tabs
    const [trainingSubTab, setTrainingSubTab] = useState('coach'); // 'coach' | 'recovery'
    const [raceSubTab, setRaceSubTab] = useState('fueling');       // 'fueling' | 'racepacing'

    // Auth Listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsubscribe();
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
                }
            } catch (e) {
                console.error("Error loading settings", e);
            } finally {
                // We don't set loading false here because we wait for activities
            }
        };
        loadSettings();
    }, [user]);

    // 2. Real-time Activities Sync (onSnapshot)
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const actCol = collection(db, "activities");

        // This listener handles both initial load AND real-time updates
        const unsubscribe = onSnapshot(actCol, (snapshot) => {
            const loadedActs = snapshot.docs.map(d => d.data());

            if (loadedActs.length > 0) {
                loadedActs.sort((a, b) => new Date(b.date) - new Date(a.date));
                setActivities(loadedActs);
            } else {
                setActivities([]);
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
    }, [userSettings.ftp]);

    const saveSettingsToCloud = async () => {
        if (!db) return;
        try {
            const settingsId = user ? `user_${user.uid}` : "user_prefs";
            console.log("Saving Settings to Cloud:", { intervals: intervalsConfig, body: userSettings, theme, bucketList: bucketListState });
            await setDoc(doc(db, "settings", settingsId), {
                intervals: intervalsConfig,
                body: userSettings,
                theme: theme,
                bucketList: bucketListState
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
    const navBtnActive = isDark ? 'bg-cdaccent text-white shadow-lg border border-cdaccent' : 'bg-cdaccent text-white shadow-lg border border-cdaccent';
    const navBtnInactive = isDark ? 'bg-cdsurface text-cdmuted hover:text-cdtext hover:bg-cdsurface' : 'bg-cdsurface text-cdmuted hover:text-cdtext hover:bg-cdsurface';

    return (
        <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${mainClass}`}>

            <Header
                userSettings={userSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                user={user}
                syncStatus={syncStatus}
            />

            <main className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'activities' ? 'max-w-[95%]' : 'max-w-7xl'}`}>
                {/* Navigation - Desktop & Mobile */}
                {(() => {
                    // 9 main tabs (Training = coach+recovery, Race = fueling+racepacing)
                    const mainTabs = [
                        { id: 'dashboard',     label: 'Dashboard',     icon: Gauge },
                        { id: 'physics',       label: 'Physics',       icon: Mountain },
                        { id: 'activities',    label: 'Activities',    icon: Activity },
                        { id: 'training',      label: 'Training',      icon: Brain },
                        { id: 'race',          label: 'Race',          icon: Route },
                        { id: 'gearoptimizer', label: 'Gear',          icon: SettingsIcon },
                        { id: 'profiler',      label: 'Profiler',      icon: TrendingUp },
                        { id: 'bucketlist',    label: 'Bucket List',   icon: Trophy },
                        { id: 'weather',       label: 'Weather',       icon: Cloud },
                    ];

                    // Map old sub-tabs to their parent for mobile label
                    const mobileLabel = mainTabs.find(t => t.id === activeTab)?.label || 'Menu';

                    return (
                        <div className="relative">
                            {/* Mobile: Hamburger Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden flex items-center gap-2 px-4 py-2 bg-cdsurface rounded border border-cdborder text-cdtext mb-4"
                            >
                                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                                <span className="font-bold text-sm">{mobileLabel}</span>
                            </button>

                            {/* Mobile: Dropdown Menu */}
                            {isMobileMenuOpen && (
                                <div className="md:hidden absolute top-full left-0 right-0 bg-cdsurface border border-cdborder rounded-lg shadow-xl z-50 mb-4">
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

                            {/* Desktop: Horizontal Tabs */}
                            <nav className="hidden md:flex overflow-x-auto gap-1 pb-2 border-b border-cdborder/50 mb-4">
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
                        </div>
                    );
                })()}

                {isLoading ? (
                    <div className="flex justify-center items-center h-64 text-cdmuted animate-pulse">Laden van data...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <Dashboard theme={theme} manualFtp={userSettings.ftp} activities={activities} />
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
                                        onClick={() => setTrainingSubTab('recovery')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t transition-all ${trainingSubTab === 'recovery' ? 'bg-cdsurface border border-cdborder border-b-transparent text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
                                    >
                                        <Heart size={14} /> Recovery
                                    </button>
                                </div>
                                {trainingSubTab === 'coach' && <AICoach activities={activities} userSettings={userSettings} />}
                                {trainingSubTab === 'recovery' && <RecoveryAdvisor activities={activities} />}
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
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default App;
