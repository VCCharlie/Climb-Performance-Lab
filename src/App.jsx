import React, { useState, useEffect, useMemo } from 'react';
import { Gauge, Mountain, Activity, Utensils } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from './firebase';
import { CLIMB_DATABASE } from './climbs';
import { calculatePowerZones } from './utils';

// Components
import Header from './components/Header';
import PhysicsEngine from './components/PhysicsEngine';
import DataHub from './components/DataHub';
import FuelingStrategy from './components/FuelingStrategy';
import ClimbProfileCard from './components/ClimbProfileCard';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';

const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    // Auth Listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsubscribe();
    }, []);

    // Data Laden (Settings + Historie)
    useEffect(() => {
        const loadData = async () => {
            if (!db) return;
            setIsLoading(true);
            try {
                // A. Settings laden
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

                // B. Activiteiten Historie laden
                const actCol = collection(db, "activities");
                const actSnap = await getDocs(actCol);
                const loadedActs = actSnap.docs.map(d => d.data());

                if (loadedActs.length > 0) {
                    loadedActs.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setActivities(loadedActs);
                }

            } catch (e) {
                console.error("Error loading data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user]);

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
            await setDoc(doc(db, "settings", settingsId), {
                intervals: intervalsConfig,
                body: userSettings,
                theme: theme
            }, { merge: true });
            alert("Settings saved!");
        } catch (e) { alert("Error saving settings: " + e.message); }
    };

    const handleImportBackup = (backupData) => {
        if (backupData.settings) setUserSettings(prev => ({ ...prev, ...backupData.settings }));
        if (backupData.intervals) setIntervalsConfig(backupData.intervals);
        if (backupData.activities) setActivities(backupData.activities);
        alert("Backup succesvol hersteld!");
    };

    // Chart Data
    const chartData = useMemo(() => {
        if (activities.length === 0) return [];
        const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));
        let lastKnownFtp = userSettings.ftp || 200;

        return sorted.map(act => {
            if (act.ftp && act.ftp > 100) {
                lastKnownFtp = act.ftp;
            }
            return {
                date: act.date,
                load: act.load,
                ftp: lastKnownFtp
            };
        });
    }, [activities, userSettings.ftp]);

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
            />

            <main className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'data' ? 'max-w-[95%]' : 'max-w-7xl'}`}>
                <nav className="flex overflow-x-auto gap-1.5 pb-2 md:pb-0">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: Gauge },
                        { id: 'physics', label: 'Physics', icon: Mountain },
                        { id: 'data', label: 'Data Hub', icon: Activity },
                        { id: 'fueling', label: 'Fueling', icon: Utensils },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === item.id ? navBtnActive : navBtnInactive}`}
                        >
                            <item.icon className="w-3.5 h-3.5" /> {item.label}
                        </button>
                    ))}
                </nav>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">Laden van data...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <Dashboard chartData={chartData} theme={theme} />
                                </div>
                                <div className="lg:col-span-1">
                                    <ClimbProfileCard climb={selectedClimb} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />}

                        {activeTab === 'data' && (
                            <DataHub
                                activities={activities}
                                onImport={(n) => {
                                    setActivities(prev => [...prev, ...n]);
                                }}
                                onDelete={(id) => setActivities(activities.filter(a => a.id !== id))}
                                onClear={() => setActivities([])} // NIEUW: Prop om alles leeg te maken
                                intervalsConfig={intervalsConfig}
                            />
                        )}

                        {activeTab === 'fueling' && <FuelingStrategy />}

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
