import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Mountain, Check, Clock, Star, Trophy, Filter, Search, Sparkles, Download } from 'lucide-react';
import { useClimbDatabase } from '../hooks/useClimbDatabase';
import { useActivitiesList } from '../hooks/useActivities';
import PlannedClimbWeatherPanel from './bucket-list/PlannedClimbWeatherPanel';
import BucketListClimbRow from './bucket-list/BucketListClimbRow';
import {
    scanClimbPersonalBestsAsync,
    hasStoredClimbPb,
    countClimbsWithPb,
    summarizePbScanResult,
    formatPbScanFeedbackMessage,
} from '../utils/climbPersonalBests';
import { formatBucketListSyncLabel } from '../utils/bucketListSyncLabel';
import {
    downloadBucketListDonePbCsv,
    downloadBucketListDonePbJson,
    buildBucketListExportRows,
} from '../utils/bucketListExport';
import {
    countBucketListPrepWorkouts,
    listBucketListPrepWorkouts,
} from '../utils/bucketListZwoWorkouts';
import { downloadZwoWorkouts } from '../utils/zwoExport';
import { yieldToMain } from '../utils/yieldToMain';
import { addDismissedPbClimbId, climbPbsWithoutDismissed } from '../utils/bucketListPbDismiss';

const PB_VENUE_FILTER_OPTIONS = [
    { id: 'outdoor', label: 'Outdoor' },
    { id: 'virtual', label: 'Indoor' },
    { id: 'all', label: 'All' },
];

const STATUS_FILTER_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'done', label: 'Done' },
    { id: 'planned', label: 'Planned' },
    { id: 'want', label: 'Want' },
    { id: 'todo', label: 'To do' },
    { id: 'with_pb', label: 'With PB' },
    { id: 'pb_not_done', label: 'PB not done' },
];

const BucketList = ({
    initialState,
    remoteRevision = 0,
    isSignedIn = false,
    ftp = 0,
    onStateChange,
    onOpenWeatherForClimb,
    onOpenProfilerForClimb,
    onOpenMapTab,
    onOpenActivityInLog,
}) => {
    const { climbs: climbDatabase, loadFull } = useClimbDatabase();
    const activities = useActivitiesList();

    useEffect(() => {
        loadFull();
    }, [loadFull]);

    const [climbStatus, setClimbStatus] = useState(initialState?.climbStatus || {});
    const [climbPbs, setClimbPbs] = useState(initialState?.climbPbs || {});
    const [dismissedPbClimbIds, setDismissedPbClimbIds] = useState(
        initialState?.dismissedPbClimbIds || [],
    );
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [scanFeedback, setScanFeedback] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [pbVenueFilter, setPbVenueFilter] = useState('outdoor');
    const [scanProgress, setScanProgress] = useState(null);

    const parentSyncToken = remoteRevision;
    const skipParentNotifyRef = useRef(false);
    const initialNotifyDoneRef = useRef(false);
    const climbListScrollRef = useRef(null);
    const climbPbsAtScanStartRef = useRef(climbPbs);
    const climbStatusRef = useRef(climbStatus);

    useEffect(() => {
        climbStatusRef.current = climbStatus;
    }, [climbStatus]);

    useEffect(() => {
        if (!parentSyncToken) return;
        skipParentNotifyRef.current = true;
        setClimbStatus(initialState?.climbStatus || {});
        setClimbPbs(initialState?.climbPbs || {});
        setDismissedPbClimbIds(initialState?.dismissedPbClimbIds || []);
    }, [parentSyncToken, initialState]);

    // Update parent when local bucket list edits change (not when applying cloud sync).
    React.useEffect(() => {
        if (skipParentNotifyRef.current) {
            skipParentNotifyRef.current = false;
            return;
        }
        if (!initialNotifyDoneRef.current) {
            initialNotifyDoneRef.current = true;
            return;
        }
        if (onStateChange) {
            onStateChange({ climbStatus, climbPbs, dismissedPbClimbIds });
        }
    }, [climbStatus, climbPbs, dismissedPbClimbIds, onStateChange]);

    const handleScanPbs = async () => {
        if (!activities?.length) {
            setScanFeedback({
                tone: 'warn',
                message: 'No activities loaded yet — import or sync your log first.',
            });
            return;
        }

        setIsScanning(true);
        setScanProgress({ done: 0, total: activities.length });
        setScanFeedback(null);
        climbPbsAtScanStartRef.current = climbPbs;

        await yieldToMain();

        try {
            // Full replace scan must use outdoor + Zwift climbs — core bundle is Zwift-only.
            const climbsForScan = await loadFull();
            if (!climbsForScan?.length) {
                setScanFeedback({
                    tone: 'warn',
                    message: 'Climb database could not be loaded — try again in a moment.',
                });
                return;
            }

            const scanned = await scanClimbPersonalBestsAsync(activities, climbsForScan, {
                venueFilter: 'all',
                onProgress: setScanProgress,
            });
            const summary = summarizePbScanResult(
                climbPbsAtScanStartRef.current,
                scanned,
                activities,
                climbsForScan,
            );
            const pbScanCompletedAt = new Date().toISOString();
            const replaced = climbPbsWithoutDismissed(summary.replaced, dismissedPbClimbIds);
            skipParentNotifyRef.current = true;
            setClimbPbs(replaced);
            if (onStateChange) {
                onStateChange({
                    climbStatus: climbStatusRef.current,
                    climbPbs: replaced,
                    pbScanCompletedAt,
                    dismissedPbClimbIds,
                });
            }
            setScanFeedback({
                tone: summary.newClimbs > 0 || summary.improvedPbs > 0 || summary.removedPbs > 0 ? 'success' : 'info',
                message: `${formatPbScanFeedbackMessage(summary)}${isSignedIn ? ' Saved to cloud.' : ''}`,
                at: Date.now(),
            });
        } catch (err) {
            console.error('PB scan failed', err);
            setScanFeedback({
                tone: 'warn',
                message: 'PB scan failed — try again in a moment.',
            });
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    // Toggle climb status
    const toggleClimbStatus = useCallback((climbId, status) => {
        const id = String(climbId);
        setClimbStatus((prev) => {
            const next = { ...prev };
            if (next[id] === status) {
                delete next[id];
            } else {
                next[id] = status;
            }
            return next;
        });
    }, []);

    const removeClimbPb = useCallback((climbId) => {
        const id = String(climbId);
        setDismissedPbClimbIds((prev) => addDismissedPbClimbId(prev, id));
        setClimbPbs((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const climbById = useMemo(() => {
        const map = new Map();
        for (const climb of climbDatabase) {
            map.set(String(climb.id), climb);
        }
        return map;
    }, [climbDatabase]);

    // Calculate achievements (only climbs with a status — not full DB scan)
    const achievements = useMemo(() => {
        const doneClimbs = [];
        for (const [id, status] of Object.entries(climbStatus)) {
            if (status !== 'done') continue;
            const climb = climbById.get(String(id));
            if (climb) doneClimbs.push(climb);
        }
        const doneLength = doneClimbs.length;

        const badges = [];

        // First climb
        if (doneLength >= 1) {
            badges.push({ title: '🚴 First Ascent', description: 'Completed your first climb!' });
        }

        // Milestones
        if (doneLength >= 5) {
            badges.push({ title: '⭐ Climbing Enthusiast', description: '5 climbs completed' });
        }
        if (doneLength >= 10) {
            badges.push({ title: '🏅 Climb Specialist', description: '10 climbs completed' });
        }
        if (doneLength >= 25) {
            badges.push({ title: '👑 Climb King', description: '25 climbs completed' });
        }
        if (doneLength >= 50) {
            badges.push({ title: '🦅 Mountain Legend', description: '50 climbs completed' });
        }

        const iconicClimbs = new Set(['fr_alpe', 'fr_ventoux', 'fr_tourmalet', 'it_stelvio', 'it_zoncolan']);

        // ⚡ Bolt Optimization: Use single-pass for...of loop instead of chained .filter().length
        let frenchClimbs = 0;
        let italianClimbs = 0;
        let swissClimbs = 0;
        let zwiftClimbs = 0;
        let hardClimbs = 0;
        let iconicDone = 0;

        let totalElevation = 0;
        let totalGrade = 0;
        let hardestClimb = doneClimbs.length > 0 ? doneClimbs[0] : null;
        let maxScore = hardestClimb ? (hardestClimb.elevation * hardestClimb.elevation) / (hardestClimb.lengthKm * 10000) : 0;

        for (const c of doneClimbs) {
            // Region stats
            if (c.country === 'FR') frenchClimbs++;
            else if (c.country === 'IT') italianClimbs++;
            else if (c.country === 'CH') swissClimbs++;
            else if (c.country === 'ZWIFT') zwiftClimbs++;

            // Difficulty stats
            if (c.avgGrade > 8) hardClimbs++;

            // Iconic stats
            if (iconicClimbs.has(c.id)) iconicDone++;

            // Elevation and grade stats
            totalElevation += c.elevation;
            totalGrade += c.avgGrade;

            const cScore = (c.elevation * c.elevation) / (c.lengthKm * 10000);
            if (cScore > maxScore) {
                maxScore = cScore;
                hardestClimb = c;
            }
        }

        // Specific regions
        if (frenchClimbs >= 10) {
            badges.push({ title: '🇫🇷 Alpine Expert', description: '10 French cols completed' });
        }
        if (italianClimbs >= 5) {
            badges.push({ title: '🇮🇹 Giro Specialist', description: '5 Italian cols completed' });
        }
        if (swissClimbs >= 3) {
            badges.push({ title: '🇨🇭 Swiss Master', description: '3 Swiss cols completed' });
        }
        if (zwiftClimbs >= 5) {
            badges.push({ title: '🎮 Virtual Climber', description: '5 Zwift climbs completed' });
        }

        // Difficulty badges
        if (hardClimbs >= 5) {
            badges.push({ title: '⛰️ Steep Master', description: '5 cols >8% average completed' });
        }

        // Iconic climbs
        if (iconicDone >= 3) {
            badges.push({ title: '🏆 Iconic Cols', description: '3 legendary cols completed' });
        }

        if (totalElevation >= 10000) {
            badges.push({ title: '📈 Everest Challenge', description: `${Math.round(totalElevation)}m total climbed!` });
        }

        return {
            badges,
            stats: {
                totalDone: doneLength,
                totalElevation,
                avgGrade: doneClimbs.length > 0 ? (totalGrade / doneClimbs.length).toFixed(1) : 0,
                hardestClimb
            }
        };
    }, [climbStatus, climbById]);

    // Pre-calculate status counts for the filter dropdown in a single pass (O(N) vs 4 * O(N))
    const statusCounts = useMemo(() => {
        let done = 0, planned = 0, want = 0, todo = climbDatabase.length;
        for (const status of Object.values(climbStatus)) {
            if (status === 'done') { done++; todo--; }
            else if (status === 'planned') { planned++; todo--; }
            else if (status === 'want') { want++; todo--; }
        }
        return { done, planned, want, todo };
    }, [climbStatus, climbDatabase.length]);

    const activityById = useMemo(() => {
        const map = new Map();
        for (const act of activities || []) {
            if (act?.id != null) map.set(String(act.id), act);
        }
        return map;
    }, [activities]);

    const pbCount = useMemo(
        () => countClimbsWithPb(climbPbs, climbDatabase, pbVenueFilter, activities),
        [climbPbs, climbDatabase, pbVenueFilter, activities],
    );

    const pbNotDoneCount = useMemo(() => {
        let count = 0;
        for (const climb of climbDatabase) {
            const climbId = String(climb.id);
            if (climbStatus[climbId] === 'done') continue;
            const pb = climbPbs[climbId];
            const activity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
            if (hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, activity)) count += 1;
        }
        return count;
    }, [climbDatabase, climbStatus, climbPbs, pbVenueFilter, activityById]);

    const statusFilterCounts = useMemo(() => ({
        all: climbDatabase.length,
        done: statusCounts.done,
        planned: statusCounts.planned,
        want: statusCounts.want,
        todo: statusCounts.todo,
        with_pb: pbCount,
        pb_not_done: pbNotDoneCount,
    }), [climbDatabase.length, statusCounts, pbCount, pbNotDoneCount]);

    // Filter and sort climbs
    const filteredClimbs = useMemo(() => {
        let filtered = climbDatabase;

        // Filter by search
        if (searchTerm) {
            // ⚡ Bolt Optimization: Extract searchTerm.toLowerCase() outside the filter loop to avoid O(N) redundant string allocations
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(climb =>
                climb.name.toLowerCase().includes(searchLower) ||
                climb.country.toLowerCase().includes(searchLower)
            );
        }

        // Filter by status or activity PB
        if (filterStatus === 'with_pb') {
            filtered = filtered.filter((climb) => {
                const pb = climbPbs[climb.id];
                const activity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
                return hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, activity);
            });
        } else if (filterStatus === 'pb_not_done') {
            filtered = filtered.filter((climb) => {
                const climbId = String(climb.id);
                if (climbStatus[climbId] === 'done') return false;
                const pb = climbPbs[climbId];
                const activity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
                return hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, activity);
            });
        } else if (filterStatus !== 'all') {
            filtered = filtered.filter(climb => {
                const status = climbStatus[String(climb.id)];
                if (filterStatus === 'todo') {
                    return !status; // Not done, not planned, not want
                }
                return status === filterStatus;
            });
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'difficulty') {
                return b.avgGrade - a.avgGrade;
            } else if (sortBy === 'status') {
                const statusOrder = { done: 0, planned: 1, want: 2, null: 3 };
                return (statusOrder[climbStatus[String(a.id)]] ?? 3) - (statusOrder[climbStatus[String(b.id)]] ?? 3);
            }
            return 0;
        });

        return filtered;
    }, [searchTerm, filterStatus, sortBy, climbStatus, climbDatabase, climbPbs, pbVenueFilter, activityById]);

    const visiblePbNotDoneCount = useMemo(() => {
        let count = 0;
        for (const climb of filteredClimbs) {
            const climbId = String(climb.id);
            if (climbStatus[climbId] === 'done') continue;
            const pb = climbPbs[climbId];
            const activity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
            if (hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, activity)) count += 1;
        }
        return count;
    }, [filteredClimbs, climbStatus, climbPbs, pbVenueFilter, activityById]);

    const markVisiblePbAsDone = useCallback(() => {
        setClimbStatus((prev) => {
            const next = { ...prev };
            for (const climb of filteredClimbs) {
                const climbId = String(climb.id);
                if (next[climbId] === 'done') continue;
                const pb = climbPbs[climbId];
                const activity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
                if (!hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, activity)) continue;
                next[climbId] = 'done';
            }
            return next;
        });
    }, [filteredClimbs, climbPbs, pbVenueFilter, activityById]);

    const bucketSyncLabel = formatBucketListSyncLabel({
        isSignedIn,
        updatedAt: initialState?.updatedAt,
        pbScanCompletedAt: initialState?.pbScanCompletedAt,
    });

    const exportRowCount = useMemo(
        () => buildBucketListExportRows(
            { climbStatus, climbPbs, updatedAt: initialState?.updatedAt, pbScanCompletedAt: initialState?.pbScanCompletedAt },
            climbDatabase,
            activities,
        ).length,
        [climbStatus, climbPbs, climbDatabase, activities, initialState?.updatedAt, initialState?.pbScanCompletedAt],
    );

    const prepZwoCount = useMemo(
        () => countBucketListPrepWorkouts(climbDatabase, climbStatus),
        [climbDatabase, climbStatus],
    );

    const handleExportPrepZwo = useCallback(() => {
        const workouts = listBucketListPrepWorkouts(climbDatabase, climbStatus, { ftp });
        const n = downloadZwoWorkouts(workouts);
        if (n === 0) {
            setScanFeedback({
                tone: 'warn',
                message: 'Mark climbs as Planned or Want to generate prep workouts.',
                at: Date.now(),
            });
        } else {
            setScanFeedback({
                tone: 'success',
                message: `Downloading ${n} climb prep .zwo file(s) for Zwift / TrainerRoad.`,
                at: Date.now(),
            });
        }
    }, [climbDatabase, climbStatus, ftp]);

    const handleExportDonePbCsv = useCallback(() => {
        const n = downloadBucketListDonePbCsv(
            { climbStatus, climbPbs, updatedAt: initialState?.updatedAt, pbScanCompletedAt: initialState?.pbScanCompletedAt },
            climbDatabase,
            activities,
        );
        if (n === 0) {
            setScanFeedback({
                tone: 'warn',
                message: 'Nothing to export yet — mark climbs as Done or scan activities for PBs.',
                at: Date.now(),
            });
        } else {
            setScanFeedback({
                tone: 'success',
                message: `Exported ${n} climb(s) (Done + PB) to CSV.`,
                at: Date.now(),
            });
        }
    }, [climbStatus, climbPbs, climbDatabase, activities, initialState?.updatedAt, initialState?.pbScanCompletedAt]);

    const handleExportDonePbJson = useCallback(() => {
        const n = downloadBucketListDonePbJson(
            { climbStatus, climbPbs, updatedAt: initialState?.updatedAt, pbScanCompletedAt: initialState?.pbScanCompletedAt },
            climbDatabase,
            activities,
        );
        if (n === 0) {
            setScanFeedback({
                tone: 'warn',
                message: 'Nothing to export yet — mark climbs as Done or scan activities for PBs.',
                at: Date.now(),
            });
        } else {
            setScanFeedback({
                tone: 'success',
                message: `Exported ${n} climb(s) (Done + PB) to JSON.`,
                at: Date.now(),
            });
        }
    }, [climbStatus, climbPbs, climbDatabase, activities, initialState?.updatedAt, initialState?.pbScanCompletedAt]);

    const climbRowVirtualizer = useVirtualizer({
        count: filteredClimbs.length,
        getScrollElement: () => climbListScrollRef.current,
        estimateSize: () => 155,
        overscan: 8,
        measureElement: (el) => el?.getBoundingClientRect().height ?? 155,
    });

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Mountain className="text-orange-400" />
                    Climb Bucket List
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    {achievements.stats.totalDone} / {climbDatabase.length} completed
                </div>
            </div>
            <p className="text-[11px] text-cdmuted leading-snug" role="status">
                {bucketSyncLabel}
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">Export</span>
                <button
                    type="button"
                    onClick={handleExportDonePbCsv}
                    disabled={exportRowCount === 0}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent disabled:opacity-40 cd-transition"
                    title="Download Done climbs and PB rows as CSV"
                >
                    <Download size={12} aria-hidden />
                    Done + PB CSV
                </button>
                <button
                    type="button"
                    onClick={handleExportDonePbJson}
                    disabled={exportRowCount === 0}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent disabled:opacity-40 cd-transition"
                    title="Download Done climbs and PB rows as JSON"
                >
                    <Download size={12} aria-hidden />
                    Done + PB JSON
                </button>
                <button
                    type="button"
                    onClick={handleExportPrepZwo}
                    disabled={prepZwoCount === 0}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdprimary hover:text-cdprimary disabled:opacity-40 cd-transition"
                    title="Download hill-repeat .zwo prep workouts for Planned and Want climbs"
                >
                    <Download size={12} aria-hidden />
                    Prep .zwo (planned / want)
                </button>
                <span className="text-[10px] text-cdmuted">
                    {exportRowCount > 0
                        ? `${exportRowCount} climb(s) ready (Done or with a PB).`
                        : 'Mark climbs Done or scan for PBs to export.'}
                    {prepZwoCount > 0 ? ` · ${prepZwoCount} prep .zwo ready (Planned/Want).` : ''}
                </span>
            </div>

            {/* Stats & Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <h3 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                        <Trophy className="text-cdprimary" size={16} />
                        Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-cdmuted text-xs">Completed</p>
                            <p className="text-cdtext font-bold text-lg">{achievements.stats.totalDone}</p>
                        </div>
                        <div>
                            <p className="text-cdmuted text-xs">Total elevation</p>
                            <p className="text-cdtext font-bold text-lg">{Math.round(achievements.stats.totalElevation).toLocaleString('nl-NL')}m</p>
                        </div>
                        <div>
                            <p className="text-cdmuted text-xs">Avg. gradient</p>
                            <p className="text-cdtext font-bold text-lg">{achievements.stats.avgGrade}%</p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-cdmuted text-xs">Hardest col</p>
                            <p
                                className="text-cdtext font-bold text-sm leading-snug line-clamp-2 break-words"
                                title={achievements.stats.hardestClimb?.name || undefined}
                            >
                                {achievements.stats.hardestClimb?.name || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <h3 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                        <Star className="text-cdprimary" size={16} />
                        Achievements ({achievements.badges.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {achievements.badges.length === 0 ? (
                            <p className="text-cdmuted text-xs">Complete your first climb to earn badges!</p>
                        ) : (
                            achievements.badges.map((badge, idx) => (
                                <div key={idx} className="bg-cdsurface p-2 rounded text-xs">
                                    <p className="font-bold text-cdprimary">{badge.title}</p>
                                    <p className="text-cdmuted">{badge.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <PlannedClimbWeatherPanel
                bucketState={{ climbStatus, climbPbs }}
                climbs={climbDatabase}
                onOpenWeatherForClimb={onOpenWeatherForClimb}
                onOpenProfilerForClimb={onOpenProfilerForClimb}
                onOpenMapTab={onOpenMapTab}
            />

            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-cdmuted">
                        Personal bests match from activity title or Strava description (MyCols, ClimbFinder).
                        Outdoor rides match real climbs; indoor/virtual rides match Zwift portal climbs only. PBs need the climb name in the ride title or a MyCols/ClimbFinder description — not Activity Log “Similar to …” hints.
                    </p>
                    <button
                        type="button"
                        onClick={handleScanPbs}
                        disabled={!activities?.length || isScanning}
                        aria-busy={isScanning}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent disabled:opacity-40 cd-transition"
                    >
                        <Sparkles size={14} aria-hidden className={isScanning ? 'animate-pulse' : ''} />
                        {isScanning
                            ? (scanProgress?.total
                                ? `Scanning… ${scanProgress.done.toLocaleString('en-GB')} / ${scanProgress.total.toLocaleString('en-GB')}`
                                : 'Scanning…')
                            : 'Scan activities for PBs'}
                    </button>
                </div>

                {scanFeedback ? (
                    <div
                        role="status"
                        className={`rounded-lg border px-3 py-2 text-xs leading-snug ${
                            scanFeedback.tone === 'success'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                : scanFeedback.tone === 'warn'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                                  : 'border-cdborder bg-cdbg/40 text-cdtext'
                        }`}
                    >
                        {scanFeedback.message}
                    </div>
                ) : (
                    <p className="text-[10px] text-cdmuted">
                        After scanning you will see a summary here (activities scanned, PB count, new matches).
                        Strava descriptions: Activities → bulk → Strava descriptions (not from Intervals).
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">PB view</span>
                    {PB_VENUE_FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPbVenueFilter(opt.id)}
                            aria-pressed={pbVenueFilter === opt.id}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full border cd-transition ${pbVenueFilter === opt.id
                                ? opt.id === 'virtual'
                                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-300'
                                    : opt.id === 'outdoor'
                                        ? 'bg-green-600/20 border-green-600/50 text-green-800 dark:text-green-300'
                                        : 'bg-cdaccent/20 border-cdaccent/50 text-cdaccent'
                                : 'bg-cdsurface border-cdborder text-cdmuted hover:text-cdtext'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cdmuted" size={16} />
                    <input
                        type="text"
                        placeholder="Search climb..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-cdprimary/50 focus:ring-4 focus:ring-cdprimary/10 focus:outline-none"
                    />
                </div>

                {/* Filter by status */}
                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-cdprimary/50 focus:ring-4 focus:ring-cdprimary/10 focus:outline-none"
                    >
                        <option value="all">All ({climbDatabase.length})</option>
                        <option value="done">Completed ({statusCounts.done})</option>
                        <option value="planned">Planned ({statusCounts.planned})</option>
                        <option value="want">Want to do ({statusCounts.want})</option>
                        <option value="todo">To do ({statusCounts.todo})</option>
                        <option value="with_pb">With activity PB ({statusFilterCounts.with_pb})</option>
                        <option value="pb_not_done">PB not marked Done ({statusFilterCounts.pb_not_done})</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-cdprimary/50 focus:ring-4 focus:ring-cdprimary/10 focus:outline-none"
                    >
                        <option value="name">Sort: Name</option>
                        <option value="difficulty">Sort: Difficulty</option>
                        <option value="status">Sort: Status</option>
                    </select>
                </div>
            </div>

            {/* Climb List */}
            <div className="bg-cdbg p-4 rounded border border-cdborder">
                <h3 className="text-cdtext font-bold text-sm mb-3 uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
                    <span>Climbs ({filteredClimbs.length})</span>
                    {visiblePbNotDoneCount > 0 && (
                        <button
                            type="button"
                            onClick={markVisiblePbAsDone}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-md border border-green-600/50 bg-green-600/10 text-green-800 dark:text-green-300 hover:bg-green-600/20 cd-transition"
                        >
                            Mark {visiblePbNotDoneCount} visible PB as Done
                        </button>
                    )}
                </h3>
                <div
                    ref={climbListScrollRef}
                    className="max-h-96 overflow-y-auto custom-scrollbar"
                >
                    {filteredClimbs.length === 0 ? (
                        <p className="text-sm text-cdmuted text-center py-6">
                            {filterStatus === 'with_pb'
                                ? 'No climbs with a scanned personal best yet. Run “Scan activities for PBs” above.'
                                : filterStatus === 'pb_not_done'
                                  ? 'No climbs with a PB that still need marking as Done.'
                                  : 'No climbs match your filters.'}
                        </p>
                    ) : (
                        <div
                            className="relative w-full"
                            style={{ height: `${climbRowVirtualizer.getTotalSize()}px` }}
                        >
                            {climbRowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const climb = filteredClimbs[virtualRow.index];
                                const climbId = String(climb.id);
                                const status = climbStatus[climbId];
                                const pb = climbPbs[climbId] ?? climbPbs[climb.id];
                                const pbActivity = pb?.activityId ? activityById.get(String(pb.activityId)) : null;
                                const showPb = hasStoredClimbPb(climbPbs, climb.id, climb, pbVenueFilter, pbActivity);

                                return (
                                    <div
                                        key={climbId}
                                        data-index={virtualRow.index}
                                        ref={climbRowVirtualizer.measureElement}
                                        className="absolute left-0 top-0 w-full pb-2"
                                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                                    >
                                        <BucketListClimbRow
                                            climb={climb}
                                            status={status}
                                            showPb={showPb}
                                            pb={pb}
                                            pbActivity={pbActivity}
                                            activities={activities}
                                            onToggleStatus={toggleClimbStatus}
                                            onRemovePb={removeClimbPb}
                                            onOpenActivityInLog={onOpenActivityInLog}
                                            onOpenProfilerForClimb={onOpenProfilerForClimb}
                                            onOpenWeatherForClimb={onOpenWeatherForClimb}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BucketList;
