import React, { useMemo } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, CheckCircle, Activity, Battery } from 'lucide-react';
import { calculateRollingTrend } from '../utils';

const AICoach = ({ activities, userSettings }) => {

    // --- 1. SWOT ENGINE ---
    const swot = useMemo(() => {
        const now = new Date();
        const last30Days = activities.filter(a => {
            const d = new Date(a.date);
            return (now - d) / (1000 * 60 * 60 * 24) <= 30;
        });

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];

        // Consistency Check
        if (last30Days.length >= 12) strengths.push("Hoge consistentie (>3 ritten/week)");
        else if (last30Days.length < 4) weaknesses.push("Lage frequentie (<1 rit/week)");

        // Load Trend (TSB proxy)
        const recentLoad = last30Days.reduce((acc, curr) => acc + (curr.load || 0), 0);
        const avgWeeklyLoad = recentLoad / 4;

        if (avgWeeklyLoad > 400) strengths.push("Sterke basisconditie (CTL opbouw)");
        else if (avgWeeklyLoad < 100) opportunities.push("Ruimte voor volumeverhoging");

        // Freshness / Fatigue
        // Simple heuristic: if last week was very hard (>150% avg), threat.
        // If last week was easy, opportunity.
        // (Real TSB requires 42d vs 7d EMA, simplifying for MVP)

        // Intensity Distribution
        const highIntensity = last30Days.filter(a => (a.norm_power || 0) > (userSettings.ftp * 0.9)).length;
        if (highIntensity > 8) threats.push("Mogelijk te veel intensiteit (Monotony)");
        if (highIntensity < 2) weaknesses.push("Gebrek aan prikkels boven FTP");

        // Power Profile (Best 5m)
        const best5m = Math.max(...last30Days.map(a => a.best_5min || 0));
        if (best5m > userSettings.ftp * 1.1) strengths.push("Sterke VO2 Max (5m power)");

        // Fillers if empty
        if (strengths.length === 0) strengths.push("Geen recente uitschieters");
        if (weaknesses.length === 0) weaknesses.push("Geen duidelijke zwaktes");
        if (opportunities.length === 0) opportunities.push("Consolideer huidige vorm");
        if (threats.length === 0) threats.push("Geen acuut blessurerisico");

        return { strengths, weaknesses, opportunities, threats, avgWeeklyLoad };
    }, [activities, userSettings]);

    // --- 2. RECOMMENDATION ENGINE ---
    const recommendation = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        // Force day for testing via ?day=0 (Sun) to ?day=6 (Sat)
        // Default: Current Day
        const today = urlParams.get('day') ? parseInt(urlParams.get('day')) : new Date().getDay();

        // 0=Sun, 1=Mon, ..., 6=Sat
        const isWeekend = (today === 0 || today === 6);
        const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

        // Logic:
        // Weekday (Ma-Vr): < 1.5h. Focus: VO2 Max (30/15), Sweetspot (2x20), or Recovery.
        // Weekend (Za-Zo): > 2h. Focus: Endurance (Z2), Tempo (Z3), Long Climb.

        let title = "";
        let duration = "";
        let focus = "";
        let description = "";
        let type = "interval"; // endurance, interval, recovery

        if (isWeekend) {
            title = "Weekend Warrior: Endurance Volume";
            duration = "2.5u - 4.0u";
            focus = "Zone 2 (Endurance) + Tempo Climbs";
            description = "Gebruik je extra tijd voor volume. Zoek een heuvelachtig parcours en rijd de beklimmingen in Z3 (Tempo). Houd de rest strikt Z2.";
            type = "endurance";
        } else {
            // Weekday Logic
            // If user is "tired" (Threats has monotony?), suggest recovery.
            // Randomize slightly between VO2 and Sweetspot for now, or alternate based on day.
            if (today === 1 || today === 5) { // Mon/Fri often rest/easy
                title = "Active Recovery / Rest";
                duration = "45m - 60m";
                focus = "Zone 1 (Recovery)";
                description = "Houd de benen los, maar geen belasting. Hartslag laag, cadans hoog (95+ rpm).";
                type = "recovery";
            } else {
                // Tue/Wed/Thu -> Quality
                const hardSession = (today === 2 || today === 4) ? "VO2" : "SST";

                if (hardSession === "VO2") {
                    title = "Time Crunch: VO2 Max Micro-Bursts";
                    duration = "1u 15m";
                    focus = "3 sets van 10x (30s ON / 15s OFF)";
                    description = "Korte, hevige prikkels om je plafond te verhogen. 30s @ 120% FTP, 15s rust. Zeer efficiënt in korte tijd.";
                    type = "interval";
                } else {
                    title = "Time Crunch: Sweetspot Blocks";
                    duration = "1u 30m";
                    focus = "2x 20m @ 90% FTP";
                    description = "Vergroot je motor (TTE). Blokken net onder je omslagpunt. Mentaal zwaar, maar minder fysieke schade dan VO2.";
                    type = "interval";
                }
            }
        }

        return { dayName: dayNames[today], title, duration, focus, description, type };

    }, [swot]); // Re-calc if SWOT changes (in future could use TSB)

    const getTypeColor = (t) => {
        if (t === 'recovery') return 'text-green-400 border-green-500/50 bg-green-500/10';
        if (t === 'endurance') return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain className="text-purple-400" /> AI Performance Coach</h2>
                    <p className="text-sm text-slate-400">Based on your recent data ({activities.length} activities) & schedule constraints.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold text-white">{Math.round(swot.avgWeeklyLoad)} TSS</div>
                    <div className="text-xs text-slate-500 uppercase">Avg Weekly Load</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- 1. WORKOUT SUGGESTION (Left Col) --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className={`p-6 rounded-xl border-2 ${getTypeColor(recommendation.type)} transition-colors`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-2"><Calendar size={14} /> {recommendation.dayName} Recommendation</span>
                            {recommendation.type === 'interval' && <Activity size={18} />}
                            {recommendation.type === 'recovery' && <Battery size={18} />}
                            {recommendation.type === 'endurance' && <TrendingUp size={18} />}
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">{recommendation.title}</h3>

                        <div className="flex gap-4 mb-4 text-sm font-mono opacity-90">
                            <span className="flex items-center gap-1"><ClockIcon /> {recommendation.duration}</span>
                        </div>

                        <div className="bg-slate-900/50 p-3 rounded mb-4">
                            <span className="text-xs uppercase font-bold opacity-60 block mb-1">Main Focus</span>
                            <span className="font-bold text-white">{recommendation.focus}</span>
                        </div>

                        <p className="text-sm leading-relaxed opacity-80">
                            {recommendation.description}
                        </p>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-slate-400 text-sm italic">
                        "Consistency beats intensity. It's better to do 1 hour today than to skip it and try to do 4 hours on Sunday."
                    </div>
                </div>

                {/* --- 2. SWOT MATRIX (Right Col, 2 span) --- */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-green-500">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Strengths (Interne Kracht)</h4>
                        <ul className="space-y-2">
                            {swot.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 bg-green-500 rounded-full"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-red-500">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Weaknesses (Aandachtspunten)</h4>
                        <ul className="space-y-2">
                            {swot.weaknesses.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Opportunities (Kansen)</h4>
                        <ul className="space-y-2">
                            {swot.opportunities.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 bg-blue-500 rounded-full"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Threats */}
                    <div className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-yellow-500">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><Activity size={16} className="text-yellow-500" /> Threats (Risico's)</h4>
                        <ul className="space-y-2">
                            {swot.threats.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 bg-yellow-500 rounded-full"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Icon Helper
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default AICoach;
