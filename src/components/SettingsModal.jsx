import React, { useState } from 'react';
import { Settings, Activity, RefreshCw, Save, Moon, Sun, Shield, Target, Bell, Database, Download, Upload, Zap, X, Link, Unlink } from 'lucide-react';
import { calculatePowerZones } from '../utils';
import SyncPanel from './data-hub/SyncPanel';

// Strava logo SVG
const StravaIcon = ({ size = 16 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

const SettingsModal = ({
    onClose,
    intervalsConfig, updateIntervalsConfig,
    userSettings, updateUserSettings,
    onSaveToCloud, theme, setTheme,
    fullData, onImportBackup,
    syncState, onSyncComplete,
    stravaConfig, updateStravaConfig, stravaAuth
}) => {
    const [isSaving, setIsSaving] = useState(false);

    // -- Sync Wrapper --
    const { syncDates, setSyncDates, sportFilters, setSportFilters, isSyncing, syncProgress, syncIntervals } = syncState || {};

    const toggleSportFilter = (type) => {
        if (setSportFilters) setSportFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const setAllSportFilters = (val) => {
        import('../config').then(({ SPORT_TYPES }) => {
            if (setSportFilters) setSportFilters(SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: val }), {}));
        });
    };

    const handleIntervalsSyncWrapper = async () => {
        if (!syncIntervals || !syncDates || !sportFilters) return;
        const selectedTypes = Object.keys(sportFilters).filter(k => sportFilters[k]);
        try {
            const newRides = await syncIntervals(syncDates.start, syncDates.end, selectedTypes);
            if (newRides && newRides.length > 0) {
                if (onSyncComplete) await onSyncComplete(newRides);
                alert(`Sync successful! Handled ${newRides.length} activities.`);
            } else if (newRides) {
                alert("No activities found in range.");
            }
        } catch (e) {
            alert(e.message);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveToCloud();
        setIsSaving(false);
        onClose(); // Sluit modal na opslaan
    };

    // Styling Helpers
    const isDark = theme === 'dark';
    const cardClass = isDark ? 'bg-cdsurface border-cdborder' : 'bg-white border-gray-200 shadow-md';
    const titleClass = isDark ? 'text-cdtext' : 'text-slate-900';
    const labelClass = isDark ? 'text-cdmuted' : 'text-slate-600';
    const inputClass = isDark ? 'bg-cdbg border-cdborder text-cdtext' : 'bg-gray-50 border-gray-300 text-slate-900';
    const subTitleClass = isDark ? 'text-cdtext' : 'text-slate-800';

    // 1. BACKUP & EXPORT FUNCTIE
    const handleExport = () => {
        const dataStr = JSON.stringify(fullData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `climb_lab_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();
    };

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (onImportBackup) onImportBackup(data);
            } catch (err) {
                alert("Fout bij lezen bestand: " + err.message);
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 overflow-y-auto">
            <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-cdborder shadow-2xl ${isDark ? 'bg-cdbg' : 'bg-white'}`}>

                {/* HEADER */}
                <div className={`p-4 border-b ${isDark ? 'border-cdborder' : 'border-gray-200'} sticky top-0 z-10 ${isDark ? 'bg-cdbg' : 'bg-white'} flex justify-between items-center`}>
                    <h2 className={`text-xl font-bold ${titleClass} flex items-center gap-2`}>
                        <Settings className="text-cdmuted" /> Settings & Configuration
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close modal" className="p-1 hover:bg-cdborder/50 rounded transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none">
                        <X size={24} className={isDark ? 'text-cdmuted' : 'text-slate-600'} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* KOLOM 1: ALGEMEEN & PRIVACY */}
                    <div className="space-y-6">
                        {/* VISUAL & PRIVACY */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                {isDark ? <Moon className="text-blue-400" size={18} /> : <Sun className="text-yellow-500" size={18} />}
                                <h3 className={`font-bold ${titleClass}`}>Appearance & Privacy</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-bold ${subTitleClass}`}>Black/White Mode</p>
                                        <p className="text-xs text-cdmuted">Schakel tussen thema's.</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isDark}
                                        aria-label="Toggle Black/White Mode"
                                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none ${isDark ? 'bg-slate-600' : 'bg-yellow-400'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-1' : 'translate-x-6'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-cdborder/30 pt-4">
                                    <div>
                                        <p className={`text-sm font-bold ${subTitleClass} flex items-center gap-2`}><Shield size={14} /> Privacy Mode</p>
                                        <p className="text-xs text-cdmuted">Verberg gewicht & FTP.</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={userSettings.privacyMode}
                                        aria-label="Toggle Privacy Mode"
                                        onClick={() => updateUserSettings('privacyMode', !userSettings.privacyMode)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none ${!userSettings.privacyMode ? 'bg-slate-600' : 'bg-green-500'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!userSettings.privacyMode ? 'translate-x-1' : 'translate-x-6'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* INTERVALS INTEGRATION */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Activity className="text-orange-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Intervals.icu Sync</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>Athlete ID</label>
                                    <input type="text" maxLength={30} value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className={`w-full border rounded p-3 outline-none ${inputClass}`} />
                                </div>
                                <div className="pt-2">
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>API Key</label>
                                    <input type="password" maxLength={100} value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className={`w-full border rounded p-3 outline-none ${inputClass}`} />
                                </div>
                                {/* GitHub PAT for manual sync trigger */}
                                <div className="pt-2 border-t border-cdborder/30 mt-2">
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>
                                        GitHub PAT
                                        <span className="text-cdmuted font-normal ml-1 normal-case">(voor "Sync Now" knop)</span>
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={100}
                                        placeholder="ghp_xxxxxxxxxxxxxxxxxx"
                                        value={userSettings.githubPat || ''}
                                        onChange={e => updateUserSettings('githubPat', e.target.value)}
                                        className={`w-full border rounded p-3 outline-none ${inputClass}`}
                                    />
                                    <p className="text-xs text-cdmuted mt-1">
                                        Maak een PAT aan op{' '}
                                        <a
                                            href="https://github.com/settings/tokens/new?scopes=workflow"
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                        >
                                            github.com/settings/tokens
                                        </a>{' '}
                                        met scope <code className="bg-cdborder px-1 rounded">workflow</code>.
                                    </p>
                                </div>
                                {/* OpenWeatherMap API Key */}
                                <div className="pt-2 border-t border-cdborder/30 mt-2">
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>
                                        OpenWeatherMap API Key
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={100}
                                        placeholder="Voer API key in..."
                                        value={userSettings.openweatherApiKey || ''}
                                        onChange={e => updateUserSettings('openweatherApiKey', e.target.value)}
                                        className={`w-full border rounded p-3 outline-none ${inputClass}`}
                                    />
                                    <p className="text-xs text-cdmuted mt-1">
                                        Gratis aan te maken op{' '}
                                        <a
                                            href="https://openweathermap.org/api"
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                        >
                                            openweathermap.org
                                        </a>.
                                    </p>
                                </div>
                            </div>

                            {syncState && (
                                <div className="mt-6 pt-6 border-t border-cdborder/50">
                                    <SyncPanel
                                        syncDates={syncDates}
                                        setSyncDates={setSyncDates}
                                        sportFilters={sportFilters}
                                        toggleSportFilter={toggleSportFilter}
                                        setAllSportFilters={setAllSportFilters}
                                        isSyncing={isSyncing}
                                        syncProgress={syncProgress}
                                        handleIntervalsSync={handleIntervalsSyncWrapper}
                                    />
                                </div>
                            )}
                        </div>

                        {/* STRAVA CONNECTION */}
                        {stravaAuth && (
                            <div className={`border rounded-xl p-6 ${cardClass}`}>
                                <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                    <span className="text-orange-400"><StravaIcon size={18} /></span>
                                    <h3 className={`font-bold ${titleClass}`}>Strava connection</h3>
                                    {stravaAuth.isConnected && (
                                        <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                            <Link size={10} /> Connected
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>Client ID</label>
                                        <input
                                            type="text"
                                            maxLength={30}
                                            placeholder="12345"
                                            value={stravaConfig?.client_id || ''}
                                            onChange={e => updateStravaConfig('client_id', e.target.value)}
                                            className={`w-full border rounded p-3 outline-none ${inputClass}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>Client Secret</label>
                                        <input
                                            type="password"
                                            maxLength={100}
                                            placeholder="••••••••••••••••"
                                            value={stravaConfig?.client_secret || ''}
                                            onChange={e => updateStravaConfig('client_secret', e.target.value)}
                                            className={`w-full border rounded p-3 outline-none ${inputClass}`}
                                        />
                                        <p className="text-xs text-cdmuted mt-1">
                                            Get your credentials at{' '}
                                            <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                                strava.com/settings/api
                                            </a>
                                            . Set redirect URI to:{' '}
                                            <code className="bg-cdborder px-1 rounded text-[10px]">{window.location.origin + window.location.pathname}</code>
                                        </p>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        {stravaAuth.isConnected ? (
                                            <>
                                                {stravaConfig?.athlete_name && (
                                                    <span className="flex-1 text-sm text-cdtext flex items-center gap-1">
                                                        <span className="text-orange-400"><StravaIcon size={14} /></span>
                                                        {stravaConfig.athlete_name}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={stravaAuth.disconnectStrava}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded font-bold text-sm transition-colors"
                                                >
                                                    <Unlink size={14} /> Disconnect
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={stravaAuth.connectStrava}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-sm transition-colors"
                                            >
                                                <StravaIcon size={16} /> Connect with Strava
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BACKUP & RESTORE */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Database className="text-blue-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Backup & Data</h3>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={handleExport} className="flex-1 bg-cdborder hover:bg-slate-600 text-cdtext py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                                    <Download size={14} /> Export JSON
                                </button>
                                <label className="flex-1 bg-cdborder hover:bg-slate-600 text-cdtext py-2 rounded text-sm font-bold flex items-center justify-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-yellow-400 focus-within:outline-none">
                                    <Upload size={14} /> Import JSON
                                    <input type="file" accept=".json" onChange={handleImportFile} className="sr-only" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* KOLOM 2: DOELEN & ZONES */}
                    <div className="space-y-6">
                        {/* DOELEN & PROFILE */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Target className="text-red-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Performance & Goals</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass} text-blue-500`}>Current FTP (W)</label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => updateUserSettings('ftp', (userSettings.ftp || 250) - 1)} className={`p-2 rounded ${isDark ? 'bg-cdborder hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>-</button>
                                        <input type="number" value={userSettings.ftp || ''} onChange={e => updateUserSettings('ftp', Number(e.target.value))} className={`w-full border rounded p-2 text-sm outline-none font-bold text-center ${inputClass}`} />
                                        <button type="button" onClick={() => updateUserSettings('ftp', (userSettings.ftp || 250) + 1)} className={`p-2 rounded ${isDark ? 'bg-cdborder hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Body Weight (kg)</label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => updateUserSettings('weight', parseFloat(((userSettings.weight || 70) - 0.1).toFixed(1)))} className={`p-2 rounded ${isDark ? 'bg-cdborder hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>-</button>
                                        <input type="number" value={userSettings.weight || ''} onChange={e => updateUserSettings('weight', Number(e.target.value))} className={`w-full border rounded p-2 text-sm outline-none text-center ${inputClass}`} />
                                        <button type="button" onClick={() => updateUserSettings('weight', parseFloat(((userSettings.weight || 70) + 0.1).toFixed(1)))} className={`p-2 rounded ${isDark ? 'bg-cdborder hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Bike Weight (kg)</label>
                                    <div className="flex items-center gap-1">
                                        <input type="number" step="0.1" value={userSettings.bikeWeight || ''} onChange={e => updateUserSettings('bikeWeight', Number(e.target.value))} className={`w-full border rounded p-2 text-sm outline-none text-center ${inputClass}`} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-cdborder/30">
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Yearly KM</label>
                                    <input type="number" value={userSettings.goals?.yearlyKm || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, yearlyKm: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Target FTP</label>
                                    <div className="flex gap-1">
                                        <input type="number" value={userSettings.goals?.targetFtp || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetFtp: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Target Kg</label>
                                    <div className="flex gap-1">
                                        <input type="number" value={userSettings.goals?.targetWeight || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetWeight: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NOTIFICATIE DREMPELS (UITGEBREID) */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Bell className="text-yellow-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Notification Thresholds</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>High Load (TSS) &gt;</label>
                                    <input type="number" value={userSettings.notifications?.highLoad || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, highLoad: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Low Power (NP) &lt;</label>
                                    <input type="number" value={userSettings.notifications?.lowPower || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, lowPower: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Min Weight &lt;</label>
                                    <input type="number" value={userSettings.notifications?.minWeight || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, minWeight: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Rest Day (Days)</label>
                                    <input type="number" value={userSettings.notifications?.restDay || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, restDay: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        {/* CUSTOM POWER ZONES (LOCKED TO COGGAN) */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center justify-between pb-2 border-b border-cdborder/50 mb-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-yellow-400" size={18} />
                                    <h3 className={`font-bold ${titleClass}`}>Power Zones (Coggan)</h3>
                                </div>
                                <span className="text-xs text-cdmuted italic">
                                    Auto-calculated based on FTP
                                </span>
                            </div>

                            <div className="space-y-2">
                                {(calculatePowerZones(userSettings.ftp || 250)).map((zone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></div>
                                        <span className={`w-24 text-xs font-bold ${isDark ? 'text-cdtext' : 'text-slate-700'}`}>{zone.label}</span>

                                        <div className={`flex-1 text-right text-xs font-mono opacity-80 ${isDark ? 'text-cdmuted' : 'text-slate-600'}`}>
                                            {zone.min} - {zone.max < 9999 ? zone.max : '∞'} W
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className={`p-4 border-t ${isDark ? 'border-cdborder' : 'border-gray-200'} flex justify-end gap-3`}>
                    <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-cdmuted hover:text-slate-700">Close</button>
                    <button type="button" onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-cdtext transition-all ${isSaving ? 'bg-slate-600' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'}`}>
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;