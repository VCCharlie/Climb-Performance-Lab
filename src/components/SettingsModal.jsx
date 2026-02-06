import React, { useState } from 'react';
import { Settings, Activity, RefreshCw, Save, Moon, Sun, Shield, Target, Bell, Database, Download, Upload, Zap, X } from 'lucide-react';
import { calculatePowerZones } from '../utils';

const SettingsModal = ({
    onClose,
    intervalsConfig, updateIntervalsConfig,
    userSettings, updateUserSettings,
    onSaveToCloud, theme, setTheme,
    fullData, onImportBackup
}) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveToCloud();
        setIsSaving(false);
        onClose(); // Sluit modal na opslaan
    };

    // Styling Helpers
    const isDark = theme === 'dark';
    const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-md';
    const titleClass = isDark ? 'text-white' : 'text-slate-900';
    const labelClass = isDark ? 'text-slate-500' : 'text-slate-600';
    const inputClass = isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-slate-900';
    const subTitleClass = isDark ? 'text-slate-300' : 'text-slate-800';

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

    // 2. POWER ZONES CALCULATOR
    const handleRecalculateZones = () => {
        const newZones = calculatePowerZones(userSettings.ftp);
        updateUserSettings('powerZones', newZones);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 overflow-y-auto">
            <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-600 shadow-2xl ${isDark ? 'bg-slate-900' : 'bg-white'}`}>

                {/* HEADER */}
                <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} sticky top-0 z-10 ${isDark ? 'bg-slate-900' : 'bg-white'} flex justify-between items-center`}>
                    <h2 className={`text-xl font-bold ${titleClass} flex items-center gap-2`}>
                        <Settings className="text-slate-400" /> Settings & Configuration
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700/50 rounded transition-colors">
                        <X size={24} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* KOLOM 1: ALGEMEEN & PRIVACY */}
                    <div className="space-y-6">
                        {/* VISUAL & PRIVACY */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50 mb-4">
                                {isDark ? <Moon className="text-blue-400" size={18} /> : <Sun className="text-yellow-500" size={18} />}
                                <h3 className={`font-bold ${titleClass}`}>Appearance & Privacy</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-bold ${subTitleClass}`}>Black/White Mode</p>
                                        <p className="text-xs text-slate-400">Schakel tussen thema's.</p>
                                    </div>
                                    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-slate-600' : 'bg-yellow-400'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-1' : 'translate-x-6'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-700/30 pt-4">
                                    <div>
                                        <p className={`text-sm font-bold ${subTitleClass} flex items-center gap-2`}><Shield size={14} /> Privacy Mode</p>
                                        <p className="text-xs text-slate-400">Verberg gewicht & FTP.</p>
                                    </div>
                                    <button onClick={() => updateUserSettings('privacyMode', !userSettings.privacyMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!userSettings.privacyMode ? 'bg-slate-600' : 'bg-green-500'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!userSettings.privacyMode ? 'translate-x-1' : 'translate-x-6'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* INTERVALS INTEGRATION */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50 mb-4">
                                <Activity className="text-orange-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Intervals.icu Sync</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>Athlete ID</label>
                                    <input type="text" value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className={`w-full border rounded p-3 outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>API Key</label>
                                    <input type="password" value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className={`w-full border rounded p-3 outline-none ${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        {/* BACKUP & RESTORE */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50 mb-4">
                                <Database className="text-blue-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Backup & Data</h3>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleExport} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                                    <Download size={14} /> Export JSON
                                </button>
                                <label className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
                                    <Upload size={14} /> Import JSON
                                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* KOLOM 2: DOELEN & ZONES */}
                    <div className="space-y-6">
                        {/* DOELEN & PROFILE */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50 mb-4">
                                <Target className="text-red-400" size={18} />
                                <h3 className={`font-bold ${titleClass}`}>Performance & Goals</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass} text-blue-500`}>Current FTP (W)</label>
                                    <input type="number" value={userSettings.ftp || ''} onChange={e => updateUserSettings('ftp', Number(e.target.value))} className={`w-full border rounded p-2 text-sm outline-none font-bold ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Current Weight (kg)</label>
                                    <input type="number" value={userSettings.weight || ''} onChange={e => updateUserSettings('weight', Number(e.target.value))} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/30">
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Yearly KM</label>
                                    <input type="number" value={userSettings.goals?.yearlyKm || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, yearlyKm: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Target FTP</label>
                                    <input type="number" value={userSettings.goals?.targetFtp || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetFtp: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Target Kg</label>
                                    <input type="number" value={userSettings.goals?.targetWeight || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetWeight: Number(e.target.value) })} className={`w-full border rounded p-2 text-sm outline-none ${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        {/* NOTIFICATIE DREMPELS (UITGEBREID) */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50 mb-4">
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

                        {/* CUSTOM POWER ZONES */}
                        <div className={`border rounded-xl p-6 ${cardClass}`}>
                            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-yellow-400" size={18} />
                                    <h3 className={`font-bold ${titleClass}`}>Power Zones</h3>
                                </div>
                                <button onClick={handleRecalculateZones} className="text-xs text-blue-400 hover:text-blue-300 underline">
                                    Reset to FTP
                                </button>
                            </div>

                            <div className="space-y-2">
                                {(userSettings.powerZones || []).map((zone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></div>
                                        <span className={`w-14 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{zone.name}</span>

                                        <input
                                            type="number"
                                            value={zone.min}
                                            className={`w-12 border rounded px-1 py-1 text-xs outline-none text-right ${inputClass}`}
                                            readOnly
                                        />
                                        <span className="text-xs text-slate-500">-</span>
                                        <input
                                            type="number"
                                            value={zone.max}
                                            onChange={(e) => {
                                                const newZones = [...userSettings.powerZones];
                                                newZones[idx].max = Number(e.target.value);
                                                // Update next zone min automatically
                                                if (newZones[idx + 1]) newZones[idx + 1].min = Number(e.target.value) + 1;
                                                updateUserSettings('powerZones', newZones);
                                            }}
                                            className={`w-12 border rounded px-1 py-1 text-xs outline-none text-right ${inputClass}`}
                                        />
                                        <span className="text-xs text-slate-500">W</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-3`}>
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700">Close</button>
                    <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${isSaving ? 'bg-slate-600' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'}`}>
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;