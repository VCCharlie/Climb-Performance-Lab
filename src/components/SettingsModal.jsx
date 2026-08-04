import React, { useState, useEffect } from 'react';
import { Settings, Activity, RefreshCw, Save, Moon, Sun, Shield, Target, Bell, Database, Download, Upload, Zap, X, Link, Unlink, List } from 'lucide-react';
import { calculatePowerZones } from '../utils';
import { DEFAULT_RECOVERY_TSS } from '../config';
import {
    FTP_SOURCE_ESTIMATED_20,
    FTP_SOURCE_ESTIMATED_60,
    FTP_SOURCE_MANUAL,
    FTP_LOOKBACK_6_MONTHS,
    FTP_LOOKBACK_RECENT,
    FTP_ESTIMATE_LOOKBACK_DAYS_RECENT,
    estimateProfileFtpFromActivities,
    estimateProfileFtp60FromActivities,
    normalizeFtpSource,
    normalizeFtpLookbackWindow,
    resolveEffectiveProfileFtp,
    describeFtpLookbackWindow,
} from '../utils/profileFtp';
import { formatDateDDMMYYYY } from '../utils/formatters';
import { buildBackupExport, validateBackupPayload, describeBackupImport, BACKUP_MAX_BYTES } from '../utils/backupSchema';
import { Button, IconButton, inputBaseClass, inputNumberClass, modalScrimClass, modalPanelClass, modalHeaderClass, modalFooterClass } from './ui';
import ModalPortal from './ui/ModalPortal';
import { useActivities } from '../hooks/useActivities';
import {
    formatBikeComputerProfileTitlesForInput,
    parseBikeComputerProfileTitlesInput,
} from '../utils/bikeComputerProfileTitles';
import QuickLinksSettings from './settings/QuickLinksSettings';
import {
    TERRAIN_PROFILE_FLAT,
    TERRAIN_PROFILE_HILLY,
    TERRAIN_PROFILE_MIXED,
    normalizeTerrainProfile,
} from '../utils/climbingTerrainProfile';

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
    stravaConfig, stravaAuth,
    isSignedIn = false,
}) => {
    const { activities, restoreFromBackup } = useActivities();
    const ftpLookbackWindow = normalizeFtpLookbackWindow(userSettings);
    const terrainProfile = normalizeTerrainProfile(userSettings.terrainProfile);
    const ftpLookbackLabel = describeFtpLookbackWindow(userSettings);
    const ftpEstimate20 = estimateProfileFtpFromActivities(activities, undefined, userSettings);
    const ftpEstimate60 = estimateProfileFtp60FromActivities(activities, undefined, userSettings);
    const ftpSource = normalizeFtpSource(userSettings);
    const effectiveFtpForZones = resolveEffectiveProfileFtp(userSettings, activities).ftp || (Number(userSettings.ftp) || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [profileTitlesText, setProfileTitlesText] = useState(() =>
        formatBikeComputerProfileTitlesForInput(userSettings.bikeComputerProfileTitles),
    );

    useEffect(() => {
        setProfileTitlesText(formatBikeComputerProfileTitlesForInput(userSettings.bikeComputerProfileTitles));
    }, [userSettings.bikeComputerProfileTitles]);

    const handleSave = async () => {
        setIsSaving(true);
        updateUserSettings(
            'bikeComputerProfileTitles',
            parseBikeComputerProfileTitlesInput(profileTitlesText),
        );
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

                        {/* BANNER QUICK LINKS */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <Link className="text-cdaccent" size={18} />
                                <h3 className="font-bold text-cdtext">Banner quick links</h3>
                            </div>
                            <QuickLinksSettings
                                quickLinks={userSettings.quickLinks}
                                onChange={(links) => updateUserSettings('quickLinks', links)}
                            />
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
                                <div className="pt-2 border-t border-cdborder/30 mt-2">
                                    <label className="block text-xs font-semibold mb-1 text-cdmuted">
                                        Gemini API Key (AI Coach)
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={120}
                                        placeholder="Your Google AI Studio API key"
                                        value={userSettings.geminiApiKey || ''}
                                        onChange={(e) => updateUserSettings('geminiApiKey', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <p className="text-xs text-cdmuted mt-1">
                                        Stored on this device by default. Enables natural-language answers in Ask the Coach.
                                        Without a key, the coach uses local rule-based analysis.
                                    </p>
                                    <label className="mt-2 flex items-start gap-2 text-xs text-cdtext cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 accent-cdaccent"
                                            checked={Boolean(userSettings.syncGeminiKeyToCloud)}
                                            disabled={!isSignedIn}
                                            onChange={(e) => updateUserSettings('syncGeminiKeyToCloud', e.target.checked)}
                                        />
                                        <span>
                                            Sync this key across devices (encrypted in cloud when signed in)
                                            {!isSignedIn && (
                                                <span className="block text-cdmuted mt-0.5">Sign in with Google to enable.</span>
                                            )}
                                        </span>
                                    </label>
                                    <label className="mt-3 flex items-start gap-2 text-xs text-cdtext cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 accent-cdaccent"
                                            checked={Boolean(userSettings.coachFullActivityLog)}
                                            onChange={(e) => updateUserSettings('coachFullActivityLog', e.target.checked)}
                                        />
                                        <span>
                                            Send full activity log to AI Coach (all rides, not just the latest 500)
                                            <span className="block text-cdmuted mt-0.5">
                                                Uses more API tokens per question (~2–4×). Yearly totals are always complete either way.
                                            </span>
                                        </span>
                                    </label>
                                    <p className="text-xs text-cdmuted mt-1">
                                        Free key at{' '}
                                        <a
                                            href="https://aistudio.google.com/apikey"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cdaccent hover:underline"
                                        >
                                            Google AI Studio
                                        </a>.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-cdborder/30">
                                <p className="text-xs font-semibold text-cdtext mb-1">Activity sync</p>
                                <p className="text-xs text-cdmuted leading-snug">
                                    Use the <strong className="text-cdtext">Activities</strong> tab for Fetch &amp; merge
                                    (date range, sport filters, Strava enrichment, and refresh selected rows).
                                    On <strong className="text-cdtext">Dashboard</strong>, the header refresh button syncs
                                    today only. Nightly GitHub Actions sync above still runs in the background when configured.
                                </p>
                            </div>
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
                                    <p className="text-xs text-cdmuted">
                                        Strava credentials are managed on the server (GitHub Secrets / Cloud Run).
                                        Connect once — nightly sync and enrichment use a secure refresh token automatically.
                                    </p>
                                    <p className="text-xs text-cdmuted">
                                        In your{' '}
                                        <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                            Strava API settings
                                        </a>
                                        , set the Authorization Callback Domain to your app host and redirect URI to:{' '}
                                        <code className="bg-cdborder px-1 rounded text-[10px]">{window.location.origin + window.location.pathname}</code>
                                    </p>
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
                                    <div className="pt-3 border-t border-cdborder/40 space-y-2">
                                        <label className="block text-xs font-bold text-cdtext" htmlFor="bike-computer-profiles">
                                            Bike computer profile names
                                        </label>
                                        <p className="text-[11px] text-cdmuted leading-snug">
                                            Comma-separated names from your head unit (Garmin/Wahoo bike profiles).
                                            When Intervals uses one of these as the activity title, Climb Lab prefers the Strava name instead.
                                            Update this list when you add a new bike profile on your computer.
                                        </p>
                                        <input
                                            id="bike-computer-profiles"
                                            type="text"
                                            maxLength={200}
                                            placeholder="e.g. SUPERIOR, AETHOS"
                                            value={profileTitlesText}
                                            onChange={(e) => setProfileTitlesText(e.target.value)}
                                            onBlur={() => {
                                                updateUserSettings(
                                                    'bikeComputerProfileTitles',
                                                    parseBikeComputerProfileTitlesInput(profileTitlesText),
                                                );
                                            }}
                                            className={fieldClass}
                                        />
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
                                <div className="md:col-span-3">
                                    <p className="text-[10px] font-semibold text-cdmuted mb-2">FTP source</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('ftpSource', FTP_SOURCE_MANUAL)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                ftpSource === FTP_SOURCE_MANUAL
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            Manual FTP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('ftpSource', FTP_SOURCE_ESTIMATED_20)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                ftpSource === FTP_SOURCE_ESTIMATED_20
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            From 20 min peak
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('ftpSource', FTP_SOURCE_ESTIMATED_60)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                ftpSource === FTP_SOURCE_ESTIMATED_60
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            From 60 min peak
                                        </button>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-[10px] font-semibold text-cdmuted mb-2">Estimate window</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateUserSettings('ftpLookbackWindow', FTP_LOOKBACK_6_MONTHS)}
                                                className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                    ftpLookbackWindow === FTP_LOOKBACK_6_MONTHS
                                                        ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                        : 'border-cdborder text-cdmuted hover:text-cdtext'
                                                }`}
                                            >
                                                Last 6 months
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateUserSettings('ftpLookbackWindow', FTP_LOOKBACK_RECENT)}
                                                className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                    ftpLookbackWindow === FTP_LOOKBACK_RECENT
                                                        ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                        : 'border-cdborder text-cdmuted hover:text-cdtext'
                                                }`}
                                            >
                                                Last {FTP_ESTIMATE_LOOKBACK_DAYS_RECENT} days
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-cdmuted mt-2 leading-snug">
                                            {ftpLookbackWindow === FTP_LOOKBACK_RECENT
                                                ? 'Recent-form window (42–90 day range). Best for current fitness when you train and test often.'
                                                : 'Balanced window. Ignores old all-time peaks but keeps seasonal bests from the past half year.'}
                                        </p>
                                    </div>
                                    <div className="mt-3 rounded-lg border border-cdborder/50 bg-cdsurfacehigh/20 p-3 space-y-3">
                                        <p className="text-[10px] font-semibold text-cdmuted uppercase tracking-wide">
                                            Estimated from activity log ({ftpLookbackLabel})
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-cdtext">20 min peak</p>
                                                {ftpEstimate20.ftp ? (
                                                    <>
                                                        <p className="text-cdtext font-semibold">
                                                            {ftpEstimate20.best20Min} W peak → {ftpEstimate20.ftp} W FTP (×0.95)
                                                        </p>
                                                        <p className="text-[10px] text-cdmuted">
                                                            {ftpEstimate20.activityDate
                                                                ? formatDateDDMMYYYY(ftpEstimate20.activityDate)
                                                                : 'Unknown date'}
                                                            {' · '}
                                                            confidence: {ftpEstimate20.confidence}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-[10px] text-cdmuted">
                                                        No reliable 20-minute peak in the {ftpLookbackLabel}.
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-cdtext">60 min peak</p>
                                                {ftpEstimate60.ftp ? (
                                                    <>
                                                        <p className="text-cdtext font-semibold">
                                                            {ftpEstimate60.best60Min} W peak → {ftpEstimate60.ftp} W FTP
                                                        </p>
                                                        <p className="text-[10px] text-cdmuted">
                                                            {ftpEstimate60.activityDate
                                                                ? formatDateDDMMYYYY(ftpEstimate60.activityDate)
                                                                : 'Unknown date'}
                                                            {' · '}
                                                            confidence: {ftpEstimate60.confidence}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-[10px] text-cdmuted">
                                                        No reliable 60-minute peak in the {ftpLookbackLabel}.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {ftpSource !== FTP_SOURCE_MANUAL && (
                                            <p className="text-[10px] text-cdmuted leading-snug border-t border-cdborder/30 pt-2">
                                                {ftpSource === FTP_SOURCE_ESTIMATED_20 && ftpEstimate20.ftp
                                                    ? `Active FTP: ${ftpEstimate20.ftp} W (from 20 min peak). Manual value below is fallback when no peak is available.`
                                                    : ftpSource === FTP_SOURCE_ESTIMATED_60 && ftpEstimate60.ftp
                                                        ? `Active FTP: ${ftpEstimate60.ftp} W (from 60 min peak). Manual value below is fallback when no peak is available.`
                                                        : 'Selected estimate has no reliable peak yet — manual FTP is used until data is available.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted text-blue-500" htmlFor="settings-ftp">
                                        {ftpSource === FTP_SOURCE_MANUAL ? 'Current FTP (W)' : 'Manual FTP fallback (W)'}
                                    </label>
                                    <input
                                        id="settings-ftp"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={userSettings.ftp ?? ''}
                                        onChange={(e) => updateUserSettings('ftp', Number(e.target.value))}
                                        className={inputNumberClass}
                                    />
                                    {ftpSource !== FTP_SOURCE_MANUAL && effectiveFtpForZones > 0 && (
                                        <p className="text-[9px] text-cdmuted mt-1">
                                            Active value: {effectiveFtpForZones} W
                                            {ftpSource === FTP_SOURCE_ESTIMATED_20 ? ' (20 min estimate)' : ' (60 min estimate)'}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted" htmlFor="settings-body-weight">
                                        Body Weight (kg)
                                    </label>
                                    <input
                                        id="settings-body-weight"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={userSettings.weight ?? ''}
                                        onChange={(e) => updateUserSettings('weight', Number(e.target.value))}
                                        className={inputNumberClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted" htmlFor="settings-bike-weight">
                                        Bike Weight (kg)
                                    </label>
                                    <input
                                        id="settings-bike-weight"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={userSettings.bikeWeight ?? ''}
                                        onChange={(e) => updateUserSettings('bikeWeight', Number(e.target.value))}
                                        className={inputNumberClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted" htmlFor="settings-weekly-hours">
                                        Weekly hours budget (AI Coach)
                                    </label>
                                    <select
                                        id="settings-weekly-hours"
                                        value={userSettings.weeklyHoursTarget ?? 5}
                                        onChange={(e) => updateUserSettings('weeklyHoursTarget', Number(e.target.value))}
                                        className={inputNumberClass}
                                    >
                                        <option value={4}>4 h / week</option>
                                        <option value={5}>5 h / week</option>
                                        <option value={6}>6 h / week</option>
                                        <option value={7}>7 h / week</option>
                                    </select>
                                    <p className="text-[9px] text-cdmuted mt-1 leading-snug">
                                        Drives TSS targets and fluid workout suggestions on the Training tab.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted" htmlFor="settings-birth-year">
                                        Birth year (optional)
                                    </label>
                                    <input
                                        id="settings-birth-year"
                                        type="number"
                                        min={1930}
                                        max={new Date().getFullYear()}
                                        step={1}
                                        placeholder="e.g. 1978"
                                        value={userSettings.birthYear ?? ''}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            updateUserSettings('birthYear', raw ? Number(raw) : null);
                                        }}
                                        className={inputNumberClass}
                                    />
                                    <p className="text-[9px] text-cdmuted mt-1 leading-snug">
                                        Used for long-term power charts — plot peaks by age as well as calendar year.
                                    </p>
                                </div>
                                <div className="md:col-span-3">
                                    <p className="text-[10px] font-semibold text-cdmuted mb-2">
                                        Home terrain (climbing readiness)
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('terrainProfile', TERRAIN_PROFILE_HILLY)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                terrainProfile === TERRAIN_PROFILE_HILLY
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            Hilly / mountains
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('terrainProfile', TERRAIN_PROFILE_FLAT)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                terrainProfile === TERRAIN_PROFILE_FLAT
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            Flat / coastal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateUserSettings('terrainProfile', TERRAIN_PROFILE_MIXED)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
                                                terrainProfile === TERRAIN_PROFILE_MIXED
                                                    ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                                            }`}
                                        >
                                            Mixed
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-cdmuted mt-2 leading-snug">
                                        Adjusts elevation targets and coach hints on Dashboard → Overview. Choose
                                        Flat / coastal for polder or beach riding (dunes, dijken).
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-cdborder/30 space-y-3">
                                <div>
                                    <p className="text-[11px] font-semibold text-cdtext mb-1">Training volume (yearly)</p>
                                    <p className="text-[10px] text-cdmuted leading-snug mb-3">
                                        Dashboard training goals use these yearly targets. Weekly goals are yearly ÷ 52; monthly goals are yearly ÷ 12.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Yearly distance (km)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={userSettings.goals?.yearlyKm ?? ''}
                                                onChange={(e) =>
                                                    updateUserSettings('goals', {
                                                        ...userSettings.goals,
                                                        yearlyKm: Number(e.target.value),
                                                    })
                                                }
                                                className={inputNumberClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Yearly moving time (h)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.5}
                                                value={userSettings.goals?.yearlyMovingTimeHours ?? ''}
                                                onChange={(e) =>
                                                    updateUserSettings('goals', {
                                                        ...userSettings.goals,
                                                        yearlyMovingTimeHours: Number(e.target.value),
                                                    })
                                                }
                                                className={inputNumberClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Yearly elevation (m)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={100}
                                                value={userSettings.goals?.yearlyElevationM ?? ''}
                                                onChange={(e) =>
                                                    updateUserSettings('goals', {
                                                        ...userSettings.goals,
                                                        yearlyElevationM: Number(e.target.value),
                                                    })
                                                }
                                                className={inputNumberClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Target FTP</label>
                                        <div className="flex gap-1">
                                            <input type="number" value={userSettings.goals?.targetFtp || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetFtp: Number(e.target.value) })} className={inputNumberClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Target weight (kg)</label>
                                        <div className="flex gap-1">
                                            <input type="number" value={userSettings.goals?.targetWeight || ''} onChange={e => updateUserSettings('goals', { ...userSettings.goals, targetWeight: Number(e.target.value) })} className={inputNumberClass} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ACTIVITY LOG */}
                        <div className={sectionClass}>
                            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                                <List className="text-cdaccent" size={18} />
                                <h3 className="font-bold text-cdtext">Activity Log</h3>
                            </div>
                            <div className="max-w-xs">
                                <label className="block text-[10px] font-semibold mb-1 text-cdmuted">
                                    Recovery load (TSS)
                                </label>
                                <p className="text-xs text-cdmuted mb-2 leading-relaxed">
                                    Used by <strong className="text-cdtext font-medium">Mark recovery</strong> in the Activity Log bulk toolbar when you want easy rides to count as light training stress.
                                </p>
                                <input
                                    type="number"
                                    min={0}
                                    max={999}
                                    value={userSettings.recoveryTss ?? DEFAULT_RECOVERY_TSS}
                                    onChange={(e) => updateUserSettings('recoveryTss', Number(e.target.value))}
                                    className={inputNumberClass}
                                />
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
                                    <input type="number" value={userSettings.notifications?.highLoad || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, highLoad: Number(e.target.value) })} className={inputNumberClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Low Power (NP) &lt;</label>
                                    <input type="number" value={userSettings.notifications?.lowPower || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, lowPower: Number(e.target.value) })} className={inputNumberClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Min Weight &lt;</label>
                                    <input type="number" value={userSettings.notifications?.minWeight || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, minWeight: Number(e.target.value) })} className={inputNumberClass} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-semibold mb-1 text-cdmuted`}>Rest Day (Days)</label>
                                    <input type="number" value={userSettings.notifications?.restDay || ''} onChange={e => updateUserSettings('notifications', { ...userSettings.notifications, restDay: Number(e.target.value) })} className={inputNumberClass} />
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
                                {(calculatePowerZones(effectiveFtpForZones || 250)).map((zone, idx) => (
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