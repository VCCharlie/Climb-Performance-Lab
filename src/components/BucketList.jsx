import React, { useState, useMemo } from 'react';
import { Mountain, Check, Clock, Star, Trophy, Filter, Search } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';
import FlagIcon from './FlagIcon';

const BucketList = ({ initialState, onStateChange }) => {
    // State: climb status (done, planned, want)
    const [climbStatus, setClimbStatus] = useState(initialState?.climbStatus || {});
    const [filterStatus, setFilterStatus] = useState('all'); // all, done, planned, want, todo
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, difficulty, status

    // Update parent when state changes
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({ climbStatus });
        }
    }, [climbStatus, onStateChange]);

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
        for (const climb of CLIMB_DATABASE) {
            if (climbStatus[climb.id] === 'done') {
                doneClimbs.push(climb);
            }
        }
        const doneLength = doneClimbs.length;

        const badges = [];

        // First climb
        if (doneLength >= 1) {
            badges.push({ title: '🚴 First Ascent', description: 'Voltooid je eerste beklimming!' });
        }

        // Milestones
        if (doneLength >= 5) {
            badges.push({ title: '⭐ Klim Enthousiast', description: '5 beklimmingen voltooid' });
        }
        if (doneLength >= 10) {
            badges.push({ title: '🏅 Klim Specialist', description: '10 beklimmingen voltooid' });
        }
        if (doneLength >= 25) {
            badges.push({ title: '👑 Klim Koning', description: '25 beklimmingen voltooid' });
        }
        if (doneLength >= 50) {
            badges.push({ title: '🦅 Berg Legende', description: '50 beklimmingen voltooid' });
        }

        // Specific regions
        const frenchClimbs = doneClimbs.filter(c => c.country === 'FR').length;
        const italianClimbs = doneClimbs.filter(c => c.country === 'IT').length;
        const swissClimbs = doneClimbs.filter(c => c.country === 'CH').length;
        const zwiftClimbs = doneClimbs.filter(c => c.country === 'ZWIFT').length;

        if (frenchClimbs >= 10) {
            badges.push({ title: '🇫🇷 Alpen Expert', description: '10 Franse cols voltooid' });
        }
        if (italianClimbs >= 5) {
            badges.push({ title: '🇮🇹 Giro Specialist', description: '5 Italiaanse cols voltooid' });
        }
        if (swissClimbs >= 3) {
            badges.push({ title: '🇨🇭 Swiss Master', description: '3 Zwitserse cols voltooid' });
        }
        if (zwiftClimbs >= 5) {
            badges.push({ title: '🎮 Virtual Climber', description: '5 Zwift climbs voltooid' });
        }

        // Difficulty badges
        const hardClimbs = doneClimbs.filter(c => c.avgGrade > 8).length;
        if (hardClimbs >= 5) {
            badges.push({ title: '⛰️ Steep Master', description: '5 cols >8% gemiddeld voltooid' });
        }

        // Iconic climbs
        const iconicClimbs = ['fr_alpe', 'fr_ventoux', 'fr_tourmalet', 'it_stelvio', 'it_zoncolan'];
        const iconicDone = doneClimbs.filter(c => iconicClimbs.includes(c.id)).length;
        if (iconicDone >= 3) {
            badges.push({ title: '🏆 Iconische Cols', description: '3 legendarische cols voltooid' });
        }

        // Total elevation
        // Single-pass optimization for stats
        let totalElevation = 0;
        let totalGrade = 0;
        let hardestClimb = doneClimbs.length > 0 ? doneClimbs[0] : null;
        let maxScore = hardestClimb ? (hardestClimb.elevation * hardestClimb.elevation) / (hardestClimb.lengthKm * 10000) : 0;

        for (const c of doneClimbs) {
            totalElevation += c.elevation;
            totalGrade += c.avgGrade;

            const cScore = (c.elevation * c.elevation) / (c.lengthKm * 10000);
            if (cScore > maxScore) {
                maxScore = cScore;
                hardestClimb = c;
            }
        }

        if (totalElevation >= 10000) {
            badges.push({ title: '📈 Everest Challenge', description: `${Math.round(totalElevation)}m totaal geklommen!` });
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
    }, [climbStatus]);

    // Pre-calculate status counts for the filter dropdown in a single pass (O(N) vs 4 * O(N))
    const statusCounts = useMemo(() => {
        let done = 0, planned = 0, want = 0, todo = CLIMB_DATABASE.length;
        for (const status of Object.values(climbStatus)) {
            if (status === 'done') { done++; todo--; }
            else if (status === 'planned') { planned++; todo--; }
            else if (status === 'want') { want++; todo--; }
        }
        return { done, planned, want, todo };
    }, [climbStatus]);

    // Filter and sort climbs
    const filteredClimbs = useMemo(() => {
        let filtered = CLIMB_DATABASE;

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(climb =>
                climb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                climb.country.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (filterStatus !== 'all') {
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
    }, [searchTerm, filterStatus, sortBy, climbStatus]);

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Mountain className="text-orange-400" />
                    Climb Bucket List
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    {achievements.stats.totalDone} / {CLIMB_DATABASE.length} voltooid
                </div>
            </div>

            {/* Stats & Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <h3 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                        <Trophy className="text-yellow-400" size={16} />
                        Statistieken
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-cdmuted text-xs">Voltooid</p>
                            <p className="text-cdtext font-bold text-lg">{achievements.stats.totalDone}</p>
                        </div>
                        <div>
                            <p className="text-cdmuted text-xs">Totaal hoogtemeters</p>
                            <p className="text-cdtext font-bold text-lg">{Math.round(achievements.stats.totalElevation).toLocaleString('nl-NL')}m</p>
                        </div>
                        <div>
                            <p className="text-cdmuted text-xs">Gem. hellingspercentage</p>
                            <p className="text-cdtext font-bold text-lg">{achievements.stats.avgGrade}%</p>
                        </div>
                        <div>
                            <p className="text-cdmuted text-xs">Zwaarste col</p>
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
                            <p className="text-cdmuted text-xs">Voltooi je eerste climb om badges te verdienen!</p>
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

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cdmuted" size={16} />
                    <input
                        type="text"
                        placeholder="Zoek climb..."
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
                        <option value="all">Alle ({CLIMB_DATABASE.length})</option>
                        <option value="done">Voltooid ({statusCounts.done})</option>
                        <option value="planned">Gepland ({statusCounts.planned})</option>
                        <option value="want">Wil doen ({statusCounts.want})</option>
                        <option value="todo">Te doen ({statusCounts.todo})</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-yellow-400 outline-none"
                    >
                        <option value="name">Sorteer: Naam</option>
                        <option value="difficulty">Sorteer: Moeilijkheid</option>
                        <option value="status">Sorteer: Status</option>
                    </select>
                </div>
            </div>

            {/* Climb List */}
            <div className="bg-cdbg p-4 rounded border border-cdborder">
                <h3 className="text-cdtext font-bold text-sm mb-3 uppercase tracking-wide">
                    Beklimmingen ({filteredClimbs.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {filteredClimbs.map(climb => {
                        const status = climbStatus[climb.id];
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
                                    </div>

                                    {/* Status buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'done')}
                                            className={`p-1.5 rounded transition-colors ${status === 'done'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-green-100 hover:text-green-600'
                                                }`}
                                            title="Voltooid"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'planned')}
                                            className={`p-1.5 rounded transition-colors ${status === 'planned'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-blue-100 hover:text-blue-600'
                                                }`}
                                            title="Gepland"
                                        >
                                            <Clock size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'want')}
                                            className={`p-1.5 rounded transition-colors ${status === 'want'
                                                ? 'bg-yellow-500 text-white'
                                                : 'bg-cdborder text-cdmuted hover:bg-yellow-100 hover:text-yellow-600'
                                                }`}
                                            title="Wil doen"
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
