import React, { useState } from 'react';
import { Settings, Activity, RefreshCw, Save, User, Moon, Sun } from 'lucide-react';

const SettingsTab = ({ intervalsConfig, updateIntervalsConfig, onSaveToCloud, theme, setTheme }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveToCloud();
        setIsSaving(false);
    };

    const isDark = theme === 'dark';
    const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-md';
    const titleClass = isDark ? 'text-white' : 'text-slate-900';
    const labelClass = isDark ? 'text-slate-500' : 'text-slate-600';
    const inputClass = isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-slate-900';

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className={`border rounded-xl p-6 ${cardClass}`}>
                <h2 className={`text-xl font-bold ${titleClass} mb-6 flex items-center gap-2`}>
                    <Settings className="text-slate-400" /> Application Settings
                </h2>

                {/* VISUAL SETTINGS */}
                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                        {isDark ? <Moon className="text-blue-400" size={18}/> : <Sun className="text-yellow-500" size={18}/>}
                        <h3 className={`font-bold ${titleClass}`}>Appearance</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-bold ${titleClass}`}>Black/White Mode</p>
                            <p className="text-xs text-slate-400">Schakel tussen donkere (standaard) en lichte weergave.</p>
                        </div>
                        <button 
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'bg-slate-600' : 'bg-yellow-400'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-1' : 'translate-x-6'}`} />
                        </button>
                    </div>
                </div>

                {/* INTERVALS SETTINGS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                        <Activity className="text-orange-400" size={18} />
                        <h3 className={`font-bold ${titleClass}`}>Intervals.icu Integration</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                        Deze gegevens worden gebruikt om je ritten te synchroniseren. 
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>Athlete ID</label>
                            <input type="text" placeholder="e.g. i12345" value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className={`w-full border rounded p-3 focus:border-orange-400 outline-none transition-colors ${inputClass}`} />
                        </div>
                        <div>
                            <label className={`block text-xs uppercase font-bold mb-1 ${labelClass}`}>API Key</label>
                            <input type="password" placeholder="Your API Key" value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className={`w-full border rounded p-3 focus:border-orange-400 outline-none transition-colors ${inputClass}`} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${isSaving ? 'bg-slate-600' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'}`}>
                        {isSaving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18}/>}
                        {isSaving ? 'Saving...' : 'Save Settings to Cloud'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;