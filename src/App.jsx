import React, { useState, useEffect, useMemo } from 'react';
import { Gauge, Mountain, Activity, Utensils, Brain, Route, Settings as SettingsIcon, TrendingUp, Menu, X, Heart, Trophy, Cloud } from 'lucide-react';
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
    const [activities, setActivities] = useState([]);
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
    const [bucketListState, setBucketListState] = useState({
        climbStatus: {}
    });
    const [weatherClimbState, setWeatherClimbState] = useState({
        selectedClimb: CLIMB_DATABASE[0],
        targetPower: 280 * 0.85,
        temperature: 20,
        windSpeed: 0,
        windDirection: 'none',
        humidity: 50
    });

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
            console.log("Saving Settings to Cloud:", { intervals: intervalsConfig, body: userSettings, theme });
            await setDoc(doc(db, "settings", settingsId), {
                intervals: intervalsConfig,
                body: userSettings,
                theme: theme
            }, { merge: true });
            alert("Settings saved! Bike Weight: " + (userSettings.bikeWeight || 'N/A'));
        } catch (e) { alert("Error saving settings: " + e.message); }
    };

    const handleImportBackup = (backupData) => {
        if (backupData.settings) setUserSettings(prev => ({ ...prev, ...backupData.settings }));
        if (backupData.intervals) setIntervalsConfig(backupData.intervals);
        if (backupData.activities) setActivities(backupData.activities);
        alert("Backup succesvol hersteld!");
    };

    // Chart Data logic moved to Dashboard.jsx


    const isDark = theme === 'dark';
    const mainClass = isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-900';
    const navBtnActive = isDark ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20' : 'bg-white text-slate-900 border border-slate-300 shadow-md';
    const navBtnInactive = isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white';

    return (
        <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${mainClass}`}>

            <Header
                userSettings={userSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                user={user}
                syncStatus={syncStatus}
            />

            <main className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'data' ? 'max-w-[95%]' : 'max-w-7xl'}`}>
                {/* Navigation - Desktop & Mobile */}
                <div className="relative">
                    {/* Mobile: Hamburger Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden flex items-center gap-2 px-4 py-2 bg-slate-800 rounded border border-slate-700 text-white mb-4"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        <span className="font-bold text-sm">
                            {[
                                { id: 'dashboard', label: 'Dashboard' },
                                { id: 'coach', label: 'AI Coach' },
                                { id: 'physics', label: 'Physics' },
                                { id: 'data', label: 'Data Hub' },
                                { id: 'fueling', label: 'Fueling' },
                                { id: 'racepacing', label: 'Race Pacing' },
                                { id: 'gearoptimizer', label: 'Gear Optimizer' },
                                { id: 'profiler', label: 'Climb Profiler' },
                                { id: 'recovery', label: 'Recovery Advisor' },
                                { id: 'bucketlist', label: 'Bucket List' },
                                { id: 'weather', label: 'Weather Climb' },
                            ].find(item => item.id === activeTab)?.label || 'Menu'}
                        </span>
                    </button>

                    {/* Mobile: Dropdown Menu */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 mb-4">
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: Gauge },
                                { id: 'coach', label: 'AI Coach', icon: Brain },
                                { id: 'physics', label: 'Physics', icon: Mountain },
                                { id: 'data', label: 'Data Hub', icon: Activity },
                                { id: 'fueling', label: 'Fueling', icon: Utensils },
                                { id: 'racepacing', label: 'Race Pacing', icon: Route },
                                { id: 'gearoptimizer', label: 'Gear Optimizer', icon: SettingsIcon },
                                { id: 'profiler', label: 'Climb Profiler', icon: TrendingUp },
                                { id: 'recovery', label: 'Recovery Advisor', icon: Heart },
                                { id: 'bucketlist', label: 'Bucket List', icon: Trophy },
                                { id: 'weather', label: 'Weather Climb', icon: Cloud },
                            ].map(item => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                            ? 'bg-yellow-400/20 text-yellow-400 border-l-4 border-yellow-400'
                                            : 'text-slate-300 hover:bg-slate-700'
                                            }`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Desktop: Horizontal Tabs (more compact) */}
                    <nav className="hidden md:flex overflow-x-auto gap-1 pb-2 border-b border-slate-700/50 mb-4">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: Gauge },
                            { id: 'coach', label: 'AI Coach', icon: Brain },
                            { id: 'physics', label: 'Physics', icon: Mountain },
                            { id: 'data', label: 'Data Hub', icon: Activity },
                            { id: 'fueling', label: 'Fueling', icon: Utensils },
                            { id: 'racepacing', label: 'Pacing', icon: Route },
                            { id: 'gearoptimizer', label: 'Gear', icon: SettingsIcon },
                            { id: 'profiler', label: 'Profiler', icon: TrendingUp },
                            { id: 'recovery', label: 'Recovery', icon: Heart },
                            { id: 'bucketlist', label: 'Bucket', icon: Trophy },
                            { id: 'weather', label: 'Weather', icon: Cloud },
                        ].map(item => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${isActive
                                        ? (isDark ? 'border-yellow-400 text-white' : 'border-blue-500 text-blue-600')
                                        : 'border-transparent text-slate-500 hover:text-slate-400'
                                        }`}
                                >
                                    <item.icon className={`w-3.5 h-3.5 ${isActive ? (isDark ? 'text-yellow-400' : 'text-blue-500') : ''}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">Laden van data...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <Dashboard theme={theme} manualFtp={userSettings.ftp} />
                                </div>
                                <div className="lg:col-span-1">
                                    <ClimbProfileCard climb={selectedClimb} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'coach' && <AICoach activities={activities} userSettings={userSettings} />}

                        {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />}

                        {activeTab === 'data' && (
                            <DataHub
                                activities={activities}
                                onImport={(n) => {
                                    setActivities(prev => {
                                        const map = new Map(prev.map(a => [a.id, a]));
                                        n.forEach(act => map.set(act.id, act));
                                        return Array.from(map.values());
                                    });
                                }}
                                onDelete={(id) => setActivities(activities.filter(a => a.id !== id))}
                                onClear={() => setActivities([])} // NIEUW: Prop om alles leeg te maken
                                intervalsConfig={intervalsConfig}
                            />
                        )}

                        {activeTab === 'fueling' && (
                            <FuelingStrategy
                                initialDuration={fuelingState.duration}
                                initialIntensity={fuelingState.intensity}
                            />
                        )}

                        {activeTab === 'racepacing' && (
                            <RacePacing
                                userSettings={userSettings}
                                initialState={racePacingState}
                                onStateChange={setRacePacingState}
                                onExportToFueling={(duration, intensity) => {
                                    setFuelingState({ duration, intensity });
                                    setActiveTab('fueling');
                                }}
                            />
                        )}

                        {activeTab === 'gearoptimizer' && (
                            <GearOptimizer
                                userSettings={userSettings}
                                initialState={gearOptimizerState}
                                onStateChange={setGearOptimizerState}
                            />
                        )}

                        {activeTab === 'profiler' && (
                            <ClimbProfiler
                                userSettings={userSettings}
                                initialState={climbProfilerState}
                                onStateChange={setClimbProfilerState}
                            />
                        )}

                        {activeTab === 'recovery' && <RecoveryAdvisor activities={activities} />}

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
                                fullData={{ activities, settings: userSettings, intervals: intervalsConfig }}
                                onImportBackup={handleImportBackup}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default App;
