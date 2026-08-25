import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { X, Calendar, Clock, MapPin, Zap, ExternalLink, Mountain, TrendingUp, Loader2, AlertCircle, Star, Bike, Trophy, Crown, Heart } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { formatSegmentTime, navigateToStravaSegment, stravaActivityUrl, stravaFlybyUrl, openExternalUrl, openStravaFlyby, resolveFlybyStravaId } from '../../utils/strava';
import {
    activityEfficiencyFactor,
    activityVariabilityIndex,
} from '../../utils/rideInsights';
import { decouplingStatusLabel, describeRideDecouplingInterpretation } from '../../utils/coach/aerobicDecoupling';
import { describeRideDriftEligibility, driftProfileLabel } from '../../utils/coach/rideDurability';
import ZoneMetricCell from './ZoneMetricCell';
import NormPowerCell from './NormPowerCell';
import ModalPortal from '../ui/ModalPortal';
import { useModalA11y } from '../../hooks/useModalA11y';

const StravaMap = lazy(() => import('./StravaMap'));

// Strava logo SVG
const StravaIcon = ({ size = 14 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

function DriftDetailBlock({
    title,
    pct,
    efFirst,
    efSecond,
    status,
    source,
    analyzedAt,
    caption,
}) {
    if (!Number.isFinite(Number(pct))) return null;

    const insight = describeRideDecouplingInterpretation({
        decoupling_pct: pct,
        decoupling_status: status,
    });

    return (
        <div>
            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" /> {title}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-cdborder/30 p-2 rounded text-center">
                    <div className="text-xs text-cdmuted">Drift</div>
                    <div className="font-bold text-cdtext text-base tabular-nums">
                        {Number(pct).toFixed(1)}%
                    </div>
                </div>
                {Number.isFinite(Number(efFirst)) && (
                    <div className="bg-cdborder/30 p-2 rounded text-center" title="Efficiency factor in the first half of the ride">
                        <div className="text-xs text-cdmuted">EF 1st half</div>
                        <div className="font-bold text-cdtext text-base tabular-nums">
                            {Number(efFirst).toFixed(2)}
                        </div>
                    </div>
                )}
                {Number.isFinite(Number(efSecond)) && (
                    <div className="bg-cdborder/30 p-2 rounded text-center" title="Efficiency factor in the second half of the ride">
                        <div className="text-xs text-cdmuted">EF 2nd half</div>
                        <div className="font-bold text-cdtext text-base tabular-nums">
                            {Number(efSecond).toFixed(2)}
                        </div>
                    </div>
                )}
                {status && (
                    <div className="bg-cdborder/30 p-2 rounded text-center col-span-2 md:col-span-1">
                        <div className="text-xs text-cdmuted">Status</div>
                        <div className="font-bold text-cdtext text-[11px] leading-snug">
                            {decouplingStatusLabel(status)}
                        </div>
                    </div>
                )}
            </div>
            {insight && (
                <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                    <p className="text-sm font-semibold text-cdtext">{insight.headline}</p>
                    <p className="text-[11px] text-cdmuted mt-1 leading-relaxed">{insight.detail}</p>
                </div>
            )}
            <p className="text-[10px] text-cdmuted mt-2 leading-relaxed">
                {caption}
                {source ? ` · source: ${source}` : ''}
                {analyzedAt ? ` · analyzed ${analyzedAt}` : ''}
            </p>
        </div>
    );
}

const StatBox = ({ label, value, unit, icon, color = "text-cdmuted" }) => (
    <div className="bg-cdbg/50 p-3 rounded-lg border border-cdborder/50 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className={`absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            {React.createElement(icon, { size: 32 })}
        </div>
        <span className="text-[10px] uppercase font-bold text-cdmuted mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cdtext">{value || '-'}</span>
            <span className="text-xs text-cdmuted">{unit}</span>
        </div>
    </div>
);

const ActivityDetailModal = ({ activity, onClose, getStravaToken, profileFtp, profileMaxHr }) => {
    const panelRef = useModalA11y({ isOpen: true, onClose });
    const [stravaData, setStravaData] = useState(null);
    const [stravaLoading, setStravaLoading] = useState(false);
    const [stravaError, setStravaError] = useState(null);

    useEffect(() => {
        if (!activity?.strava_id || !getStravaToken) return;

        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            setStravaLoading(true);
            setStravaError(null);
            getStravaToken()
                .then(token =>
                    fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}?include_all_efforts=true`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
                .then(r => {
                    if (!r.ok) throw new Error(`Strava API error: ${r.status}`);
                    return r.json();
                })
                .then(data => {
                    if (!cancelled) setStravaData(data);
                })
                .catch(e => {
                    if (!cancelled) setStravaError(e.message);
                })
                .finally(() => {
                    if (!cancelled) setStravaLoading(false);
                });
        });
        return () => { cancelled = true; };
    }, [activity?.strava_id, getStravaToken]);

    if (!activity) return null;

    const storedDescription = (activity.description || activity.notes || '').trim();
    const liveDescription = (stravaData?.description || '').trim();
    const displayDescription = storedDescription || liveDescription;

    const polyline = stravaData?.map?.summary_polyline;
    const segments = stravaData?.segment_efforts || [];

    const powerCurve = [
        { label: '1m', val: activity.best_1min },
        { label: '5m', val: activity.best_5min },
        { label: '10m', val: activity.best_10min },
        { label: '20m', val: activity.best_20min },
        { label: '60m', val: activity.best_60min },
    ].filter((p) => Number(p.val) > 0);

    const hasDecoupling = Number.isFinite(Number(activity.decoupling_pct));
    const hasThresholdDrift = Number.isFinite(Number(activity.threshold_drift_pct));
    const hasRaceDrift = Number.isFinite(Number(activity.race_drift_pct));
    const hasAnyDrift = hasDecoupling || hasThresholdDrift || hasRaceDrift;
    const hasPowerHrForDrift = Number(activity.norm_power) > 0 && Number(activity.avg_hr) > 0;

    const driftEligibility = useMemo(
        () => (hasPowerHrForDrift ? describeRideDriftEligibility(activity, profileFtp) : null),
        [activity, profileFtp, hasPowerHrForDrift],
    );

    return (
        <ModalPortal>
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={panelRef}
                className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
                role="dialog"
                aria-modal="true"
                aria-labelledby="activity-detail-modal-title"
                tabIndex={-1}
            >

                {/* Header — title & links only; long descriptions live in scrollable body */}
                <div className="flex-shrink-0 p-4 border-b border-cdborder bg-cdbg flex justify-between items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-cdborder text-cdtext text-[10px] font-bold px-2 py-0.5 rounded uppercase">{activity.type}</span>
                            <span className="text-cdmuted text-xs flex items-center gap-1"><Calendar size={12} /> {formatDateDDMMYYYY(activity.date)}</span>
                        </div>
                        <h2 id="activity-detail-modal-title" className="text-xl font-bold text-cdtext break-words">{activity.title}</h2>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {activity.id && !String(activity.id).startsWith('csv_') && (
                                <a href={`https://intervals.icu/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cd-focus-ring rounded-sm px-1 py-0.5 -ml-1">
                                    Intervals.icu <ExternalLink size={10} />
                                </a>
                            )}
                            {activity.strava_id && stravaActivityUrl(activity.strava_id) && (
                                <button
                                    type="button"
                                    onClick={() => openExternalUrl(stravaActivityUrl(activity.strava_id), { allowSameTabFallback: false })}
                                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 cd-focus-ring rounded-sm px-1 py-0.5 -ml-1"
                                >
                                    <StravaIcon size={12} /> Strava <ExternalLink size={10} />
                                </button>
                            )}
                            {resolveFlybyStravaId(activity) && stravaFlybyUrl(resolveFlybyStravaId(activity)) && (
                                <button
                                    type="button"
                                    onClick={() => { void openStravaFlyby(activity, { getStravaToken }); }}
                                    className="text-xs text-orange-300 hover:text-orange-200 flex items-center gap-1 cd-focus-ring rounded-sm px-1 py-0.5 -ml-1"
                                >
                                    Flyby <ExternalLink size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-cdsurface rounded-full text-cdmuted hover:text-cdtext cd-focus-ring shrink-0"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Primary stats — pinned so long descriptions never push them off-screen */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-cdborder bg-cdsurface">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox label="Time" value={formatTime(activity.moving_time)} unit="" icon={Clock} color="text-blue-500" />
                        <StatBox label="Distance" value={Number(activity.distance).toFixed(1)} unit="km" icon={MapPin} color="text-green-500" />
                        <StatBox label="Elevation" value={activity.climbing} unit="m" icon={Mountain} color="text-cdprimary" />
                        <StatBox label="Load" value={activity.load} unit="TSS" icon={TrendingUp} color="text-purple-500" />
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar space-y-6">
                    {displayDescription ? (
                        <section aria-label="Activity description">
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-2">Description</h3>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar text-sm text-cdmuted leading-relaxed whitespace-pre-wrap border border-cdborder/50 rounded-lg p-3 bg-cdbg/30">
                                {displayDescription}
                            </div>
                        </section>
                    ) : activity.strava_id ? (
                        <p className="text-[11px] text-cdmuted italic">
                            No Strava description stored yet. Run Activities → Strava descriptions backfill, or it will appear here after Strava loads.
                        </p>
                    ) : null}

                    {/* Gear */}
                    {activity.gear_name && (
                        <div className="flex items-center gap-2 text-xs text-cdmuted bg-cdbg/50 border border-cdborder rounded px-3 py-2">
                            <Bike size={13} className="text-orange-400 shrink-0" />
                            <span>Ridden on: <span className="text-cdtext font-medium">{activity.gear_name}</span></span>
                        </div>
                    )}

                    {/* Power Stats */}
                    {(activity.avg_power > 0 || activity.norm_power > 0) && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2"><Zap size={14} className="text-cdprimary" /> Power Metrics</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Avg</div>
                                    <ZoneMetricCell metric="power" value={activity.avg_power} profileFtp={profileFtp} suffix="w" className="text-base" />
                                </div>
                                <div className="bg-cdborder/30 p-2 rounded text-center border-l-2 border-cdprimary">
                                    <div className="text-xs text-cdmuted">NP®</div>
                                    <NormPowerCell watts={activity.norm_power} profileFtp={profileFtp} suffix="w" className="text-base" />
                                </div>
                                <div
                                    className="bg-cdborder/30 p-2 rounded text-center"
                                    title={
                                        !(Number(profileFtp) > 0)
                                            ? 'Intensity factor (NP ÷ FTP). Set FTP in Settings → Profile to see this value.'
                                            : 'Intensity factor (NP ÷ FTP) using your profile FTP from Settings.'
                                    }
                                >
                                    <div className="text-xs text-cdmuted">IF®</div>
                                    <ZoneMetricCell
                                        metric="if"
                                        normPower={activity.norm_power}
                                        profileFtp={profileFtp}
                                        className="text-base"
                                    />
                                </div>
                                {activityVariabilityIndex(activity.norm_power, activity.avg_power) != null && (
                                    <div className="bg-cdborder/30 p-2 rounded text-center" title="Variability Index (NP ÷ avg power)">
                                        <div className="text-xs text-cdmuted">VI</div>
                                        <div className="font-bold text-cdtext text-base tabular-nums">
                                            {activityVariabilityIndex(activity.norm_power, activity.avg_power).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                                {activityEfficiencyFactor(activity.norm_power, activity.avg_hr) != null && (
                                    <div className="bg-cdborder/30 p-2 rounded text-center" title="Efficiency Factor (NP ÷ avg HR)">
                                        <div className="text-xs text-cdmuted">EF (W/bpm)</div>
                                        <div className="font-bold text-cdtext text-base tabular-nums">
                                            {activityEfficiencyFactor(activity.norm_power, activity.avg_hr).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-cdborder/30 p-2 rounded text-center">
                                    <div className="text-xs text-cdmuted">Work</div>
                                    <div className="font-bold text-cdtext">{Math.round((activity.avg_power * activity.moving_time) / 1000)}kJ</div>
                                </div>
                            </div>

                            {/* Power Curve */}
                            {powerCurve.length > 0 && (() => {
                                const maxVal = powerCurve.reduce((max, i) => Math.max(max, Number(i.val) || 0), 0);
                                return (
                                <div className="bg-cdbg/50 rounded-lg p-3 border border-cdborder/50">
                                    <div className="text-[10px] text-cdmuted mb-2 uppercase font-bold text-center">Peak Power Curve</div>
                                    <div className="flex justify-between items-end h-32 gap-2 px-2">
                                        {powerCurve.map((p, idx) => {
                                            const watts = Math.round(Number(p.val) || 0);
                                            const heightPct = maxVal > 0 ? (watts / maxVal) * 100 : 0;
                                            return (
                                                <div
                                                    key={idx}
                                                    tabIndex={0}
                                                    aria-label={`Peak power for ${p.label}: ${watts} watts`}
                                                    className="flex-1 min-w-0 flex flex-col h-full min-h-0 items-center group cd-focus-ring rounded-sm"
                                                >
                                                    <span className="text-[10px] font-bold text-cdtext tabular-nums leading-none mb-1">
                                                        {watts}w
                                                    </span>
                                                    <div className="flex-1 w-full min-h-0 flex items-end justify-center px-0.5">
                                                        <div
                                                            className="w-full max-w-[2.25rem] bg-cdprimary/25 group-hover:bg-cdprimary/45 border-t-2 border-cdprimary rounded-t-sm transition-colors min-h-[4px]"
                                                            style={{ height: `${heightPct}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-cdmuted mt-1 leading-none">{p.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    )}

                    {hasPowerHrForDrift && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-400" /> HR drift (stream analysis)
                            </h3>

                            {hasDecoupling && (
                                <DriftDetailBlock
                                    title={`${driftProfileLabel('steady')} (steady endurance)`}
                                    pct={activity.decoupling_pct}
                                    efFirst={activity.decoupling_ef_first}
                                    efSecond={activity.decoupling_ef_second}
                                    status={activity.decoupling_status}
                                    source={activity.decoupling_source}
                                    analyzedAt={activity.decoupling_analyzed_at}
                                    caption="Within-ride HR drift at steady power (first vs second half)"
                                />
                            )}

                            {hasThresholdDrift && (
                                <DriftDetailBlock
                                    title={`${driftProfileLabel('threshold')} (tempo / threshold)`}
                                    pct={activity.threshold_drift_pct}
                                    efFirst={activity.threshold_drift_ef_first}
                                    efSecond={activity.threshold_drift_ef_second}
                                    status={activity.threshold_drift_status}
                                    source={activity.threshold_drift_source}
                                    analyzedAt={activity.threshold_drift_analyzed_at}
                                    caption="HR drift during sustained hard aerobic / sub-threshold efforts"
                                />
                            )}

                            {hasRaceDrift && (
                                <DriftDetailBlock
                                    title={`${driftProfileLabel('race')} (race / variable)`}
                                    pct={activity.race_drift_pct}
                                    efFirst={activity.race_drift_ef_first}
                                    efSecond={activity.race_drift_ef_second}
                                    status={activity.race_drift_status}
                                    source={activity.race_drift_source}
                                    analyzedAt={activity.race_drift_analyzed_at}
                                    caption="HR drift during high-intensity variable race-style efforts"
                                />
                            )}

                            {!hasAnyDrift && driftEligibility && (
                                <div
                                    className={`rounded-lg border p-3 ${
                                        driftEligibility.status === 'pending'
                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                            : 'border-cdborder/50 bg-cdborder/10'
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-cdtext">{driftEligibility.headline}</p>
                                    <p className="text-[11px] text-cdmuted mt-1 leading-relaxed">{driftEligibility.detail}</p>
                                    {driftEligibility.ifVal != null && (
                                        <p className="text-[10px] text-cdmuted mt-2 tabular-nums">
                                            Ride summary: IF {driftEligibility.ifVal.toFixed(2)}
                                            {driftEligibility.vi != null ? ` · VI ${driftEligibility.vi.toFixed(2)}` : ''}
                                            {driftEligibility.profile
                                                ? ` · profile: ${driftProfileLabel(driftEligibility.profile)}`
                                                : ''}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {(activity.avg_hr > 0 || activity.max_hr > 0) && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2">
                                <Heart size={14} className="text-red-400" /> Heart Rate
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {activity.avg_hr > 0 && (
                                    <div className="bg-cdborder/30 p-2 rounded text-center">
                                        <div className="text-xs text-cdmuted">Avg HR</div>
                                        <ZoneMetricCell metric="hr" value={activity.avg_hr} profileMaxHr={profileMaxHr} suffix=" bpm" className="text-base" />
                                    </div>
                                )}
                                {activity.max_hr > 0 && (
                                    <div className="bg-cdborder/30 p-2 rounded text-center">
                                        <div className="text-xs text-cdmuted">Max HR</div>
                                        <ZoneMetricCell metric="hr" value={activity.max_hr} profileMaxHr={profileMaxHr} suffix=" bpm" className="text-base" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Strava Sectie: kaart + segmenten */}
                    {activity.strava_id && (
                        <div>
                            <h3 className="text-xs uppercase font-bold text-cdmuted mb-3 flex items-center gap-2">
                                <span className="text-orange-400"><StravaIcon size={14} /></span>
                                Strava Data
                            </h3>

                            {stravaLoading && (
                                <div className="flex items-center gap-2 text-cdmuted text-xs py-4">
                                    <Loader2 size={16} className="animate-spin text-orange-400" />
                                    Loading Strava data…
                                </div>
                            )}

                            {stravaError && (
                                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{stravaError}</span>
                                </div>
                            )}

                            {!stravaLoading && !stravaError && stravaData && (
                                <div className="space-y-4">
                                    {/* Kaart */}
                                    {polyline && (
                                        <div>
                                            <div className="text-[10px] text-cdmuted uppercase font-bold mb-2">Route</div>
                                            <Suspense
                                                fallback={(
                                                    <div
                                                        className="h-[200px] cd-skeleton rounded-lg"
                                                        role="status"
                                                        aria-busy="true"
                                                        aria-label="Loading map…"
                                                    />
                                                )}
                                            >
                                                <StravaMap polyline={polyline} />
                                            </Suspense>
                                        </div>
                                    )}

                                    {/* Segmenten */}
                                    {segments.length > 0 && (
                                        <div>
                                            <div className="text-[10px] text-cdmuted uppercase font-bold mb-2">
                                                Segments ({segments.length})
                                            </div>
                                            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                {segments.map((seg, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-cdbg/50 rounded px-3 py-2 border border-cdborder/30 text-xs">
                                                        <div className="flex-1 truncate flex items-center gap-1">
                                                            {seg.segment?.starred && (
                                                                <Star size={11} className="text-cdprimary fill-cdprimary shrink-0" />
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="text-cdtext hover:text-orange-400 font-medium transition-colors truncate cd-focus-ring rounded-sm px-1 -ml-1 text-left max-w-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigateToStravaSegment(seg.segment?.id);
                                                                }}
                                                            >
                                                                {seg.name}
                                                            </button>
                                                        </div>
                                                        <span className="text-cdmuted tabular-nums shrink-0">{formatSegmentTime(seg.elapsed_time)}</span>
                                                        {seg.average_watts > 0 && (
                                                            <span className="text-cdprimary font-bold shrink-0">{Math.round(seg.average_watts)}w</span>
                                                        )}
                                                        {seg.pr_rank === 1 && (
                                                            <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold shrink-0">PR</span>
                                                        )}
                                                        {seg.kom_rank === 1 && (
                                                            <span className="inline-flex shrink-0" title="Overall #1 on segment">
                                                                <Crown size={14} className="text-amber-400" fill="currentColor" strokeWidth={1.25} aria-hidden />
                                                            </span>
                                                        )}
                                                        {seg.kom_rank && seg.kom_rank >= 2 && seg.kom_rank <= 10 && (
                                                            <span
                                                                className="inline-flex items-center gap-1 shrink-0"
                                                                title={`#${seg.kom_rank} on segment leaderboard`}
                                                            >
                                                                <Trophy
                                                                    size={16}
                                                                    className="shrink-0 text-amber-500/90 dark:text-amber-400/90"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth={2}
                                                                    aria-hidden
                                                                />
                                                                <span className="text-xs font-semibold tabular-nums text-cdtext">
                                                                    {seg.kom_rank}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Geen Strava connectie */}
                            {!stravaLoading && !stravaError && !stravaData && !getStravaToken && (
                                <div className="text-xs text-cdmuted bg-cdbg/50 rounded-lg p-3 border border-cdborder/30">
                                    Connect Strava in Settings to see the map and segments.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
        </ModalPortal>
    );
};

export default ActivityDetailModal;
