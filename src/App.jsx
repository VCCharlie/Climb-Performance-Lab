import React, { useState, useEffect, useMemo } from 'react';
import { Gauge, Mountain, Activity, Utensils, Settings } from 'lucide-react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from './firebase';
import { calculateRollingTrend } from './utils';
import { CLIMB_DATABASE } from './climbs';

// Components
import Header from './components/Header';
import PhysicsEngine from './components/PhysicsEngine';
import DataHub from './components/DataHub';
import FuelingStrategy from './components/FuelingStrategy';
import ClimbProfileCard from './components/ClimbProfileCard';
import SettingsTab from './components/SettingsTab';
import Dashboard from './components/Dashboard';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
  
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

  // Load Settings
  useEffect(() => {
      const loadSettings = async () => {
          if (!db) return;
          try {
              const docRef = doc(db, "settings", "user_prefs");
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  if (data.intervals) setIntervalsConfig(data.intervals);
                  if (data.body) setUserSettings(prev => ({...prev, ...data.body}));
                  if (data.theme) setTheme(data.theme); // Load theme if saved
              }
          } catch (e) { console.log("Error loading settings", e); }
      };
      loadSettings();
  }, []);

  const saveSettingsToCloud = async () => {
      if (!db) return;
      try {
          await setDoc(doc(db, "settings", "user_prefs"), {
              intervals: intervalsConfig,
              body: userSettings,
              theme: theme
          }, { merge: true });
          alert("Settings Saved!");
      } catch (e) { alert("Error saving settings: " + e.message); }
  };

  // Chart Data Preparation (Updated with FTP)
  const chartData = useMemo(() => {
    if (activities.length === 0) return [];
    return activities.map(act => ({
        date: act.date,
        load: act.load,
        ftp: act.ftp || act.norm_power || 0 // Use real FTP if available, else NP as fallback
    })).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [activities]);

  // Dynamic Styles based on Theme
  const mainClass = theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-gray-50 text-slate-900';
  const navBtnActive = theme === 'dark' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-900 text-white';
  const navBtnInactive = theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white text-slate-500 hover:text-slate-900 shadow-sm';

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${mainClass}`}>
      
      <Header userSettings={userSettings} />

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <nav className="flex overflow-x-auto gap-2 pb-2 md:pb-0">
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
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === item.id ? navBtnActive : navBtnInactive}`}
             >
                <item.icon className="w-4 h-4"/> {item.label}
             </button>
           ))}
        </nav>

        {activeTab === 'dashboard' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                theme={theme}
                setTheme={setTheme}
            />
        )}
      </main>
    </div>
  );
};

export default App;