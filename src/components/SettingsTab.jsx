import React, { useState, useMemo } from 'react';
import {
    Activity, RefreshCw, Save, Zap, Download, Upload,
    Eye, EyeOff, Target, Bell, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { calculatePowerZones } from '../utils';

// Section Header Component - defined outside to prevent recreation on each render
const SectionHeader = ({ icon, title, section, expanded, onToggle, color = 'text-orange-400' }) => {
    const IconComponent = icon;
    return (
        <button
            onClick={() => onToggle(section)}
            className="w-full flex items-center justify-between py-3 border-b border-slate-700 hover:bg-slate-700/30 px-2 rounded transition-colors"
        >
            <div className="flex items-center gap-2">
                <IconComponent className={color} size={18} />
                <h3 className="font-bold text-white">{title}</h3>
            </div>
            {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
    );
};

const SettingsTab = ({
    intervalsConfig,
    updateIntervalsConfig,
    onSaveToCloud,
    userSettings,
    setUserSettings,
    activities,
    onImportActivities,
    privacyMode,
    setPrivacyMode,
    goals,
    setGoals,
    notifications,
    setNotifications
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        powerZones: true,
        backup: false,
        privacy: false,
        goals: false,
        notifications: false
    });

    // Custom power zones (manual overrides)
    const defaultZones = useMemo(() => calculatePowerZones(userSettings?.ftp || 200), [userSettings?.ftp]);
    const [customZones, setCustomZones] = useState(() => calculatePowerZones(200));
    const [useCustomZones, setUseCustomZones] = useState(false);

    // Calculate power zones based on FTP
    const powerZones = useMemo(() => {
        if (useCustomZones && customZones) return customZones;
        return defaultZones;
    }, [defaultZones, useCustomZones, customZones]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveToCloud();
        setIsSaving(false);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
    };

    // --- BACKUP & RESTORE ---
    const handleBackup = () => {
        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            settings: {
                userSettings,
                intervalsConfig,
                goals,
                notifications,
                privacyMode,
                customZones: useCustomZones ? customZones : null
            },
            activities: activities || []
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `climb-lab-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate backup file
                if (!data.version || !data.settings) {
                    alert('Ongeldig backup bestand');
                    return;
                }

                // Restore settings
                if (data.settings.userSettings) setUserSettings(data.settings.userSettings);
                if (data.settings.intervalsConfig) {
                    updateIntervalsConfig('athleteId', data.settings.intervalsConfig.athleteId || '');
                    updateIntervalsConfig('apiKey', data.settings.intervalsConfig.apiKey || '');
                }
                if (data.settings.goals && setGoals) setGoals(data.settings.goals);
                if (data.settings.notifications && setNotifications) setNotifications(data.settings.notifications);
                if (data.settings.privacyMode !== undefined && setPrivacyMode) setPrivacyMode(data.settings.privacyMode);
                if (data.settings.customZones) {
                    setCustomZones(data.settings.customZones);
                    setUseCustomZones(true);
                }

                // Restore activities
                if (data.activities && data.activities.length > 0 && onImportActivities) {
                    onImportActivities(data.activities);
                }

                alert(`Backup hersteld! ${data.activities?.length || 0} activiteiten geïmporteerd.`);
            } catch (err) {
                console.error('Restore error:', err);
                alert('Fout bij het herstellen van backup: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    // --- CUSTOM ZONE UPDATE ---
    const updateCustomZone = (zoneIndex, field, value) => {
        const newZones = [...customZones];
        newZones[zoneIndex] = { ...newZones[zoneIndex], [field]: parseInt(value) || 0 };
        setCustomZones(newZones);
    };

    const resetToDefaultZones = () => {
        setCustomZones(calculatePowerZones(userSettings?.ftp || 200));
        setUseCustomZones(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in">

            {/* INTERVALS.ICU INTEGRATION */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700 mb-4">
                    <Activity className="text-orange-400" size={18} />
                    <h3 className="font-bold text-white">Intervals.icu Integration</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Koppel je Intervals.icu account om activiteiten te synchroniseren.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Athlete ID</label>
                        <input
                            type="text"
                            placeholder="e.g. i12345"
                            value={intervalsConfig?.athleteId || ''}
                            onChange={e => updateIntervalsConfig('athleteId', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white text-sm focus:border-orange-400 outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">API Key</label>
                        <input
                            type="password"
                            placeholder="Your API Key"
                            value={intervalsConfig?.apiKey || ''}
                            onChange={e => updateIntervalsConfig('apiKey', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white text-sm focus:border-orange-400 outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* POWER ZONES */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <SectionHeader icon={Zap} title="Power Zones (Coggan)" section="powerZones" expanded={expandedSections.powerZones} onToggle={toggleSection} color="text-yellow-400" />

                {expandedSections.powerZones && (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">
                                Automatisch berekend o.b.v. FTP: <span className="text-yellow-400 font-bold">{userSettings?.ftp || 200}W</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useCustomZones}
                                        onChange={(e) => setUseCustomZones(e.target.checked)}
                                        className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                    />
                                    Handmatig aanpassen
                                </label>
                                {useCustomZones && (
                                    <button
                                        onClick={resetToDefaultZones}
                                        className="text-xs text-orange-400 hover:text-orange-300"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {powerZones.map((zone, idx) => (
                                <div
                                    key={zone.zone}
                                    className="flex items-center gap-3 p-2 rounded bg-slate-900/50"
                                >
                                    <div
                                        className="w-3 h-8 rounded"
                                        style={{ backgroundColor: zone.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold text-sm">Z{zone.zone}</span>
                                            <span className="text-slate-300 text-sm truncate">{zone.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">{zone.description}</span>
                                    </div>
                                    {useCustomZones ? (
                                        <div className="flex items-center gap-1 text-sm">
                                            <input
                                                type="number"
                                                value={customZones?.[idx]?.min || zone.min}
                                                onChange={(e) => updateCustomZone(idx, 'min', e.target.value)}
                                                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center"
                                            />
                                            <span className="text-slate-500">-</span>
                                            <input
                                                type="number"
                                                value={customZones?.[idx]?.max || zone.max}
                                                onChange={(e) => updateCustomZone(idx, 'max', e.target.value)}
                                                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center"
                                                disabled={zone.zone === 7}
                                            />
                                            <span className="text-slate-500 text-xs">W</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-400 font-mono">
                                            {zone.min} - {zone.max === 9999 ? '∞' : zone.max}W
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* BACKUP & RESTORE */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <SectionHeader icon={Download} title="Backup & Restore" section="backup" expanded={expandedSections.backup} onToggle={toggleSection} color="text-blue-400" />

                {expandedSections.backup && (
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-slate-400">
                            Download al je data (activiteiten + instellingen) als backup of herstel een eerder gemaakte backup.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleBackup}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors"
                            >
                                <Download size={16} /> Backup Downloaden
                            </button>
                            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm cursor-pointer transition-colors">
                                <Upload size={16} /> Backup Herstellen
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleRestore}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Let op: Bij herstellen worden huidige activiteiten samengevoegd met backup.
                        </div>
                    </div>
                )}
            </div>

            {/* PRIVACY MODE */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <SectionHeader icon={privacyMode ? EyeOff : Eye} title="Privacy Modus" section="privacy" expanded={expandedSections.privacy} onToggle={toggleSection} color="text-purple-400" />

                {expandedSections.privacy && (
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-slate-400">
                            Verberg gevoelige gegevens zoals namen, locaties en exacte prestaties.
                        </p>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                            <div>
                                <span className="text-white font-medium">Privacy Modus</span>
                                <p className="text-xs text-slate-500">
                                    {privacyMode ? 'Gevoelige data is verborgen' : 'Alle data is zichtbaar'}
                                </p>
                            </div>
                            <button
                                onClick={() => setPrivacyMode && setPrivacyMode(!privacyMode)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${privacyMode ? 'bg-purple-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${privacyMode ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {privacyMode && (
                            <div className="text-xs text-purple-400 flex items-center gap-1">
                                <EyeOff size={12} />
                                Namen worden geanonimiseerd, exacte watts verborgen
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* GOALS */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <SectionHeader icon={Target} title="Jaardoelen" section="goals" expanded={expandedSections.goals} onToggle={toggleSection} color="text-green-400" />

                {expandedSections.goals && (
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-slate-400">
                            Stel je doelen in voor dit jaar om je voortgang te volgen.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">
                                    Kilometers
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="10000"
                                        value={goals?.kilometers || ''}
                                        onChange={e => setGoals && setGoals({...goals, kilometers: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white text-sm focus:border-green-400 outline-none pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">km</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">
                                    FTP Doel
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="300"
                                        value={goals?.ftp || ''}
                                        onChange={e => setGoals && setGoals({...goals, ftp: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white text-sm focus:border-green-400 outline-none pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">W</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">
                                    Gewicht Doel
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="70.0"
                                        value={goals?.weight || ''}
                                        onChange={e => setGoals && setGoals({...goals, weight: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white text-sm focus:border-green-400 outline-none pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* NOTIFICATIONS */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <SectionHeader icon={Bell} title="Notificaties" section="notifications" expanded={expandedSections.notifications} onToggle={toggleSection} color="text-red-400" />

                {expandedSections.notifications && (
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-slate-400">
                            Stel drempelwaarden in voor waarschuwingen.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div>
                                    <span className="text-white font-medium">Hoge Training Load</span>
                                    <p className="text-xs text-slate-500">Waarschuwing bij TSS boven drempel</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="150"
                                        value={notifications?.highLoadThreshold || ''}
                                        onChange={e => setNotifications && setNotifications({...notifications, highLoadThreshold: parseInt(e.target.value) || 0})}
                                        className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                                    />
                                    <span className="text-slate-500 text-xs">TSS</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div>
                                    <span className="text-white font-medium">Lage Power Output</span>
                                    <p className="text-xs text-slate-500">Waarschuwing bij NP onder drempel</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="180"
                                        value={notifications?.lowPowerThreshold || ''}
                                        onChange={e => setNotifications && setNotifications({...notifications, lowPowerThreshold: parseInt(e.target.value) || 0})}
                                        className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                                    />
                                    <span className="text-slate-500 text-xs">W</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div>
                                    <span className="text-white font-medium">Rest Day Reminder</span>
                                    <p className="text-xs text-slate-500">Waarschuwing na X opeenvolgende trainingsdagen</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="5"
                                        value={notifications?.consecutiveDaysThreshold || ''}
                                        onChange={e => setNotifications && setNotifications({...notifications, consecutiveDaysThreshold: parseInt(e.target.value) || 0})}
                                        className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                                    />
                                    <span className="text-slate-500 text-xs">dagen</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${isSaving ? 'bg-slate-600' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'}`}
                >
                    {isSaving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18}/>}
                    {isSaving ? 'Opslaan...' : 'Instellingen Opslaan'}
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
