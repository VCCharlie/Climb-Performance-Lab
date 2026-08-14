import React, { useMemo, useState, useEffect } from 'react';
import { Mountain, CalendarDays, ChevronRight, Heart, Target, X } from 'lucide-react';
import { useClimbDatabase } from '../hooks/useClimbDatabase';
import { computeTrainingGoalPlan } from '../utils/trainingGoalPlan';
import { calculatePowerZones } from '../utils/calculations';
import { useActivitiesList } from '../hooks/useActivities';
import { useProfileFtp } from '../context/ProfileFtpContext';
import {
    buildTrainingPlanSnapshot,
    writeTrainingPlanSnapshot,
    readTrainingPlanSnapshot,
    hydrateTrainingPlanSnapshot,
    TRAINING_PLAN_UPDATED_EVENT,
} from '../utils/trainingPlanSnapshot';
import { trainingGoalFormDefaultsFromSnapshot, resolveTrainingGoalDisplayName } from '../utils/trainingGoalLink';
import { formatDateDDMMYYYY } from '../utils/formatters';
import NlDateInput from './NlDateInput';

const defaultGoalDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split('T')[0];
};

function readStoredGoalFormDefaults() {
    return trainingGoalFormDefaultsFromSnapshot(readTrainingPlanSnapshot());
}

const TrainingGoalPlanner = ({ activities: activitiesProp, userSettings, startDate, endDate, isSignedIn = false, onOpenRecovery }) => {
    const activitiesFromContext = useActivitiesList();
    const activities = activitiesProp ?? activitiesFromContext;
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const { climbs: climbDatabase, loadFull } = useClimbDatabase();

    useEffect(() => {
        loadFull();
    }, [loadFull]);

    const zones = useMemo(() => (ftp > 0 ? calculatePowerZones(ftp) : []), [ftp]);

    const [goalDate, setGoalDate] = useState(() => readStoredGoalFormDefaults()?.goalDate ?? defaultGoalDate());
    const [eventName, setEventName] = useState(() => readStoredGoalFormDefaults()?.eventName ?? '');
    const [source, setSource] = useState(() => readStoredGoalFormDefaults()?.source ?? 'custom');
    const [climbSearch, setClimbSearch] = useState(() => readStoredGoalFormDefaults()?.climbSearch ?? '');
    const [distanceKm, setDistanceKm] = useState(() => readStoredGoalFormDefaults()?.distanceKm ?? '');
    const [elevationM, setElevationM] = useState(() => readStoredGoalFormDefaults()?.elevationM ?? '');
    const [durationHours, setDurationHours] = useState(() => readStoredGoalFormDefaults()?.durationHours ?? '');
    const [targetPctFtp, setTargetPctFtp] = useState(() => readStoredGoalFormDefaults()?.targetPctFtp ?? 75);
    const [goalRevision, setGoalRevision] = useState(0);
    const [goalPersistEnabled, setGoalPersistEnabled] = useState(() => Boolean(readTrainingPlanSnapshot()));

    const touchGoalPersist = () => {
        setGoalPersistEnabled(true);
    };

    useEffect(() => {
        const onPlanUpdate = (event) => {
            setGoalRevision((n) => n + 1);
            const snapshot = readTrainingPlanSnapshot();

            if (!snapshot) {
                setGoalPersistEnabled(false);
                if (event?.detail?.source !== 'cloud') return;
                setEventName('');
                setDistanceKm('');
                setElevationM('');
                setDurationHours('');
                setTargetPctFtp(75);
                setSource('custom');
                setClimbSearch('');
                setGoalDate(defaultGoalDate());
                return;
            }

            setGoalPersistEnabled(true);

            if (event?.detail?.source !== 'cloud') return;

            const defaults = trainingGoalFormDefaultsFromSnapshot(snapshot);
            if (!defaults) return;

            setGoalDate(defaults.goalDate);
            setEventName(defaults.eventName);
            setSource(defaults.source);
            setClimbSearch(defaults.climbSearch);
            setDistanceKm(defaults.distanceKm);
            setElevationM(defaults.elevationM);
            setDurationHours(defaults.durationHours);
            setTargetPctFtp(defaults.targetPctFtp);
        };

        window.addEventListener(TRAINING_PLAN_UPDATED_EVENT, onPlanUpdate);
        return () => window.removeEventListener(TRAINING_PLAN_UPDATED_EVENT, onPlanUpdate);
    }, []);

    const filteredClimbs = useMemo(() => {
        const q = climbSearch.trim().toLowerCase();
        if (!q) return climbDatabase.slice(0, 40);
        return climbDatabase.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                String(c.country || '').toLowerCase().includes(q)
        ).slice(0, 50);
    }, [climbSearch, climbDatabase]);

    const applyClimb = (c) => {
        touchGoalPersist();
        setEventName(c.name);
        setDistanceKm(String(c.lengthKm ?? ''));
        setElevationM(String(c.elevation ?? ''));
        setClimbSearch(c.name);
    };

    const planResult = useMemo(() => {
        return computeTrainingGoalPlan({
            goalDateStr: goalDate,
            activities: activities || [],
            today: new Date(),
            endDateForRecentTss: endDate,
            goalInputs: {
                distanceKm: Number(distanceKm) || 0,
                elevationM: Number(elevationM) || 0,
                durationHours: durationHours === '' ? null : Number(durationHours),
                targetPctFtp,
            },
        });
    }, [goalDate, activities, endDate, distanceKm, elevationM, durationHours, targetPctFtp]);

    const zoneForTarget = useMemo(() => {
        if (!ftp || !zones.length) return null;
        const w = (ftp * targetPctFtp) / 100;
        return zones.find((z) => w >= z.min && w <= z.max) || zones[3];
    }, [ftp, zones, targetPctFtp]);

    const expectedAvgWatts = ftp > 0 ? Math.round((ftp * targetPctFtp) / 100) : null;

    const activeGoalSnapshot = useMemo(() => {
        if (!goalPersistEnabled) return null;
        const stored = readTrainingPlanSnapshot();
        if (!stored) return null;
        return hydrateTrainingPlanSnapshot(stored);
    }, [goalPersistEnabled, goalRevision]);

    const handleClearGoal = () => {
        setGoalPersistEnabled(false);
        writeTrainingPlanSnapshot(null);
        setEventName('');
        setDistanceKm('');
        setElevationM('');
        setDurationHours('');
        setTargetPctFtp(75);
        setSource('custom');
        setClimbSearch('');
        setGoalDate(defaultGoalDate());
    };

    const displayEventName = useMemo(
        () => resolveTrainingGoalDisplayName({
            eventName,
            source,
            climbSearch,
            distanceKm: Number(distanceKm) || 0,
            elevationM: Number(elevationM) || 0,
            snapshot: activeGoalSnapshot,
        }),
        [eventName, source, climbSearch, distanceKm, elevationM, activeGoalSnapshot],
    );

    useEffect(() => {
        if (!goalPersistEnabled) return;

        const snapshot = buildTrainingPlanSnapshot({
            goalDate,
            eventName,
            goalInputs: {
                source,
                climbSearch,
                customEventName: eventName.trim(),
                distanceKm: Number(distanceKm) || 0,
                elevationM: Number(elevationM) || 0,
                durationHours: durationHours === '' ? null : Number(durationHours),
                targetPctFtp,
            },
            planResult,
        });
        if (!snapshot) return;
        writeTrainingPlanSnapshot(snapshot);
    }, [
        goalPersistEnabled,
        goalDate,
        eventName,
        source,
        climbSearch,
        distanceKm,
        elevationM,
        durationHours,
        targetPctFtp,
        planResult,
    ]);

    const currentWeekNum = activeGoalSnapshot?.currentWeekNum ?? null;

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in min-w-0 max-w-full">
            <div className="bg-cdsurface p-3 md:p-6 rounded-xl border border-cdborder shadow-md">
                <h2 className="text-xl md:text-2xl font-bold text-cdtext flex items-center gap-2 mb-2">
                    <Mountain className="text-cdaccent shrink-0" size={22} />
                    Goal & planning
                </h2>
                <p className="text-sm text-cdmuted leading-relaxed max-w-3xl">
                    Set a <strong className="text-cdtext font-medium">date</strong> and the <strong className="text-cdtext font-medium">profile</strong> of your target (distance, elevation, optional duration, expected average intensity as % FTP).
                    We estimate <strong className="text-cdtext font-medium">event-day TSS</strong> and provide a <strong className="text-cdtext font-medium">weekly schedule</strong> with rising load and taper — aligned with your recent TSS (last 4 weeks in your selected dashboard period).
                    {isSignedIn ? (
                        <span className="block mt-2 text-xs">
                            Signed in — your event goal syncs across devices via Firebase (separate from yearly km/elevation goals on the Dashboard).
                        </span>
                    ) : (
                        <span className="block mt-2 text-xs">
                            Sign in to sync this event goal across mobile and desktop.
                        </span>
                    )}
                </p>
            </div>

            {activeGoalSnapshot && !planResult.error && (
                <div className="bg-cdsurface p-4 rounded-xl border border-cdborder border-l-4 border-l-cdaccent flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                            <Target size={14} className="text-cdaccent shrink-0" aria-hidden />
                            Active event goal
                        </p>
                        <p className="text-lg font-black text-cdtext mt-1 break-words">
                            {displayEventName}
                        </p>
                        <p className="text-sm text-cdmuted mt-1">
                            {formatDateDDMMYYYY(activeGoalSnapshot.goalDate)}
                            {activeGoalSnapshot.weeksToEvent > 0
                                ? ` · ${activeGoalSnapshot.weeksToEvent} week(s) to go`
                                : ' · event week'}
                        </p>
                        <p className="text-xs text-cdmuted mt-2">
                            Week {activeGoalSnapshot.currentWeekNum}: {activeGoalSnapshot.currentPhaseLabel}
                            {activeGoalSnapshot.isTaperPhase ? ' (taper)' : ''}
                            {' · '}
                            <span className="font-mono font-bold text-cdtext">{activeGoalSnapshot.currentWeekTargetTss} TSS</span>
                            {' '}this week — also drives your fluid week plan in Coach.
                        </p>
                        {planResult.plan?.developmentMode === 'develop-aerobic' && (
                            <p className="text-xs text-cdaccent mt-2 leading-relaxed">
                                Development focus: more Z2 and fewer hard rides than your habit — weekly TSS is intentionally below what you are used to to build FTP and endurance.
                            </p>
                        )}
                        {planResult.plan?.developmentMode === 'event-prep' && planResult.plan?.developmentRationale && (
                            <p className="text-xs text-cdaccent mt-2 leading-relaxed">
                                {planResult.plan.developmentRationale}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleClearGoal}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cdmuted hover:text-red-400 cd-min-touch-y cd-focus-ring shrink-0"
                    >
                        <X size={14} aria-hidden />
                        Clear goal
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-cdsurface p-5 rounded-xl border border-cdborder space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide flex items-center gap-2">
                        <CalendarDays size={16} className="text-cdaccent" /> Set your goal
                    </h3>

                    <label className="block text-xs text-cdmuted font-semibold">Target date</label>
                    <NlDateInput
                        value={goalDate}
                        onChange={(v) => {
                            if (v) {
                                touchGoalPersist();
                                setGoalDate(v);
                            }
                        }}
                        className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext"
                        aria-label="Target date (dd-mm-jjjj)"
                    />

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                touchGoalPersist();
                                setSource('custom');
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border ${source === 'custom' ? 'border-cdaccent text-cdaccent bg-cdaccent/10' : 'border-cdborder text-cdmuted'}`}
                        >
                            Custom distance
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                touchGoalPersist();
                                setSource('climb');
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border ${source === 'climb' ? 'border-cdaccent text-cdaccent bg-cdaccent/10' : 'border-cdborder text-cdmuted'}`}
                        >
                            From climb database
                        </button>
                    </div>

                    {source === 'climb' ? (
                        <div className="space-y-2">
                            <label className="block text-xs text-cdmuted font-semibold">Search climb</label>
                            <input
                                type="text"
                                value={climbSearch}
                                onChange={(e) => {
                                    touchGoalPersist();
                                    setClimbSearch(e.target.value);
                                }}
                                placeholder="e.g. Galibier, Stelvio…"
                                className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext text-sm"
                            />
                            <div className="max-h-36 overflow-y-auto rounded-lg border border-cdborder divide-y divide-cdborder custom-scrollbar">
                                {filteredClimbs.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => applyClimb(c)}
                                        className="w-full text-left px-3 py-2 text-sm text-cdtext hover:bg-cdborder/50 flex justify-between gap-2"
                                    >
                                        <span>{c.flag} {c.name}</span>
                                        <span className="text-cdmuted shrink-0">{c.lengthKm} km / {c.elevation} m</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <label className="block text-xs text-cdmuted font-semibold">Event name (optional)</label>
                    <input
                        type="text"
                        value={eventName}
                        onChange={(e) => {
                            touchGoalPersist();
                            setEventName(e.target.value);
                        }}
                        placeholder="e.g. Marmotte, local gran fondo…"
                        className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-cdmuted font-semibold mb-1">Distance (km)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={distanceKm}
                                onChange={(e) => {
                                    touchGoalPersist();
                                    setDistanceKm(e.target.value);
                                }}
                                className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-cdmuted font-semibold mb-1">Elevation (m)</label>
                            <input
                                type="number"
                                min="0"
                                value={elevationM}
                                onChange={(e) => {
                                    touchGoalPersist();
                                    setElevationM(e.target.value);
                                }}
                                className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-cdmuted font-semibold mb-1">
                            Expected duration (h, optional — otherwise estimated from km + elevation)
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            step="0.25"
                            value={durationHours}
                            onChange={(e) => {
                                touchGoalPersist();
                                setDurationHours(e.target.value);
                            }}
                            placeholder="e.g. 5.5"
                            className="w-full bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-cdmuted font-semibold mb-1">
                            Expected average intensity: {targetPctFtp}% FTP
                            {zoneForTarget ? (
                                <span className="text-cdaccent ml-1">(~{zoneForTarget.id} {zoneForTarget.label})</span>
                            ) : null}
                        </label>
                        <input
                            type="range"
                            min="55"
                            max="95"
                            value={targetPctFtp}
                            onChange={(e) => {
                                touchGoalPersist();
                                setTargetPctFtp(Number(e.target.value));
                            }}
                            className="w-full accent-cdaccent"
                        />
                        <div className="flex justify-between text-[10px] text-cdmuted mt-1">
                            <span>55% (Z2–Z3)</span>
                            <span>95% (threshold+)</span>
                        </div>
                        {expectedAvgWatts != null ? (
                            <p className="mt-2 text-xs text-cdtext bg-cdborder/40 border border-cdborder rounded-lg px-3 py-2">
                                At your FTP of <strong>{ftp} W</strong>, {targetPctFtp}% is about{' '}
                                <strong className="text-cdaccent">{expectedAvgWatts} W</strong> as expected <em>average</em> power over the event (not NP; real rides vary minute to minute).
                            </p>
                        ) : (
                            <p className="mt-2 text-xs text-cdmuted">
                                Enter your FTP in Settings to see expected average power in watts here.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-cdsurface p-5 rounded-xl border border-cdborder space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">What we estimate</h3>

                    {planResult.error ? (
                        <p className="text-sm text-red-400">{planResult.error}</p>
                    ) : (
                        <>
                            <p className="text-sm text-cdtext leading-relaxed">{planResult.demand.narrative}</p>
                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                <dt className="text-cdmuted">Weeks to event</dt>
                                <dd className="text-cdtext font-mono font-bold">{planResult.weeksToEvent}</dd>
                                <dt className="text-cdmuted">Recent TSS/week (4 wk)</dt>
                                <dd className="text-cdtext font-mono font-bold">{planResult.recentWeeklyTss}</dd>
                                <dt className="text-cdmuted">Estimated event-day TSS</dt>
                                <dd className="text-cdtext font-mono font-bold">{planResult.demand.estimatedEventTss}</dd>
                            </dl>
                            <p className="text-xs text-cdmuted leading-relaxed border-t border-cdborder pt-3">
                                The period for “recent TSS” follows your dashboard filter (start: {startDate || '—'}). Adjust the filter below the dashboard if you want a different reference.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {!planResult.error && planResult.plan?.weeks?.length > 0 && (
                <div className="bg-cdsurface p-5 rounded-xl border border-cdborder space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">
                            Weekly plan toward your goal
                        </h3>
                        {activeGoalSnapshot && (
                            <span className="text-xs text-cdmuted">
                                <span className="font-semibold text-cdtext">{displayEventName}</span>
                                {' · '}
                                {formatDateDDMMYYYY(activeGoalSnapshot.goalDate)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-cdmuted">{planResult.plan.summary}</p>

                    {planResult.plan?.developmentMode !== 'progress' && (
                        <p className="text-xs text-cdaccent leading-relaxed rounded-lg border border-cdaccent/30 bg-cdaccent/5 px-3 py-2">
                            {planResult.plan.developmentRationale
                                || 'This plan deliberately keeps weekly TSS below your recent habit so aerobic fitness can rebuild.'}
                        </p>
                    )}

                    <div className="md:hidden space-y-2">
                        {planResult.plan.weeks.map((w) => {
                            const isCurrent = currentWeekNum === w.weekNum;
                            return (
                                <div
                                    key={w.weekNum}
                                    className={`rounded-lg border p-3 space-y-1 ${
                                        isCurrent
                                            ? 'border-cdaccent bg-cdaccent/5'
                                            : 'border-cdborder bg-cdborder/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wide text-cdmuted">
                                            Week {w.weekNum}
                                            {isCurrent ? ' · now' : ''}
                                        </span>
                                        <span className="font-mono font-bold text-cdtext">{w.targetTss} TSS</span>
                                    </div>
                                    <p className="text-sm font-semibold text-cdtext">{w.phaseLabel}</p>
                                    <p className="text-xs text-cdmuted leading-relaxed">{w.focus}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden md:block -mx-1 overflow-x-auto rounded-lg border border-cdborder overscroll-x-contain">
                        <table className="w-full text-sm text-left min-w-[640px]">
                            <thead>
                                <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                    <th className="px-3 py-2 font-semibold">Week</th>
                                    <th className="px-3 py-2 font-semibold">Phase</th>
                                    <th className="px-3 py-2 font-semibold text-right">Target TSS/wk</th>
                                    <th className="px-3 py-2 font-semibold min-w-[280px]">Focus</th>
                                </tr>
                            </thead>
                            <tbody className="text-cdtext">
                                {planResult.plan.weeks.map((w) => {
                                    const isCurrent = currentWeekNum === w.weekNum;
                                    return (
                                        <tr
                                            key={w.weekNum}
                                            className={`border-t border-cdborder ${
                                                isCurrent ? 'bg-cdaccent/10' : ''
                                            }`}
                                        >
                                            <td className="px-3 py-2 font-mono font-bold">
                                                {w.weekNum}
                                                {isCurrent ? (
                                                    <span className="ml-1 text-[10px] uppercase text-cdaccent">now</span>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-cdmuted">{w.phaseLabel}</td>
                                            <td className="px-3 py-2 text-right font-mono">{w.targetTss}</td>
                                            <td className="px-3 py-2 text-xs text-cdmuted">{w.focus}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {planResult.tips?.length > 0 && (
                <div className="bg-cdsurface p-5 rounded-xl border border-cdborder border-l-4 border-l-yellow-500">
                    <h3 className="text-sm font-bold text-cdtext mb-2">Note</h3>
                    <ul className="list-disc list-inside text-sm text-cdtext space-y-1">
                        {planResult.tips.map((t, i) => (
                            <li key={i}>{t}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-cdmuted">
                <span>Combine with recovery and form:</span>
                {typeof onOpenRecovery === 'function' ? (
                    <button
                        type="button"
                        onClick={onOpenRecovery}
                        className="inline-flex items-center gap-1.5 font-bold text-cdaccent hover:underline"
                    >
                        <Heart size={16} />
                        Open Recovery tab
                        <ChevronRight size={16} />
                    </button>
                ) : (
                    <span className="text-cdtext">Use the Recovery sub-tab for CTL/ATL/TSB.</span>
                )}
            </div>
        </div>
    );
};

export default TrainingGoalPlanner;
