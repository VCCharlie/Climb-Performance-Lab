import React, { useState, useMemo } from 'react';
import { Mountain, Check, Clock, Star, Trophy, Filter, Search } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';

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
        const done = Object.entries(climbStatus).filter(([_, status]) => status === 'done').map(([id]) => id);
        const doneClimbs = done.map(id => CLIMB_DATABASE.find(c => c.id === id)).filter(Boolean);

        const badges = [];

        // First climb
        if (done.length >= 1) {
            badges.push({ title: '🚴 First Ascent', description: 'Voltooid je eerste beklimming!' });
        }

        // Milestones
        if (done.length >= 5) {
            badges.push({ title: '⭐ Klim Enthousiast', description: '5 beklimmingen voltooid' });
        }
        if (done.length >= 10) {
            badges.push({ title: '🏅 Klim Specialist', description: '10 beklimmingen voltooid' });
        }
        if (done.length >= 25) {
            badges.push({ title: '👑 Klim Koning', description: '25 beklimmingen voltooid' });
        }
        if (done.length >= 50) {
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
        const iconicDone = done.filter(id => iconicClimbs.includes(id)).length;
        if (iconicDone >= 3) {
            badges.push({ title: '🏆 Iconische Cols', description: '3 legendarische cols voltooid' });
        }

        // Total elevation
        const totalElevation = doneClimbs.reduce((sum, c) => sum + c.elevation, 0);
        if (totalElevation >= 10000) {
            badges.push({ title: '📈 Everest Challenge', description: `${Math.round(totalElevation)}m totaal geklommen!` });
        }

        return {
            badges,
            stats: {
                totalDone: done.length,
                totalElevation,
                avgGrade: doneClimbs.length > 0 ? (doneClimbs.reduce((sum, c) => sum + c.avgGrade, 0) / doneClimbs.length).toFixed(1) : 0,
                hardestClimb: doneClimbs.length > 0 ? doneClimbs.reduce((max, c) => c.avgGrade > max.avgGrade ? c : max, doneClimbs[0]) : null
            }
        };
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
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Mountain className="text-orange-400" />
                    Climb Bucket List
                </h2>
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    {achievements.stats.totalDone} / {CLIMB_DATABASE.length} voltooid
                </div>
            </div>

            {/* Stats & Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-slate-900 p-4 rounded border border-slate-700">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Trophy className="text-yellow-400" size={16} />
                        Statistieken
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-slate-400 text-xs">Voltooid</p>
                            <p className="text-white font-bold text-lg">{achievements.stats.totalDone}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Totaal hoogtemeters</p>
                            <p className="text-white font-bold text-lg">{Math.round(achievements.stats.totalElevation)}m</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Gem. hellingspercentage</p>
                            <p className="text-white font-bold text-lg">{achievements.stats.avgGrade}%</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Zwaarste col</p>
                            <p className="text-white font-bold text-sm">{achievements.stats.hardestClimb?.name.substring(0, 15) || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="bg-slate-900 p-4 rounded border border-slate-700">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Star className="text-yellow-400" size={16} />
                        Achievements ({achievements.badges.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {achievements.badges.length === 0 ? (
                            <p className="text-slate-500 text-xs">Voltooi je eerste climb om badges te verdienen!</p>
                        ) : (
                            achievements.badges.map((badge, idx) => (
                                <div key={idx} className="bg-slate-800 p-2 rounded text-xs">
                                    <p className="font-bold text-yellow-400">{badge.title}</p>
                                    <p className="text-slate-400">{badge.description}</p>
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Zoek climb..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-yellow-400 outline-none"
                    />
                </div>

                {/* Filter by status */}
                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-yellow-400 outline-none"
                    >
                        <option value="all">Alle ({CLIMB_DATABASE.length})</option>
                        <option value="done">Voltooid ({Object.values(climbStatus).filter(s => s === 'done').length})</option>
                        <option value="planned">Gepland ({Object.values(climbStatus).filter(s => s === 'planned').length})</option>
                        <option value="want">Wil doen ({Object.values(climbStatus).filter(s => s === 'want').length})</option>
                        <option value="todo">Te doen ({CLIMB_DATABASE.length - Object.keys(climbStatus).length})</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-yellow-400 outline-none"
                    >
                        <option value="name">Sorteer: Naam</option>
                        <option value="difficulty">Sorteer: Moeilijkheid</option>
                        <option value="status">Sorteer: Status</option>
                    </select>
                </div>
            </div>

            {/* Climb List */}
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wide">
                    Beklimmingen ({filteredClimbs.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {filteredClimbs.map(climb => {
                        const status = climbStatus[climb.id];
                        return (
                            <div
                                key={climb.id}
                                className={`p-3 rounded border transition-all ${status === 'done'
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : status === 'planned'
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : status === 'want'
                                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                            {climb.flag} {climb.name}
                                            {status === 'done' && <Check className="text-green-400" size={16} />}
                                        </h4>
                                        <p className="text-slate-400 text-xs mt-1">
                                            {climb.lengthKm}km • {climb.elevation}m • {climb.avgGrade}% avg
                                        </p>
                                    </div>

                                    {/* Status buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'done')}
                                            className={`p-1.5 rounded transition-colors ${status === 'done'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-green-500/20 hover:text-green-400'
                                                }`}
                                            title="Voltooid"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'planned')}
                                            className={`p-1.5 rounded transition-colors ${status === 'planned'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400'
                                                }`}
                                            title="Gepland"
                                        >
                                            <Clock size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleClimbStatus(climb.id, 'want')}
                                            className={`p-1.5 rounded transition-colors ${status === 'want'
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400'
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
