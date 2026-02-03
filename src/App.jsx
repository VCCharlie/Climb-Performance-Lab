import React, { useState, useEffect, useMemo } from 'react';
import { Gauge, Mountain, Activity, Utensils, Settings } from 'lucide-react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, loginWithGoogle, logout } from './firebase';
import { CLIMB_DATABASE } from './climbs';

// Components
import Header from './components/Header';
import PhysicsEngine from './components/PhysicsEngine';
import DataHub from './components/DataHub';
import FuelingStrategy from './components/FuelingStrategy';
import ClimbProfileCard from './components/ClimbProfileCard';
import Dashboard from './components/Dashboard';
import SettingsTab from './components/SettingsTab';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [userSettings, setUserSettings] = useState({
    weight: 70.0,
    bikeWeight: 7.5,
    ftp: 280,
    maxHr: 190
  });

  // Safe init
  const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE?.[0] || {id: 'dummy', name: 'Loading', lengthKm: 0, elevation: 0, avgGrade: 0});
  const [intervalsConfig, setIntervalsConfig] = useState({ apiKey: '', athleteId: '' });
  const [activities, setActivities] = useState([]);

  // User auth state
  const [user, setUser] = useState(null);

  // New settings state
  const [privacyMode, setPrivacyMode] = useState(false);
  const [goals, setGoals] = useState({ kilometers: 0, ftp: 0, weight: 0 });
  const [notifications, setNotifications] = useState({
    highLoadThreshold: 150,
    lowPowerThreshold: 180,
    consecutiveDaysThreshold: 5
  });

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Load Settings (user-specific if logged in)
  useEffect(() => {
      const loadSettings = async () => {
          if (!db) return;
          try {
              const settingsId = user ? `user_${user.uid}` : "user_prefs";
              const docRef = doc(db, "settings", settingsId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  if (data.intervals) setIntervalsConfig(data.intervals);
                  if (data.body) setUserSettings(prev => ({...prev, ...data.body}));
                  if (data.privacyMode !== undefined) setPrivacyMode(data.privacyMode);
                  if (data.goals) setGoals(data.goals);
                  if (data.notifications) setNotifications(data.notifications);
              }
          } catch (e) { console.log("Error loading settings", e); }
      };
      loadSettings();
  }, [user]);

  const saveSettingsToCloud = async () => {
      if (!db) return;
      try {
          const settingsId = user ? `user_${user.uid}` : "user_prefs";
          await setDoc(doc(db, "settings", settingsId), {
              intervals: intervalsConfig,
              body: userSettings,
              privacyMode,
              goals,
              notifications
          }, { merge: true });
      } catch (e) { alert("Error saving settings: " + e.message); }
  };

  // Google Login handlers
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Login mislukt: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert("Logout mislukt: " + error.message);
    }
  };

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (activities.length === 0) return [];
    return activities.map(act => ({
        date: act.date,
        load: act.load,
        ftp: act.norm_power // proxy
    })).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [activities]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-12 text-sm">

      <Header
        intervalsConfig={intervalsConfig}
        updateIntervalsConfig={(k, v) => setIntervalsConfig(p => ({...p, [k]: v}))}
        onSaveSettings={saveSettingsToCloud}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main className={`mx-auto p-3 space-y-4 transition-all duration-300 ${activeTab === 'data' ? 'max-w-[95%]' : 'max-w-7xl'}`}>
        <nav className="flex overflow-x-auto gap-1.5 pb-2 md:pb-0">
           {[
             {id: 'dashboard', label: 'Dashboard', icon: Gauge},
             {id: 'physics', label: 'Physics', icon: Mountain},
             {id: 'data', label: 'Data Hub', icon: Activity},
             {id: 'fueling', label: 'Fueling', icon: Utensils},
             {id: 'settings', label: 'Settings', icon: Settings},
           ].map(item => (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === item.id ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
             >
                <item.icon className="w-3.5 h-3.5"/> {item.label}
             </button>
           ))}
        </nav>

        {activeTab === 'dashboard' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               <div className="lg:col-span-2">
                   <Dashboard chartData={chartData} />
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
                onImport={(n) => setActivities([...activities, ...n])}
                onDelete={(id) => setActivities(activities.filter(a => a.id !== id))}
                intervalsConfig={intervalsConfig}
            />
        )}

        {activeTab === 'fueling' && <FuelingStrategy />}

        {activeTab === 'settings' && (
          <SettingsTab
            intervalsConfig={intervalsConfig}
            updateIntervalsConfig={(k, v) => setIntervalsConfig(p => ({...p, [k]: v}))}
            onSaveToCloud={saveSettingsToCloud}
            userSettings={userSettings}
            setUserSettings={setUserSettings}
            activities={activities}
            onImportActivities={(newActivities) => setActivities([...activities, ...newActivities])}
            privacyMode={privacyMode}
            setPrivacyMode={setPrivacyMode}
            goals={goals}
            setGoals={setGoals}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}
      </main>
    </div>
  );
};

export default App;
