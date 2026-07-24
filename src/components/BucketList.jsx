import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Mountain, Check, Clock, Star, Trophy, Filter, Search, Sparkles } from 'lucide-react';
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
import { yieldToMain } from '../utils/yieldToMain';

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
];

function statusPillClass(active) {
    return active
        ? 'bg-cdaccent/20 text-cdaccent border-cdaccent/50'
        : 'bg-cdsurface border-cdborder text-cdmuted hover:text-cdtext hover:border-cdborder';
}

const BucketList = ({
    initialState,
    remoteRevision = 0,
    onStateChange,
    onOpenWeatherForClimb,
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

    useEffect(() => {
        if (!parentSyncToken) return;
        skipParentNotifyRef.current = true;
        setClimbStatus(initialState?.climbStatus || {});
        setClimbPbs(initialState?.climbPbs || {});
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
            onStateChange({ climbStatus, climbPbs });
        }
    }, [climbStatus, climbPbs, onStateChange]);

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
            // Only update PBs here. Status toggles during the async scan must not be
            // overwritten by a closed-over climbStatus; the effect above notifies parent.
            setClimbPbs(summary.replaced);
            setScanFeedback({
                tone: summary.newClimbs > 0 || summary.improvedPbs > 0 || summary.removedPbs > 0 ? 'success' : 'info',
                message: formatPbScanFeedbackMessage(summary),
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

    const statusFilterCounts = useMemo(() => ({
        all: climbDatabase.length,
        done: statusCounts.done,
        planned: statusCounts.planned,
        want: statusCounts.want,
        todo: statusCounts.todo,
        with_pb: pbCount,
    }), [climbDatabase.length, statusCounts, pbCount]);

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

    const climbRowVirtualizer = useVirtualizer({
        count: filteredClimbs.length,
        getScrollElement: () => climbListScrollRef.current,
        estimateSize: () => 118,
        overscan: 8,
        measureElement: (el) => el?.getBoundingClientRect().height ?? 118,
    });

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Mountain className="text-orange-400" />
                    Climb Bucket List
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    {achievements.stats.totalDone} / {climbDatabase.length} completed
                </div>
            </div>

            {/* Stats & Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <h3 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                        <Trophy className="text-yellow-400" size={16} />
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
                        <Star className="text-yellow-400" size={16} />
                        Achievements ({achievements.badges.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {achievements.badges.length === 0 ? (
                            <p className="text-cdmuted text-xs">Complete your first climb to earn badges!</p>
                        ) : (
                            achievements.badges.map((badge, idx) => (
                                <div key={idx} className="bg-cdsurface p-2 rounded text-xs">
                                    <p className="font-bold text-yellow-400">{badge.title}</p>
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
                        className="w-full pl-10 pr-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-yellow-400 outline-none"
                    />
                </div>

                {/* Filter by status */}
                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-yellow-400 outline-none"
                    >
                        <option value="all">All ({climbDatabase.length})</option>
                        <option value="done">Completed ({statusCounts.done})</option>
                        <option value="planned">Planned ({statusCounts.planned})</option>
                        <option value="want">Want to do ({statusCounts.want})</option>
                        <option value="todo">To do ({statusCounts.todo})</option>
                        <option value="with_pb">With activity PB ({pbCount})</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-yellow-400 outline-none"
                    >
                        <option value="name">Sort: Name</option>
                        <option value="difficulty">Sort: Difficulty</option>
                        <option value="status">Sort: Status</option>
                    </select>
                </div>
            </div>

            {/* Climb List */}
            <div className="bg-cdbg p-4 rounded border border-cdborder">
                <h3 className="text-cdtext font-bold text-sm mb-3 uppercase tracking-wide">
                    Climbs ({filteredClimbs.length})
                </h3>
                <div
                    ref={climbListScrollRef}
                    className="max-h-96 overflow-y-auto custom-scrollbar"
                >
                    {filteredClimbs.length === 0 ? (
                        <p className="text-sm text-cdmuted text-center py-6">
                            {filterStatus === 'with_pb'
                                ? 'No climbs with a scanned personal best yet. Run “Scan activities for PBs” above.'
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
                                            onOpenActivityInLog={onOpenActivityInLog}
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
