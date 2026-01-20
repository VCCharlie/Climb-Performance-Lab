import React, { useState } from 'react';
import { Settings, Activity, RefreshCw, Save, User } from 'lucide-react';

const SettingsTab = ({ intervalsConfig, updateIntervalsConfig, onSaveToCloud }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveToCloud();
        setIsSaving(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="text-slate-400" /> Application Settings
                </h2>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                        <Activity className="text-orange-400" size={18} />
                        <h3 className="font-bold text-white">Intervals.icu Integration</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                        Deze gegevens worden gebruikt om je ritten te synchroniseren. 
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Athlete ID</label>
                            <input type="text" placeholder="e.g. i12345" value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-orange-400 outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-500 mb-1">API Key</label>
                            <input type="password" placeholder="Your API Key" value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-orange-400 outline-none transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
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