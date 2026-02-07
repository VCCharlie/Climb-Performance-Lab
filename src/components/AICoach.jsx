import React, { useMemo } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, CheckCircle, Activity, Battery, Download } from 'lucide-react';

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
        if (last30Days.length >= 12) {
            strengths.push({
                label: "Hoge consistentie",
                context: `${last30Days.length} ritten in 30 dagen (>3x/week).`
            });
        } else if (last30Days.length < 4) {
            weaknesses.push({
                label: "Lage frequentie",
                context: `Slechts ${last30Days.length} ritten in afgelopen maand. Probeer minimaal 2x/week.`
            });
        }

        // Load Trend (TSB proxy)
        const recentLoad = last30Days.reduce((acc, curr) => acc + (curr.load || 0), 0);
        const avgWeeklyLoad = recentLoad / 4;

        if (avgWeeklyLoad > 400) {
            strengths.push({
                label: "Sterke basisconditie",
                context: `Gemiddelde weekload is ${Math.round(avgWeeklyLoad)} TSS (Hoog).`
            });
        } else if (avgWeeklyLoad < 100) {
            opportunities.push({
                label: "Ruimte voor volumeverhoging",
                context: `Huidige load (${Math.round(avgWeeklyLoad)} TSS/wk) laat ruimte voor progressie.`
            });
        }

        // Intensity Distribution
        const highIntensity = last30Days.filter(a => (a.norm_power || 0) > (userSettings.ftp * 0.9)).length;
        if (highIntensity > 8) {
            threats.push({
                label: "Monotony Risico",
                context: `${highIntensity} zware ritten (>90% FTP) in 30 dagen. Pas op voor overtraining.`
            });
        }
        if (highIntensity < 2) {
            weaknesses.push({
                label: "Gebrek aan intensiteit",
                context: "Te weinig prikkels boven FTP om plafond te verhogen."
            });
        }

        // Power Profile (Best 5m)
        const best5m = Math.max(...last30Days.map(a => a.best_5min || 0));
        if (best5m > userSettings.ftp * 1.15) {
            strengths.push({
                label: "Sterke VO2 Max",
                context: `Je 5m power (${best5m}W) is zeer sterk t.o.v. je FTP.`
            });
        }

        // Fillers if empty
        if (strengths.length === 0) strengths.push({ label: "Geen recente uitschieters", context: "Blijf bouwen aan consistentie." });
        if (weaknesses.length === 0) weaknesses.push({ label: "Geen duidelijke zwaktes", context: "Goed gebalanceerde trainingsmandaat." });
        if (opportunities.length === 0) opportunities.push({ label: "Consolideer vorm", context: "Huidige load is stabiel." });
        if (threats.length === 0) threats.push({ label: "Geen acuut risico", context: "Training stress is binnen de perken." });

        return { strengths, weaknesses, opportunities, threats, avgWeeklyLoad };
    }, [activities, userSettings]);

    // --- 2. RECOMMENDATION ENGINE ---
    const recommendation = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const today = urlParams.get('day') ? parseInt(urlParams.get('day')) : new Date().getDay();

        const isWeekend = (today === 0 || today === 6);
        const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

        let title = "";
        let duration = ""; // Display string
        let durationSec = 0; // For ZWO
        let focus = "";
        let description = "";
        let type = "interval";
        let zwoSteps = [];

        if (isWeekend) {
            title = "Weekend Warrior: Endurance";
            duration = "2.5u - 4.0u";
            durationSec = 10800; // 3h
            focus = "Zone 2 (Endurance) + Tempo";
            description = "Gebruik je extra tijd voor volume. Zoek een heuvelachtig parcours en rijd de beklimmingen in Z3 (Tempo). Houd de rest strikt Z2.";
            type = "endurance";
            zwoSteps = [
                { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.70 },
                { type: 'SteadyState', duration: 3000, power: 0.65 }, // Z2
                { type: 'SteadyState', duration: 600, power: 0.80 },  // Tempo Climb
                { type: 'SteadyState', duration: 1800, power: 0.65 }, // Z2
                { type: 'SteadyState', duration: 600, power: 0.80 },  // Tempo Climb
                { type: 'SteadyState', duration: 3000, power: 0.65 }, // Z2
                { type: 'Cooldown', duration: 900, powerLow: 0.70, powerHigh: 0.50 }
            ];
        } else {
            if (today === 1 || today === 5) { // Mon/Fri
                title = "Active Recovery";
                duration = "45m - 60m";
                durationSec = 2700; // 45m
                focus = "Zone 1 (Recovery)";
                description = "Houd de benen los, maar geen belasting. Hartslag laag, cadans hoog (95+ rpm).";
                type = "recovery";
                zwoSteps = [
                    { type: 'SteadyState', duration: 2700, power: 0.50 }
                ];
            } else {
                const hardSession = (today === 2 || today === 4) ? "VO2" : "SST";

                if (hardSession === "VO2") {
                    title = "Time Crunch: VO2 Max";
                    duration = "1u 15m";
                    durationSec = 4500;
                    focus = "3x (10x 30s/15s)";
                    description = "Korte, hevige prikkels om je plafond te verhogen. 30s @ 120% FTP, 15s rust. Zeer efficiënt.";
                    type = "interval";
                    // 3 sets of 10x (30/15)
                    zwoSteps = [
                        { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.75 },
                        // Set 1
                        { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                        { type: 'SteadyState', duration: 300, power: 0.55 }, // Rest
                        // Set 2
                        { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                        { type: 'SteadyState', duration: 300, power: 0.55 }, // Rest
                        // Set 3
                        { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                        { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 }
                    ];
                } else {
                    title = "Time Crunch: Sweetspot";
                    duration = "1u 30m";
                    durationSec = 5400;
                    focus = "2x 20m @ 90% FTP";
                    description = "Vergroot je motor (TTE). Blokken net onder je omslagpunt. Mentaal zwaar, maar minder fysieke schade dan VO2.";
                    type = "interval";
                    zwoSteps = [
                        { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                        { type: 'SteadyState', duration: 1200, power: 0.90 }, // 20m SST
                        { type: 'SteadyState', duration: 300, power: 0.55 },  // 5m Rest
                        { type: 'SteadyState', duration: 1200, power: 0.90 }, // 20m SST
                        { type: 'Cooldown', duration: 1500, powerLow: 0.70, powerHigh: 0.50 }
                    ];
                }
            }
        }

        return { dayName: dayNames[today], title, duration, focus, description, type, zwoSteps };

    }, [swot]);

    // --- 3. DOWNLOAD HANDLER ---
    const handleDownloadZwo = () => {
        const r = recommendation;
        const xml = `
<workout_file>
    <author>Climb Performance Lab</author>
    <name>${r.title} - ${r.dayName}</name>
    <description>${r.description}</description>
    <sportType>bike</sportType>
    <tags><tag name="Intervals"/></tags>
    <workout>
${r.zwoSteps.map(step => {
            if (step.type === 'IntervalsT') {
                return `        <IntervalsT Repeat="${step.repeat}" OnDuration="${step.onDuration}" OffDuration="${step.offDuration}" OnPower="${step.onPower}" OffPower="${step.offPower}"/>`;
            }
            if (step.type === 'Warmup' || step.type === 'Cooldown') {
                return `        <${step.type} Duration="${step.duration}" PowerLow="${step.powerLow}" PowerHigh="${step.powerHigh}"/>`;
            }
            return `        <SteadyState Duration="${step.duration}" Power="${step.power}"/>`;
        }).join('\n')}
    </workout>
</workout_file>`.trim();

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CPL_${r.title.replace(/\s+/g, '_')}.zwo`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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
                    <p className="text-sm text-slate-400">Gebaseerd op je data van de laatste 30 dagen & beschikbaarheid.</p>
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
                            <span className="text-xs uppercase font-bold opacity-60 block mb-1">Doel</span>
                            <span className="font-bold text-white">{recommendation.focus}</span>
                        </div>

                        <p className="text-sm leading-relaxed opacity-80 mb-6">
                            {recommendation.description}
                        </p>

                        <button
                            onClick={handleDownloadZwo}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 border border-slate-600 transition-colors"
                        >
                            <Download size={16} /> Download .zwo Workout
                        </button>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-slate-400 text-sm italic">
                        "Consistentie wint van intensiteit. Beter 1 uur vandaag dan 0 uur en morgen proberen in te halen."
                    </div>
                </div>

                {/* --- 2. SWOT MATRIX (Right Col, 2 span) --- */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SwotCard title="Strengths (Kracht)" items={swot.strengths} icon={CheckCircle} color="text-green-500" border="border-green-500" />
                    <SwotCard title="Weaknesses (Zwaktes)" items={swot.weaknesses} icon={AlertTriangle} color="text-red-500" border="border-red-500" />
                    <SwotCard title="Opportunities (Kansen)" items={swot.opportunities} icon={TrendingUp} color="text-blue-500" border="border-blue-500" />
                    <SwotCard title="Threats (Bedreigingen)" items={swot.threats} icon={Activity} color="text-yellow-500" border="border-yellow-500" />
                </div>
            </div>
        </div>
    );
};

// Sub-component for cleaner SWOT rendering
const SwotCard = ({ title, items, icon: Icon, color, border }) => (
    <div className={`bg-slate-800/80 p-4 rounded-lg border-l-4 ${border}`}>
        <h4 className={`font-bold text-white mb-3 flex items-center gap-2`}>
            <Icon size={16} className={color} /> {title}
        </h4>
        <ul className="space-y-3">
            {items.map((item, i) => (
                <li key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}></span>
                        {item.label}
                    </div>
                    <div className="text-xs text-slate-500 pl-3.5 leading-snug">
                        {item.context}
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

// Simple Icon Helper
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default AICoach;
