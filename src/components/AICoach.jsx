import React, { useMemo } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, CheckCircle, Activity, Battery, Download, Shuffle } from 'lucide-react';

const AICoach = ({ activities, userSettings, startDate, endDate }) => {

    // --- 1. SWOT ENGINE (Expanded Context) ---
    const swot = useMemo(() => {
        const endD = endDate ? new Date(endDate) : new Date();
        const startD = startDate ? new Date(startDate) : (() => {
            const d = new Date(endD);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const periodActivities = activities.filter(a => {
            const d = new Date(a.date);
            return d >= startD && d <= endD;
        });

        const periodDays = Math.max(1, (endD - startD) / (1000 * 60 * 60 * 24));
        const weeksInPeriod = Math.max(1, periodDays / 7);

        // Drempelwaarden schalen naar de periodelengte (basisreferentie = 30 dagen)
        const consistencyHigh = Math.round(12 * periodDays / 30);  // >3x/week
        const consistencyLow  = Math.round(4  * periodDays / 30);  // <2x/week
        const intensityHigh   = Math.round(8  * periodDays / 30);  // te veel intensiteit
        const intensityLow    = Math.round(2  * periodDays / 30);  // te weinig intensiteit

        const fmtOpts = { day: 'numeric', month: 'short', year: 'numeric' };
        const periodLabel = (startDate || endDate)
            ? `${startD.toLocaleDateString('nl-NL', fmtOpts)} – ${endD.toLocaleDateString('nl-NL', fmtOpts)}`
            : 'afgelopen 30 dagen';

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];

        // Consistency Check
        if (periodActivities.length >= consistencyHigh) {
            strengths.push({
                label: "Hoge consistentie",
                context: `Je hebt ${periodActivities.length} keer getraind in de ${periodLabel} (>3x/week). Consistentie is de belangrijkste factor voor mitochondriële aanpassing en aerobe basis.`
            });
        } else if (periodActivities.length < consistencyLow) {
            weaknesses.push({
                label: "Lage frequentie",
                context: `Slechts ${periodActivities.length} ritten in de ${periodLabel}. Zonder regelmatige prikkels (minimaal 2-3x per week) zal je conditie stagneren of achteruitgaan.`
            });
        }

        // Load Trend (TSB proxy)
        const recentLoad = periodActivities.reduce((acc, curr) => acc + (curr.load || 0), 0);
        const avgWeeklyLoad = recentLoad / weeksInPeriod;

        if (avgWeeklyLoad > 400) {
            strengths.push({
                label: "Sterke basisconditie (CTL)",
                context: `Je gemiddelde weekload is ${Math.round(avgWeeklyLoad)} TSS. Dit duidt op een solide 'Chronic Training Load' (CTL), wat betekent dat je lichaam goed belastbaar is voor zwaardere blokken.`
            });
        } else if (avgWeeklyLoad < 100) {
            opportunities.push({
                label: "Ruimte voor volumeverhoging",
                context: `Met een load van slechts ${Math.round(avgWeeklyLoad)} TSS/week heb je nog veel ruimte om progressie te boeken door simpelweg meer volume of frequentie toe te voegen.`
            });
        }

        // Intensity Distribution
        const highIntensity = periodActivities.filter(a => (a.norm_power || 0) > (userSettings.ftp * 0.9)).length;
        if (highIntensity > intensityHigh) {
            threats.push({
                label: "Monotony & Burnout Risico",
                context: `Je hebt ${highIntensity} zware sessies (>90% FTP) gedaan in de ${periodLabel}. Te veel intensiteit zonder rustige duurtraining leidt tot een plateau en verhoogt het risico op overtraining.`
            });
        }
        if (highIntensity < intensityLow) {
            weaknesses.push({
                label: "Gebrek aan intensiteit",
                context: "Je hebt amper boven je FTP getraind. Om je plafond (VO2 Max) te verhogen, zijn specifieke intervalprikkels noodzakelijk."
            });
        }

        // Power Profile (Best 5m)
        const best5m = Math.max(...periodActivities.map(a => a.best_5min || 0));
        if (best5m > userSettings.ftp * 1.15) {
            strengths.push({
                label: "Sterke VO2 Max Engine",
                context: `Je 5-minuten power is ${best5m}W, wat erg sterk is t.o.v. je FTP. Dit wijst op een goed ontwikkelde aerobe capaciteit. Je zou dit kunnen uitbuiten in korte, steile beklimmingen.`
            });
        }

        // Fillers if empty
        if (strengths.length === 0) strengths.push({ label: "Geen recente uitschieters", context: "Je training is stabiel, blijf bouwen aan consistentie om uitschieters te creëren." });
        if (weaknesses.length === 0) weaknesses.push({ label: "Geen duidelijke zwaktes", context: "Je profiel is goed gebalanceerd. Tijd om te specificeren naar je hoofddoel." });
        if (opportunities.length === 0) opportunities.push({ label: "Consolideer vorm", context: "Je load is stabiel. Dit is een goed moment om te werken aan techniek of specifieke zwaktes zonder de totale load te verhogen." });
        if (threats.length === 0) threats.push({ label: "Geen acuut risico", context: "Je training stress balance lijkt gezond. Luister wel altijd naar je lichaam." });

        return { strengths, weaknesses, opportunities, threats, avgWeeklyLoad, periodLabel };
    }, [activities, userSettings, startDate, endDate]);

    // --- 2. DUAL RECOMMENDATION ENGINE ---
    const recommendations = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const today = urlParams.get('day') ? parseInt(urlParams.get('day')) : new Date().getDay();

        const isWeekend = (today === 0 || today === 6);
        const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

        const options = [];

        if (isWeekend) {
            // OPTION 1: Long Endurance
            options.push({
                id: 'weekend_long',
                title: "Weekend Warrior: Endurance",
                duration: "3u - 4u",
                focus: "Zone 2 (Endurance)",
                description: "De basis van elke wielrenner. Lange, rustige duurtraining (Z2) stimuleert vetverbranding en capillaire dichtheid. Wees strikt: niet stiekem Tempo rijden!",
                type: "endurance",
                zwoSteps: [
                    { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.65 },
                    { type: 'SteadyState', duration: 3600, power: 0.60 },
                    { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 }
                ]
            });
            // OPTION 2: Tempo / Sweetspot (Time Crunched)
            options.push({
                id: 'weekend_tempo',
                title: "Time Crunched: Tempo Climbs",
                duration: "1u 30m - 2u",
                focus: "Zone 3 (Tempo)",
                description: "Heb je minder tijd? Rij dan wat intensiever. Zoek heuvels op en rij ze in 'Tempo' (Z3). Dit is geen volle bak, maar wel 'comfortabel hard'.",
                type: "interval",
                zwoSteps: [
                    { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.70 },
                    { type: 'SteadyState', duration: 900, power: 0.80 }, // Tempo
                    { type: 'SteadyState', duration: 300, power: 0.55 }, // Rest
                    { type: 'SteadyState', duration: 900, power: 0.80 },
                    { type: 'SteadyState', duration: 300, power: 0.55 },
                    { type: 'SteadyState', duration: 900, power: 0.80 },
                    { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.50 }
                ]
            });

        } else {
            // WEEKDAY LOGIC
            if (today === 1 || today === 5) { // Mon/Fri
                options.push({
                    id: 'recovery_active',
                    title: "Active Recovery",
                    duration: "45m - 60m",
                    focus: "Zone 1 (Recovery)",
                    description: "Actief herstel bevordert de doorbloeding en afvoer van afvalstoffen. Houd de hartslag laag en cadans hoog (95+ rpm). Voelt het zwaar? Stop dan.",
                    type: "recovery",
                    zwoSteps: [{ type: 'SteadyState', duration: 2700, power: 0.50 }]
                });
                options.push({
                    id: 'recovery_rest',
                    title: "Totale Rustdag",
                    duration: "0m",
                    focus: "Sleep & Nutrition",
                    description: "Soms is de beste training: niet trainen. Geef je spieren en hormoonsysteem 100% rust. Focus op slaapkwaliteit en eiwitrijke voeding.",
                    type: "recovery",
                    zwoSteps: [] // No file
                });

            } else {
                // Tue/Wed/Thu -> Quality (Intervals)
                const isVo2Day = (today === 2 || today === 4); // Tue/Thu

                if (isVo2Day) {
                    options.push({
                        id: 'vo2_micro',
                        title: "VO2 Max: Micro-Bursts",
                        duration: "1u 15m",
                        focus: "3 sets, 10x (30s ON / 15s OFF)",
                        description: "Korte, hevige prikkels om je zuurstofopname (VO2max) te verhogen. 30s @ 120% FTP, 15s rust. Zeer zwaar maar efficiënt.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 900, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 10, onDuration: 30, offDuration: 15, onPower: 1.20, offPower: 0.50 },
                            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 }
                        ]
                    });
                    options.push({
                        id: 'vo2_long',
                        title: "VO2 Max: 4x5 min",
                        duration: "1u 30m",
                        focus: "4x 5m @ 108% FTP",
                        description: "Klassieke VO2 intervallen. Langer in de 'pijnzone'. Dit traint niet alleen je plafond, maar ook je tolerantie voor verzuring.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 300, power: 1.08 },
                            { type: 'Cooldown', duration: 900, powerLow: 0.60, powerHigh: 0.40 }
                        ]
                    });
                } else {
                    // Wed: Sweetspot / Threshold
                    options.push({
                        id: 'sst_classic',
                        title: "Sweetspot: 2x20m",
                        duration: "1u 30m",
                        focus: "2x 20m @ 90% FTP",
                        description: "De gouden standaard voor het vergroten van je motor (TTE). Net onder je omslagpunt. Mentaal zwaar, fysiek goed herstelbaar.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'SteadyState', duration: 1200, power: 0.90 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'SteadyState', duration: 1200, power: 0.90 },
                            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 }
                        ]
                    });
                    options.push({
                        id: 'threshold_ou',
                        title: "Over-Unders",
                        duration: "1u 20m",
                        focus: "3x (2m @ 105% / 2m @ 90%)",
                        description: "Wisselend boven en onder je FTP rijden. Dit leert je lichaam om lactaat te verwerken ('shuttling') terwijl je hard doorfietst.",
                        type: "interval",
                        zwoSteps: [
                            { type: 'Warmup', duration: 1200, powerLow: 0.50, powerHigh: 0.75 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 }, // Block 1 (12m total?) No, this is 3 reps
                            // Let's make it a 9-12 min block. 3x (2m/2m) = 12 mins.
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
                            { type: 'SteadyState', duration: 300, power: 0.55 },
                            { type: 'IntervalsT', repeat: 3, onDuration: 120, offDuration: 120, onPower: 1.05, offPower: 0.90 },
                            { type: 'Cooldown', duration: 1200, powerLow: 0.70, powerHigh: 0.50 }
                        ]
                    });
                }
            }
        }

        return { dayName: dayNames[today], options };

    }, [swot]);

    // --- 3. DOWNLOAD HANDLER ---
    const handleDownloadZwo = (workout) => {
        if (!workout.zwoSteps || workout.zwoSteps.length === 0) {
            alert("Voor deze rustdag is er geen workout file nodig. Geniet van de rust!");
            return;
        }

        const xml = `
<workout_file>
    <author>Climb Performance Lab</author>
    <name>${workout.title}</name>
    <description>${workout.description}</description>
    <sportType>bike</sportType>
    <tags><tag name="Intervals"/></tags>
    <workout>
${workout.zwoSteps.map(step => {
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
        a.download = `CPL_${workout.title.replace(/\s+/g, '_')}.zwo`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCardStyles = (t) => {
        if (t === 'recovery') return {
            container: 'border-green-200 bg-green-50',
            text: 'text-green-700',
            badge: 'bg-green-100 text-green-800'
        };
        if (t === 'endurance') return {
            container: 'border-blue-200 bg-blue-50',
            text: 'text-blue-700',
            badge: 'bg-blue-100 text-blue-800'
        };
        return {
            container: 'border-yellow-200 bg-yellow-50',
            text: 'text-yellow-700',
            badge: 'bg-yellow-100 text-yellow-800'
        };
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-cdtext flex items-center gap-2"><Brain className="text-purple-400" /> AI Performance Coach</h2>
                    <p className="text-sm text-cdmuted">Gebaseerd op je data van {swot.periodLabel}.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold text-cdtext">{Math.round(swot.avgWeeklyLoad)} TSS</div>
                    <div className="text-xs text-cdmuted uppercase">Avg Weekly Load</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- 1. WORKOUT SUGGESTIONS (Left Col) --- */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 text-cdmuted text-sm uppercase font-bold tracking-wider">
                        <Calendar size={14} /> {recommendations.dayName} Sessies
                    </div>

                    {recommendations.options.map((opt, idx) => {
                        const styles = getCardStyles(opt.type);
                        return (
                            <div key={opt.id} className={`p-5 rounded-xl border-2 transition-colors relative ${styles.container} ${idx > 0 && 'opacity-90 scale-95 origin-top mt-2'}`}>
                                {idx === 0 && <div className="absolute -top-3 left-4 px-2 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-bold uppercase rounded">Aanbevolen</div>}
                                {idx > 0 && <div className="absolute -top-3 left-4 px-2 py-0.5 bg-cdsurface border border-cdborder text-cdtext text-[10px] font-bold uppercase rounded">Alternatief</div>}

                                <div className="flex justify-between items-start mb-2 mt-2">
                                    <h3 className={`text-lg font-bold ${styles.text}`}>{opt.title}</h3>
                                    <div className={styles.text}>
                                        {opt.type === 'interval' && <Activity size={16} />}
                                        {opt.type === 'recovery' && <Battery size={16} />}
                                        {opt.type === 'endurance' && <TrendingUp size={16} />}
                                    </div>
                                </div>

                                <div className="flex gap-4 mb-3 text-xs font-mono text-cdmuted">
                                    <span className="flex items-center gap-1"><ClockIcon /> {opt.duration}</span>
                                    <span className="flex items-center gap-1"><Brain size={12} /> {opt.focus}</span>
                                </div>

                                <p className="text-xs leading-relaxed text-cdtext mb-4 h-16 overflow-y-auto custom-scrollbar">
                                    {opt.description}
                                </p>

                                <button
                                    onClick={() => handleDownloadZwo(opt)}
                                    className="w-full bg-cdsurface hover:bg-cdborder text-cdtext text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 border border-cdborder transition-colors"
                                >
                                    <Download size={14} /> Download .zwo
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* --- 2. SWOT MATRIX (Right Col, 2 span) --- */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
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
    <div className={`bg-cdsurface/80 p-4 rounded-lg border-l-4 ${border} h-full`}>
        <h4 className={`font-bold text-cdtext mb-3 flex items-center gap-2`}>
            <Icon size={16} className={color} /> {title}
        </h4>
        <ul className="space-y-4">
            {items.map((item, i) => (
                <li key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-cdtext font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}></span>
                        {item.label}
                    </div>
                    <div className="text-xs text-cdmuted pl-3.5 leading-relaxed">
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
