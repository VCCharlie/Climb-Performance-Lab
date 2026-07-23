import React, { useState, useMemo, useEffect } from 'react';
import { Mountain, Check, Clock, Star, Trophy, Filter, Search, Sparkles } from 'lucide-react';
import { useClimbDatabase } from '../hooks/useClimbDatabase';
import { useActivitiesList } from '../hooks/useActivities';
import FlagIcon from './FlagIcon';
import PlannedClimbWeatherPanel from './bucket-list/PlannedClimbWeatherPanel';
import { mergeClimbPbs } from '../utils/bucketListState';
import { scanClimbPersonalBests, formatPbSummary, hasStoredClimbPb, countClimbsWithPb } from '../utils/climbPersonalBests';

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
    onStateChange,
    onOpenWeatherForClimb,
    onOpenMapTab,
}) => {
    const { climbs: climbDatabase, loadFull } = useClimbDatabase();
    const activities = useActivitiesList();

    useEffect(() => {
        loadFull();
    }, [loadFull]);
    // State: climb status (done, planned, want) + optional PBs
    const [climbStatus, setClimbStatus] = useState(initialState?.climbStatus || {});
    const [climbPbs, setClimbPbs] = useState(initialState?.climbPbs || {});
    const [filterStatus, setFilterStatus] = useState('all'); // all, done, planned, want, todo, with_pb
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, difficulty, status

    // Update parent when state changes
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({ climbStatus, climbPbs });
        }
    }, [climbStatus, climbPbs, onStateChange]);

    const handleScanPbs = () => {
        const scanned = scanClimbPersonalBests(activities, climbDatabase);
        setClimbPbs((prev) => ({ ...prev, ...scanned }));
        if (onStateChange) {
            onStateChange(mergeClimbPbs({ climbStatus, climbPbs }, scanned));
        }
    };

    // Toggle climb status
    const toggleClimbStatus = (climbId, status) => {
        setClimbStatus(prev => ({
            ...prev,
            [climbId]: prev[climbId] === status ? null : status
        }));
    };

    // Calculate achievements
    const achievements = useMemo(() => {
        const doneClimbs = [];
        for (const climb of climbDatabase) {
            if (climbStatus[climb.id] === 'done') {
                doneClimbs.push(climb);
            }
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
    }, [climbStatus, climbDatabase]);

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

    const pbCount = useMemo(() => countClimbsWithPb(climbPbs), [climbPbs]);

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
            filtered = filtered.filter((climb) => hasStoredClimbPb(climbPbs, climb.id));
        } else if (filterStatus !== 'all') {
            filtered = filtered.filter(climb => {
                const status = climbStatus[climb.id];
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
                return (statusOrder[climbStatus[a.id]] || 3) - (statusOrder[climbStatus[b.id]] || 3);
            }
            return 0;
        });

        return filtered;
    }, [searchTerm, filterStatus, sortBy, climbStatus, climbDatabase, climbPbs]);

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
                        <div>
                            <p className="text-cdmuted text-xs">Hardest col</p>
                            <p className="text-cdtext font-bold text-sm">{achievements.stats.hardestClimb?.name.substring(0, 15) || '-'}</p>
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

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-cdmuted">
                    Personal bests are matched from activity titles (same logic as Climb Profiler).
                </p>
                <button
                    type="button"
                    onClick={handleScanPbs}
                    disabled={!activities?.length}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent disabled:opacity-40 cd-transition"
                >
                    <Sparkles size={14} aria-hidden />
                    Scan activities for PBs
                </button>
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
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {filteredClimbs.length === 0 ? (
                        <p className="text-sm text-cdmuted text-center py-6">
                            {filterStatus === 'with_pb'
                                ? 'No climbs with a scanned personal best yet. Run “Scan activities for PBs” above.'
                                : 'No climbs match your filters.'}
                        </p>
                    ) : filteredClimbs.map(climb => {
                        const status = climbStatus[climb.id];
                        const pb = climbPbs[climb.id];
                        const pbLabel = formatPbSummary(pb);
                        return (
                            <div
                                key={climb.id}
                                className={`p-3 rounded border transition-all ${status === 'done'
                                    ? 'bg-green-50 border-green-200'
                                    : status === 'planned'
                                        ? 'bg-blue-50 border-blue-200'
                                        : status === 'want'
                                            ? 'bg-yellow-50 border-yellow-200'
                                            : 'bg-cdsurface border-cdborder hover:border-cdborder'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h4 className="text-cdtext font-bold text-sm flex items-center gap-2">
                                            <FlagIcon country={climb.country} size="sm" />
                                            {climb.name}
                                            {status === 'done' && <Check className="text-green-500" size={16} />}
                                        </h4>
                                        <p className="text-cdmuted text-xs mt-1">
                                            {climb.lengthKm}km • {climb.elevation}m • {climb.avgGrade}% avg
                                        </p>
                                        {pbLabel && (
                                            <p className="text-[10px] text-cdaccent mt-1 font-medium" title={pb?.activityTitle || ''}>
                                                PB: {pbLabel}
                                            </p>
                                        )}
                                    </div>

                                    {/* Status buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'done')}
                                            className={`p-1.5 rounded transition-colors ${status === 'done'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-green-100 hover:text-green-600'
                                                }`}
                                            title="Completed"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'planned')}
                                            className={`p-1.5 rounded transition-colors ${status === 'planned'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-blue-100 hover:text-blue-600'
                                                }`}
                                            title="Planned"
                                        >
                                            <Clock size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'want')}
                                            className={`p-1.5 rounded transition-colors ${status === 'want'
                                                ? 'bg-yellow-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-yellow-100 hover:text-yellow-600'
                                                }`}
                                            title="Want to do"
                                        >
                                            <Star size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BucketList;
