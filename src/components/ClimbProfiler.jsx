import React, { useState, useMemo } from 'react';
import {
    Mountain,
    TrendingUp,
    Flag,
    AlertTriangle,
    Timer,
    Zap,
    Activity,
    Info
} from 'lucide-react';
import { COGGAN_ZONES } from '../cogganZones';
import { getDefaultClimb } from '../services/climbDatabase';
import ClimbSelector from './shared/ClimbSelector';
import ProfilerCharts from './profiler/ProfilerCharts';
import ProfilerInsights from './profiler/ProfilerInsights';
import ClimbComparePanel from './profiler/ClimbComparePanel';
import {
    buildSyntheticProfile,
    computeTacticalZones,
    computePowerRecommendations,
    computeClimbStats,
    estimateClimbPacingMetrics
} from '../utils/climbProfilerModel';
import {
    CLIMB_PROFILE_UPDATED_EVENT,
    formatClimbProfileSourceLabel,
    getStoredClimbProfile,
} from '../utils/climbProfileStorage.js';
import { climbfinderUrlForClimb } from '../utils/climbfinderUrl.js';
import { openExternalUrl } from '../utils/strava.js';

/** Upper FTP ratio shown on the zone bar; Z7 in data uses max≈∞ for matching — cap here so bar widths match Coggan bands. */
const ZONE_BAR_MAX_FTP_RATIO = 1.65;

function zoneBarFlexWeight(z) {
    const cappedEnd = Math.min(z.max, ZONE_BAR_MAX_FTP_RATIO);
    return Math.max(0, cappedEnd - z.min);
}

function formatClimbDuration(minutes) {
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return '—';
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    }
    return `${Math.round(minutes)} min`;
}

const ClimbProfiler = ({ userSettings, initialState, onStateChange, theme = 'light', onOpenBucketList }) => {
    const [selectedClimb, setSelectedClimb] = useState(initialState?.selectedClimb || getDefaultClimb());
    const [showPowerZones, setShowPowerZones] = useState(
        initialState?.showPowerZones !== undefined ? initialState.showPowerZones : true
    );
    const [targetIntensity, setTargetIntensity] = useState(
        typeof initialState?.targetIntensity === 'number' ? initialState.targetIntensity : 0.85
    );
    const [activityRouteProfile, setActivityRouteProfile] = useState(
        initialState?.activityRouteProfile ?? null,
    );

    const isDark = theme === 'dark';

    const [profileRevision, setProfileRevision] = useState(0);

    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({
                selectedClimb,
                showPowerZones,
                targetIntensity,
                activityRouteProfile,
            });
        }
    }, [selectedClimb, showPowerZones, targetIntensity, activityRouteProfile, onStateChange]);

    React.useEffect(() => {
        if (initialState?.selectedClimb) {
            setSelectedClimb(initialState.selectedClimb);
        }
        setActivityRouteProfile(initialState?.activityRouteProfile ?? null);
    }, [initialState?.selectedClimb?.id, initialState?.activityRouteProfile?.activityId]);

    React.useEffect(() => {
        const onUpdated = () => setProfileRevision((r) => r + 1);
        window.addEventListener(CLIMB_PROFILE_UPDATED_EVENT, onUpdated);
        return () => window.removeEventListener(CLIMB_PROFILE_UPDATED_EVENT, onUpdated);
    }, []);

    // `profileRevision` bumps when localStorage profile changes (custom event).
    void profileRevision;
    const importedProfile = getStoredClimbProfile(selectedClimb?.id);

    const profileData = useMemo(() => {
        if (importedProfile?.points?.length >= 2) {
            return importedProfile.points.map((p) => ({
                distance: p.distance ?? p.distanceKm,
                elevation: p.elevation,
                gradient: p.gradient,
                progress: p.progress ?? 0,
            }));
        }
        if (activityRouteProfile?.points?.length >= 2) {
            return activityRouteProfile.points.map((p) => ({
                distance: p.distance ?? p.distanceKm,
                elevation: p.elevation,
                gradient: p.gradient,
                progress: p.progress ?? 0,
            }));
        }
        return buildSyntheticProfile(selectedClimb);
    }, [selectedClimb, importedProfile, activityRouteProfile]);

    const usesImportedProfile = Boolean(importedProfile?.points?.length >= 2);
    const usesActivityRouteProfile = Boolean(
        !usesImportedProfile && activityRouteProfile?.points?.length >= 2,
    );
    const activityRouteSourceLabel = activityRouteProfile?.source === 'intervals'
        ? 'Intervals.icu GPS route'
        : 'Strava GPS route';
    const climbfinderLink = climbfinderUrlForClimb(selectedClimb)
        || (importedProfile?.referenceUrl?.includes('climbfinder.com') ? importedProfile.referenceUrl : null);
    const ftp = userSettings?.ftp || 250;
    const weight = userSettings?.weight || 70;
    const bikeW = userSettings?.bikeWeight || 8;
    const totalWeight = weight + bikeW;

    const powerRecommendations = useMemo(
        () => computePowerRecommendations(profileData, ftp, targetIntensity),
        [profileData, ftp, targetIntensity]
    );

    const tacticalZones = useMemo(
        () => computeTacticalZones(profileData, selectedClimb),
        [profileData, selectedClimb]
    );

    const climbStats = useMemo(
        () => computeClimbStats(profileData, selectedClimb),
        [profileData, selectedClimb]
    );

    const pacingMetrics = useMemo(
        () =>
            estimateClimbPacingMetrics({
                ftp,
                totalWeightKg: totalWeight,
                elevationM: selectedClimb.elevation,
                avgGradePct: selectedClimb.avgGrade,
                lengthKm: selectedClimb.lengthKm,
                intensityFraction: targetIntensity
            }),
        [ftp, totalWeight, selectedClimb, targetIntensity]
    );

    const intensityPct = Math.round(targetIntensity * 100);
    const zoneMarkerLeftPct = Math.min(
        100,
        Math.max(0, (targetIntensity / ZONE_BAR_MAX_FTP_RATIO) * 100)
    );

    return (
        <div className="bg-cdsurface p-5 md:p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            {usesActivityRouteProfile ? (
                <div
                    role="note"
                    className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-3 flex items-start gap-3"
                >
                    <Info size={18} className="text-sky-400 shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <p className="text-sm font-bold text-cdtext">Activity route approximation</p>
                        <p className="text-sm text-cdtext mt-1">
                            Chart uses {activityRouteSourceLabel}
                            {activityRouteProfile?.title ? ` for “${activityRouteProfile.title}”` : ''}.
                            Elevation follows your recorded climbing meters along the GPS path — not barometric segment data.
                        </p>
                    </div>
                </div>
            ) : usesImportedProfile ? (
                <div
                    role="note"
                    className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 flex items-start gap-3"
                >
                    <Info size={18} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <p className="text-sm font-bold text-cdtext">Imported elevation profile</p>
                        <p className="text-sm text-cdtext mt-1">
                            {formatClimbProfileSourceLabel(importedProfile)}
                            . Chart uses your GPX track points — suitable for tactical pacing on this climb.
                        </p>
                        {climbfinderLink && (
                            <button
                                type="button"
                                className="text-xs text-cdaccent hover:underline mt-2 font-medium"
                                onClick={() => openExternalUrl(climbfinderLink)}
                            >
                                Open Climbfinder reference
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    role="note"
                    className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-start gap-3"
                >
                    <Info size={18} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <p className="text-sm font-bold text-cdtext">Synthetic climb profile</p>
                        <p className="text-sm text-cdtext mt-1">
                            This chart is generated from average gradient, length, and elevation — not GPS or barometric
                            segment data. Import a GPX under Activities → Import Data, or open Climbfinder to export GPS.
                        </p>
                        {climbfinderLink && (
                            <button
                                type="button"
                                className="text-xs text-cdaccent hover:underline mt-2 font-medium"
                                onClick={() => openExternalUrl(climbfinderLink)}
                            >
                                Open Climbfinder page for this climb
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-cdborder pb-5">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-cdtext flex items-center gap-2">
                        <Mountain className="text-emerald-400 shrink-0" size={26} />
                        Climb Profiler
                    </h2>
                    <p className="text-sm text-cdmuted mt-1 max-w-xl">
                        {usesImportedProfile
                            ? 'Gradient and elevation from your imported GPX profile.'
                            : usesActivityRouteProfile
                                ? 'Gradient and elevation from GPS distance with climbing distributed along the route.'
                                : 'Gradient and elevation from database averages (synthetic model). Import GPX in Activities → Import Data for a real trace.'}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    {typeof onOpenBucketList === 'function' && (
                        <button
                            type="button"
                            onClick={onOpenBucketList}
                            className="text-xs font-bold text-cdaccent hover:underline"
                        >
                            Open bucket list
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-xs text-cdmuted bg-cdbg px-3 py-2 rounded-lg border border-cdborder">
                        <Info size={14} className="text-cdaccent shrink-0" />
                        <span>Model: variation around avg. gradient</span>
                    </div>
                </div>
            </div>

            <div className="bg-cdbg/50 p-4 rounded-xl border border-cdborder">
                <label className="text-[11px] text-cdmuted uppercase tracking-wider block mb-2 font-semibold">
                    Climb
                </label>
                <ClimbSelector
                    mode="single"
                    selected={selectedClimb}
                    onSelect={(climb) => {
                        setSelectedClimb(climb);
                        setActivityRouteProfile(null);
                    }}
                />
                <ClimbComparePanel
                    userSettings={userSettings}
                    primaryClimb={selectedClimb}
                    intensityFraction={targetIntensity}
                />
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    {selectedClimb.flag && (
                        <span className="text-lg" aria-hidden>
                            {selectedClimb.flag}
                        </span>
                    )}
                    <span className="text-sm text-cdtext font-medium">{selectedClimb.name}</span>
                    {selectedClimb.cat && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cdaccent/15 text-cdaccent border border-cdaccent/30">
                            {selectedClimb.cat}
                        </span>
                    )}
                    {selectedClimb.region && (
                        <span className="text-xs text-cdmuted">{selectedClimb.region}</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <TrendingUp className="w-5 h-5 text-red-400 mb-2" />
                    <div className="text-2xl font-bold text-cdtext tabular-nums">
                        {climbStats.maxGradient.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-cdmuted uppercase tracking-wide mt-1">Max. gradient</div>
                </div>
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <Mountain className="w-5 h-5 text-amber-400 mb-2" />
                    <div className="text-2xl font-bold text-cdtext tabular-nums">{selectedClimb.avgGrade}%</div>
                    <div className="text-[11px] text-cdmuted uppercase tracking-wide mt-1">Avg. gradient</div>
                </div>
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
                    <div className="text-2xl font-bold text-cdtext tabular-nums">
                        {climbStats.steepPercentage.toFixed(0)}%
                    </div>
                    <div className="text-[11px] text-cdmuted uppercase tracking-wide mt-1">Steep samples</div>
                </div>
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <Flag className="w-5 h-5 text-emerald-400 mb-2" />
                    <div className="text-2xl font-bold text-cdtext tabular-nums">{climbStats.difficultyScore}</div>
                    <div className="text-[11px] text-cdmuted uppercase tracking-wide mt-1">Difficulty index</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder md:col-span-1">
                    <div className="flex items-center gap-2 text-cdmuted text-[11px] uppercase tracking-wide font-semibold mb-2">
                        <Timer size={14} className="text-cdaccent" />
                        Estimate · Ferrari VAM
                    </div>
                    <div className="text-lg font-bold text-cdtext tabular-nums">
                        {formatClimbDuration(pacingMetrics.timeMinutes)}
                    </div>
                    <p className="text-xs text-cdmuted mt-1 leading-snug">
                        Estimated climb time at {intensityPct}% FTP ({pacingMetrics.targetPower} W), VAM ~{' '}
                        {pacingMetrics.vam.toLocaleString('nl-NL')} m/h.
                    </p>
                </div>
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <div className="flex items-center gap-2 text-cdmuted text-[11px] uppercase tracking-wide font-semibold mb-2">
                        <Zap size={14} className="text-cdaccent" />
                        W/kg (system)
                    </div>
                    <div className="text-lg font-bold text-cdtext tabular-nums">{pacingMetrics.wPerKg} W/kg</div>
                    <p className="text-xs text-cdmuted mt-1 leading-snug">
                        Body + bike ({totalWeight.toFixed(1)} kg) from settings.
                    </p>
                </div>
                <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                    <div className="flex items-center gap-2 text-cdmuted text-[11px] uppercase tracking-wide font-semibold mb-2">
                        <Activity size={14} className="text-cdaccent" />
                        Avg. speed
                    </div>
                    <div className="text-lg font-bold text-cdtext tabular-nums">{pacingMetrics.avgKmh} km/h</div>
                    <p className="text-xs text-cdmuted mt-1 leading-snug">Derived from length ÷ estimated time.</p>
                </div>
            </div>

            <div className="bg-cdbg/40 p-4 rounded-xl border border-cdborder space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="text-sm font-semibold text-cdtext" htmlFor="profiler-intensity">
                        Target intensity: {intensityPct}% FTP
                    </label>
                    <span className="text-xs text-cdmuted">
                        Advisory power and zone hints scale accordingly ({Math.round(ftp * targetIntensity)} W baseline).
                    </span>
                </div>
                <input
                    id="profiler-intensity"
                    type="range"
                    min={65}
                    max={100}
                    step={1}
                    value={intensityPct}
                    onChange={(e) => setTargetIntensity(Number(e.target.value) / 100)}
                    className="w-full accent-cdprimary h-2"
                />
                <div className="flex justify-between text-[10px] text-cdmuted uppercase tracking-wide">
                    <span>65% endurance / tempo</span>
                    <span>100% threshold</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cdtext uppercase tracking-wide">
                        Coggan zones (relative to FTP)
                    </span>
                    <span className="text-[10px] text-cdmuted">
                        0–{Math.round(ZONE_BAR_MAX_FTP_RATIO * 100)}% FTP · marker = target {intensityPct}%
                    </span>
                </div>
                <div className="relative h-3 rounded-full border border-cdborder overflow-hidden">
                    <div className="flex h-full w-full">
                        {COGGAN_ZONES.map((z) => (
                            <div
                                key={z.name}
                                className="h-full first:rounded-l-full last:rounded-r-full"
                                style={{
                                    flexGrow: zoneBarFlexWeight(z),
                                    flexBasis: 0,
                                    backgroundColor: z.color,
                                    opacity: 0.88
                                }}
                                title={z.name}
                            />
                        ))}
                    </div>
                    <div
                        className="absolute top-0 bottom-0 w-0.5 z-10 bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)] pointer-events-none rounded-full"
                        style={{ left: `calc(${zoneMarkerLeftPct}% - 1px)` }}
                    />
                </div>
                <p className="text-[10px] text-cdmuted">
                    Zones are indicative; actual distribution depends on profile and fitness.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-1">
                <label className="flex items-center gap-2 text-sm text-cdtext cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showPowerZones}
                        onChange={() => setShowPowerZones(!showPowerZones)}
                        className="accent-cdprimary rounded border-cdborder"
                    />
                    Show power advice in tooltip
                </label>
            </div>

            <ProfilerCharts
                profileData={profileData}
                powerRecommendations={powerRecommendations}
                showPowerZones={showPowerZones}
                selectedClimb={selectedClimb}
                isDark={isDark}
            />

            <ProfilerInsights
                tacticalZones={tacticalZones}
                ftp={ftp}
                intensityPct={intensityPct}
                pacingMetrics={pacingMetrics}
            />
        </div>
    );
};

export default ClimbProfiler;
