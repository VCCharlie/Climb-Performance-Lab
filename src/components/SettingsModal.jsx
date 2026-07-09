import React, { useState } from 'react';
import { Settings, Activity, RefreshCw, Save, Moon, Sun, Shield, Target, Bell, Database, Download, Upload, Zap, X, Link, Unlink } from 'lucide-react';
import { calculatePowerZones } from '../utils';
import SyncPanel from './data-hub/SyncPanel';
import { buildBackupExport, validateBackupPayload, describeBackupImport, BACKUP_MAX_BYTES } from '../utils/backupSchema';
import { Button, IconButton, inputBaseClass, modalScrimClass, modalPanelClass, modalHeaderClass, modalFooterClass } from './ui';
import ModalPortal from './ui/ModalPortal';
import { useActivities } from '../hooks/useActivities';

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
    backupExtras, onImportBackup, onCleanupCloudTokens,
    syncState,
    stravaConfig, updateStravaConfig, stravaAuth
}) => {
    const { activities, syncFromIntervals, restoreFromBackup } = useActivities();
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
                const count = await syncFromIntervals(newRides);
                alert(`Sync successful! Handled ${count} activities.`);
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

    const isDark = theme === 'dark';
    const sectionClass = 'rounded-cdlg border border-cdborder bg-cdsurface p-6';
    const fieldClass = inputBaseClass;

    // 1. BACKUP & EXPORT FUNCTIE
    const handleExport = () => {
        const dataStr = JSON.stringify(buildBackupExport({ activities, ...backupExtras }), null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `climb_lab_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > BACKUP_MAX_BYTES) {
            alert(`Backup file is too large (max ${Math.round(BACKUP_MAX_BYTES / (1024 * 1024))} MB).`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const validation = validateBackupPayload(data);
                if (!validation.ok) {
                    alert('Invalid backup file: ' + validation.error);
                    return;
                }
                const sections = describeBackupImport(data);
                const message = sections.length > 0
                    ? `Import backup?\n\nThis will overwrite:\n• ${sections.join('\n• ')}`
                    : 'Import backup?';
                if (!window.confirm(message)) return;
                if (data.activities) restoreFromBackup(data.activities);
                if (onImportBackup) onImportBackup(data);
            } catch (err) {
                alert('Error reading file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleCleanupCloudTokens = async () => {
        if (!onCleanupCloudTokens) return;
        const confirmed = window.confirm(
            'Remove OAuth tokens from the cloud database?\n\n'
            + 'Your local Strava connection stays intact. '
            + 'Use this after a security update if tokens were previously stored in Firestore.',
        );
        if (!confirmed) return;
        await onCleanupCloudTokens();
    };


    return (
        <ModalPortal>
        <div className={modalScrimClass}>
            <div className={modalPanelClass} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">

                <div className={modalHeaderClass}>
                    <h2 id="settings-modal-title" className="text-xl font-bold text-cdtext flex items-center gap-2">
                        <Settings className="text-cdmuted" aria-hidden /> Settings & Configuration
                    </h2>
                    <IconButton variant="text" onClick={onClose} aria-label="Close modal">
                        <X size={22} />
                    </IconButton>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">

                    {/* KOLOM 1: ALGEMEEN & PRIVACY */}
                    <div className="space-y-6">
                        {/* VISUAL & PRIVACY */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                {isDark ? <Moon className="text-blue-400" size={18} /> : <Sun className="text-yellow-500" size={18} />}
                                <h3 className="font-bold text-cdtext">Appearance & Privacy</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-cdtext">Black/White Mode</p>
                                        <p className="text-xs text-cdmuted">Switch between light and dark themes.</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isDark}
                                        aria-label="Toggle Black/White Mode"
                                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full cd-transition cd-focus-ring ${isDark ? 'bg-cdsurfacehigh' : 'bg-cdbrand'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-1' : 'translate-x-6'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-cdborder/30 pt-4">
                                    <div>
                                        <p className="text-sm font-bold text-cdtext flex items-center gap-2"><Shield size={14} /> Privacy Mode</p>
                                        <p className="text-xs text-cdmuted">Hide weight and FTP in the header.</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={userSettings.privacyMode}
                                        aria-label="Toggle Privacy Mode"
                                        onClick={() => updateUserSettings('privacyMode', !userSettings.privacyMode)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full cd-transition cd-focus-ring ${userSettings.privacyMode ? 'bg-cdgreen' : 'bg-cdsurfacehigh'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white cd-transition ${userSettings.privacyMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* INTERVALS INTEGRATION */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Activity className="text-orange-400" size={18} />
                                <h3 className="font-bold text-cdtext">Intervals.icu Sync</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className={`block text-xs font-semibold mb-1 text-cdmuted`}>Athlete ID</label>
                                    <input type="text" maxLength={30} value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className={fieldClass} />
                                </div>
                                <div className="pt-2">
                                    <label className={`block text-xs font-semibold mb-1 text-cdmuted`}>
                                        API Key
                                        <span className="text-cdmuted font-normal ml-1 normal-case">(optional on this device)</span>
                                    </label>
                                    <input type="password" maxLength={100} value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className={fieldClass} />
                                    <p className="text-xs text-cdmuted mt-1">
                                        Leave empty to sync via the secure cloud function (same credentials as nightly GitHub Actions sync).
                                        Add a key here only if you need direct browser access to Intervals.icu.
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-cdborder/30 mt-2">
                                    <p className="text-xs font-semibold text-cdtext mb-1">Nightly server sync</p>
                                    <p className="text-xs text-cdmuted mb-2">
                                        Automated sync uses repository secrets (<code className="bg-cdborder px-1 rounded">INTERVALS_API_KEY</code>).
                                        Trigger a manual run on GitHub:
                                    </p>
                                    <a
                                        href="https://github.com/VCCharlie/Climb-Performance-Lab/actions/workflows/nightly-sync.yml"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-cdaccent hover:underline inline-flex items-center gap-1"
                                    >
                                        Open GitHub Actions workflow
                                    </a>
                                </div>
                                {/* OpenWeatherMap API Key */}
                                <div className="pt-2 border-t border-cdborder/30 mt-2">
                                    <label className={`block text-xs font-semibold mb-1 text-cdmuted`}>
                                        OpenWeatherMap API Key
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={100}
                                        placeholder="Your OpenWeather API key"
                                        value={userSettings.openweatherApiKey || ''}
                                        onChange={e => updateUserSettings('openweatherApiKey', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <p className="text-xs text-cdmuted mt-1">
                                        Stored on this device only (not synced to the cloud). Enter once per browser.
                                    </p>
                                    <p className="text-xs text-cdmuted mt-1">
                                        Free key at{' '}
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
                            <div className={sectionClass}>
                                <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                    <span className="text-orange-400"><StravaIcon size={18} /></span>
                                    <h3 className="font-bold text-cdtext">Strava connection</h3>
                                    {stravaAuth.isConnected && (
                                        <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                            <Link size={10} /> Connected
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 text-cdmuted`}>Client ID</label>
                                        <input
                                            type="text"
                                            maxLength={30}
                                            placeholder="12345"
                                            value={stravaConfig?.client_id || ''}
                                            onChange={e => updateStravaConfig('client_id', e.target.value)}
                                            className={fieldClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 text-cdmuted`}>Client Secret</label>
                                        <input
                                            type="password"
                                            maxLength={100}
                                            placeholder="••••••••••••••••"
                                            value={stravaConfig?.client_secret || ''}
                                            onChange={e => updateStravaConfig('client_secret', e.target.value)}
                                            className={fieldClass}
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
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Database className="text-blue-400" size={18} />
                                <h3 className="font-bold text-cdtext">Backup & Data</h3>
                            </div>
                            <p className="text-xs text-cdmuted mb-3">
                                Export may include API keys and tokens in plain text — store the file securely.
                            </p>
                            <div className="flex gap-3">
                                <Button type="button" variant="tonal" className="flex-1" onClick={handleExport}>
                                    <Download size={14} aria-hidden /> Export JSON
                                </Button>
                                <label className="flex-1 cursor-pointer">
                                    <input type="file" accept=".json" onChange={handleImportFile} className="sr-only" />
                                    <span className="inline-flex w-full items-center justify-center gap-2 h-10 px-4 text-sm font-semibold rounded-cdmd bg-cdprimarycontainer text-cdonprimarycontainer hover:brightness-95 cd-transition">
                                        <Upload size={14} aria-hidden /> Import JSON
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* CLOUD SECURITY */}
                        {onCleanupCloudTokens && (
                            <div className={sectionClass}>
                                <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                    <Shield className="text-cdgreen" size={18} />
                                    <h3 className="font-bold text-cdtext">Cloud Security</h3>
                                </div>
                                <p className="text-xs text-cdmuted mb-3">
                                    OAuth tokens are kept on this device only. If older saves stored tokens in the cloud,
                                    use the button below to remove them without disconnecting Strava locally.
                                </p>
                                <Button
                                    type="button"
                                    variant="tonal"
                                    className="w-full"
                                    onClick={handleCleanupCloudTokens}
                                >
                                    Remove stored tokens from cloud
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* KOLOM 2: DOELEN & ZONES */}
                    <div className="space-y-6">
                        {/* DOELEN & PROFILE */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Target className="text-red-400" size={18} />
                                <h3 className="font-bold text-cdtext">Performance & Goals</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted text-blue-500`}>Current FTP (W)</label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => updateUserSettings('ftp', (userSettings.ftp || 250) - 1)} className="p-2 rounded-cdmd bg-cdsurfacehigh hover:bg-cdborder cd-transition cd-focus-ring">-</button>
                                        <input type="number" value={userSettings.ftp || ''} onChange={e => updateUserSettings('ftp', Number(e.target.value))} className={`${fieldClass} text-center font-bold`} />
                                        <button type="button" onClick={() => updateUserSettings('ftp', (userSettings.ftp || 250) + 1)} className="p-2 rounded-cdmd bg-cdsurfacehigh hover:bg-cdborder cd-transition cd-focus-ring">+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Body Weight (kg)</label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => updateUserSettings('weight', parseFloat(((userSettings.weight || 70) - 0.1).toFixed(1)))} className="p-2 rounded-cdmd bg-cdsurfacehigh hover:bg-cdborder cd-transition cd-focus-ring">-</button>
                                        <input type="number" value={userSettings.weight || ''} onChange={e => updateUserSettings('weight', Number(e.target.value))} className={`${fieldClass} text-center`} />
                                        <button type="button" onClick={() => updateUserSettings('weight', parseFloat(((userSettings.weight || 70) + 0.1).toFixed(1)))} className="p-2 rounded-cdmd bg-cdsurfacehigh hover:bg-cdborder cd-transition cd-focus-ring">+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Bike Weight (kg)</label>
                                    <div className="flex items-center gap-1">
                                        <input type="number" step="0.1" value={userSettings.bikeWeight || ''} onChange={e => updateUserSettings('bikeWeight', Number(e.target.value))} className={`${fieldClass} text-center`} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-cdborder/30">
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Yearly KM</label>
                                    <input type="number" value={userSettings.goals?.yearlyKm || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, yearlyKm: Number(e.target.value) })} className={fieldClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Target FTP</label>
                                    <div className="flex gap-1">
                                        <input type="number" value={userSettings.goals?.targetFtp || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetFtp: Number(e.target.value) })} className={fieldClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Target Kg</label>
                                    <div className="flex gap-1">
                                        <input type="number" value={userSettings.goals?.targetWeight || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetWeight: Number(e.target.value) })} className={fieldClass} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NOTIFICATIE DREMPELS (UITGEBREID) */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Bell className="text-yellow-400" size={18} />
                                <h3 className="font-bold text-cdtext">Notification Thresholds</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>High Load (TSS) &gt;</label>
                                    <input type="number" value={userSettings.notifications?.highLoad || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, highLoad: Number(e.target.value) })} className={fieldClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Low Power (NP) &lt;</label>
                                    <input type="number" value={userSettings.notifications?.lowPower || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, lowPower: Number(e.target.value) })} className={fieldClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Min Weight &lt;</label>
                                    <input type="number" value={userSettings.notifications?.minWeight || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, minWeight: Number(e.target.value) })} className={fieldClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Rest Day (Days)</label>
                                    <input type="number" value={userSettings.notifications?.restDay || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, restDay: Number(e.target.value) })} className={fieldClass} />
                                </div>
                            </div>
                        </div>

                        {/* CUSTOM POWER ZONES (LOCKED TO COGGAN) */}
                        <div className={sectionClass}>
                            <div className="flex items-center justify-between pb-2 border-b border-cdborder/50 mb-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-yellow-400" size={18} />
                                    <h3 className="font-bold text-cdtext">Power Zones (Coggan)</h3>
                                </div>
                                <span className="text-xs text-cdmuted italic">
                                    Auto-calculated based on FTP
                                </span>
                            </div>

                            <div className="space-y-2">
                                {(calculatePowerZones(userSettings.ftp || 250)).map((zone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></div>
                                        <span className="w-24 text-xs font-bold text-cdtext">{zone.label}</span>

                                        <div className="flex-1 text-right text-xs font-mono opacity-80 text-cdmuted">
                                            {zone.min} - {zone.max < 9999 ? zone.max : '∞'} W
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className={modalFooterClass}>
                    <Button type="button" variant="text" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        variant="success"
                        onClick={handleSave}
                        disabled={isSaving}
                        loading={isSaving}
                    >
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </Button>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
};

export default SettingsModal;