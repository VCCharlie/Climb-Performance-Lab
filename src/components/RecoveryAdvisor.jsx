import React, { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, Calendar, AlertTriangle, CheckCircle, Zap, Info, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// ⚡ Bolt Optimization: Use array lookup instead of Date.toLocaleString() in loops
const NL_SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// Custom tooltip moved outside component body
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-cdsurface border border-cdborder p-3 rounded shadow-lg">
                <p className="text-cdtext text-sm font-bold mb-2">{new Date(data.date).toLocaleDateString('nl-NL')}</p>
                <p className="text-blue-400 text-xs">CTL (Fitness): {data.ctl}</p>
                <p className="text-red-400 text-xs">ATL (Fatigue): {data.atl}</p>
                <p className="text-yellow-400 text-xs">TSB (Form): {data.tsb}</p>
                {data.load > 0 && <p className="text-cdtext text-xs mt-1">Training Load: {data.load}</p>}
            </div>
        );
    }
    return null;
};

const RecoveryAdvisor = ({ activities, startDate, endDate }) => {
    // Calculate Training Load metrics (CTL, ATL, TSB)
    const trainingMetrics = useMemo(() => {
        if (!activities || activities.length === 0) {
            return { chartData: [], current: null, recommendations: [], rangeLabel: '' };
        }

        // Sort activities by date
        // Optimization: use string comparison for ISO dates to speed up sort
        const sortedActivities = [...activities].sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));

        // Calculate rolling metrics
        const CTL_DAYS = 42; // Chronic Training Load (fitness) - 42 day exponential average
        const ATL_DAYS = 7;  // Acute Training Load (fatigue) - 7 day exponential average
        const ctlAlpha = 2 / (CTL_DAYS + 1);
        const atlAlpha = 2 / (ATL_DAYS + 1);

        let ctl = 0;
        let atl = 0;
        const chartData = [];

        // Group activities by date
        const activitiesByDate = {};
        sortedActivities.forEach(activity => {
            const dateKey = new Date(activity.date).toISOString().split('T')[0];
            if (!activitiesByDate[dateKey]) {
                activitiesByDate[dateKey] = [];
            }
            activitiesByDate[dateKey].push(activity);
        });

        // Determine display range from props (default: last 90 days)
        const endD = endDate ? new Date(endDate) : new Date();
        const startD = startDate ? new Date(startDate) : (() => {
            const d = new Date(endD);
            d.setDate(d.getDate() - 90);
            return d;
        })();

        // Warmup: begin CTL/ATL computation 42 dagen vóór de weergaveperiode
        const warmupStart = new Date(startD);
        warmupStart.setDate(warmupStart.getDate() - CTL_DAYS);

        // Calculate CTL/ATL for each day; add to chartData only within display range
        for (let d = new Date(warmupStart); d <= endD; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const dayActivities = activitiesByDate[dateKey] || [];
            const dailyLoad = dayActivities.reduce((sum, act) => sum + (act.load || 0), 0);

            ctl = (dailyLoad * ctlAlpha) + (ctl * (1 - ctlAlpha));
            atl = (dailyLoad * atlAlpha) + (atl * (1 - atlAlpha));
            const tsb = ctl - atl;

            if (d >= startD) {
                chartData.push({
                    date: dateKey,
                    ctl: Math.round(ctl * 10) / 10,
                    atl: Math.round(atl * 10) / 10,
                    tsb: Math.round(tsb * 10) / 10,
                    load: dailyLoad
                });
            }
        }

        // Label for chart heading
        const fmtOpts = { day: 'numeric', month: 'short', year: 'numeric' };
        const rangeLabel = startDate || endDate
            ? `${startD.toLocaleDateString('nl-NL', fmtOpts)} – ${endD.toLocaleDateString('nl-NL', fmtOpts)}`
            : 'Laatste 90 Dagen';

        // Current metrics (last data point in display range)
        const current = chartData[chartData.length - 1];

        // Guard: no data points in range (e.g. custom range with no activities)
        if (!current) {
            return { chartData: [], current: null, recommendations: [], rangeLabel };
        }

        // Generate recommendations
        const recommendations = [];

        if (current.tsb < -30) {
            recommendations.push({
                type: 'warning',
                title: 'Hoog risico op overtraining',
                message: 'Je TSB is zeer negatief (<-30). Neem direct 2-3 rustdagen of doe alleen lichte recovery rides.',
                icon: AlertTriangle
            });
        } else if (current.tsb < -10) {
            recommendations.push({
                type: 'caution',
                title: 'Verhoogde vermoeidheid',
                message: 'Je TSB is negatief. Overweeg een rustdag of lichte training om herstel te bevorderen.',
                icon: TrendingDown
            });
        } else if (current.tsb > 25) {
            recommendations.push({
                type: 'info',
                title: 'Te veel herstel',
                message: 'Je TSB is zeer positief (>25). Je bent fris, maar verliest mogelijk conditie. Voeg intensieve training toe.',
                icon: Calendar
            });
        } else if (current.tsb >= 5 && current.tsb <= 25) {
            recommendations.push({
                type: 'success',
                title: 'Optimale vorm',
                message: 'Je TSB is in de race zone (5-25). Perfect voor wedstrijden of zware trainingen!',
                icon: CheckCircle
            });
        }

        // CTL trends
        const last7Days = chartData.slice(-7);
        const ctlTrend = last7Days[last7Days.length - 1]?.ctl - last7Days[0]?.ctl;

        if (ctlTrend > 5) {
            recommendations.push({
                type: 'success',
                title: 'Conditie stijgt',
                message: `Je CTL is ${Math.round(ctlTrend)} punten gestegen deze week. Goede progressie!`,
                icon: TrendingUp
            });
        } else if (ctlTrend < -5) {
            recommendations.push({
                type: 'warning',
                title: 'Conditieverlies',
                message: `Je CTL is ${Math.abs(Math.round(ctlTrend))} punten gedaald. Verhoog trainingsvolume om fitness te behouden.`,
                icon: TrendingDown
            });
        }

        // Monotony check (last 7 days)
        // ⚡ Bolt Optimization: Use single-pass reduce instead of chained .map().filter()
        const recentLoads = last7Days.reduce((acc, d) => {
            if (d.load > 0) {
                acc.push(d.load);
            }
            return acc;
        }, []);
        if (recentLoads.length >= 5) {
            const avgLoad = recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length;
            const stdDev = Math.sqrt(recentLoads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / recentLoads.length);
            const monotony = avgLoad / (stdDev || 1);

            if (monotony > 2.5) {
                recommendations.push({
                    type: 'caution',
                    title: 'Hoge training monotonie',
                    message: 'Je training is te eentonig (zelfde intensiteit elke dag). Wissel af tussen zware en lichte dagen.',
                    icon: Zap
                });
            }
        }

        return { chartData, current, recommendations, rangeLabel };
    }, [activities, startDate, endDate]);



    if (!trainingMetrics.current) {
        return (
            <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl">
                <h2 className="text-xl font-bold text-cdtext mb-4 flex items-center gap-2">
                    <Activity className="text-purple-400" />
                    Training Load & Recovery Advisor
                </h2>
                <div className="text-center py-12 text-cdmuted">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Geen activiteiten gevonden in de geselecteerde periode.</p>
                    <p className="text-sm mt-2">Import je trainingsdata via de Data Hub tab of pas de periode-selector aan.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Activity className="text-purple-400" />
                    Training Load & Recovery Advisor
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    Performance Management Chart
                </div>
            </div>

            {/* Methodology Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️ Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• CTL (Fitness):</strong> 42-daags gemiddelde van training load. Hogere waarde = betere conditie</p>
                    <p><strong>• ATL (Fatigue):</strong> 7-daags gemiddelde. Hogere waarde = meer vermoeidheid</p>
                    <p><strong>• TSB (Form):</strong> CTL - ATL. Negatief = vermoeid, Positief = fris, 5-25 = race ready</p>
                    <p><strong>💡 Ideaal TSB voor races:</strong> +5 tot +25 (fris maar niet deconditioned)</p>
                </div>
            </div>

            {/* Current Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-cdmuted uppercase">Fitness (CTL)</span>
                        <TrendingUp className="text-blue-400" size={16} />
                    </div>
                    <div className="text-3xl font-bold text-blue-400">{trainingMetrics.current.ctl}</div>
                    <p className="text-xs text-cdmuted mt-1">Chronic Training Load</p>
                </div>

                <div className="bg-cdbg p-4 rounded border border-cdborder">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-cdmuted uppercase">Fatigue (ATL)</span>
                        <TrendingDown className="text-red-400" size={16} />
                    </div>
                    <div className="text-3xl font-bold text-red-400">{trainingMetrics.current.atl}</div>
                    <p className="text-xs text-cdmuted mt-1">Acute Training Load</p>
                </div>

                <div className={`bg-cdbg p-4 rounded border ${trainingMetrics.current.tsb < -10
                    ? 'border-red-500/50'
                    : trainingMetrics.current.tsb > 25
                        ? 'border-blue-500/50'
                        : 'border-green-500/50'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-cdmuted uppercase">Form (TSB)</span>
                        <Activity className={`${trainingMetrics.current.tsb < -10
                            ? 'text-red-400'
                            : trainingMetrics.current.tsb > 25
                                ? 'text-blue-400'
                                : 'text-green-400'
                            }`} size={16} />
                    </div>
                    <div className={`text-3xl font-bold ${trainingMetrics.current.tsb < -10
                        ? 'text-red-400'
                        : trainingMetrics.current.tsb > 25
                            ? 'text-blue-400'
                            : 'text-green-400'
                        }`}>
                        {trainingMetrics.current.tsb > 0 ? '+' : ''}{trainingMetrics.current.tsb}
                    </div>
                    <p className="text-xs text-cdmuted mt-1">Training Stress Balance</p>
                </div>
            </div>

            {/* Recommendations */}
            {trainingMetrics.recommendations.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-cdtext font-bold text-sm uppercase tracking-wide">Aanbevelingen</h3>
                    {trainingMetrics.recommendations.map((rec, idx) => {
                        const Icon = rec.icon;
                        return (
                            <div
                                key={idx}
                                className={`p-3 rounded border text-sm flex items-start gap-3 ${rec.type === 'success'
                                    ? 'bg-green-500/20 border-green-500/50 text-green-500'
                                    : rec.type === 'warning'
                                        ? 'bg-red-500/20 border-red-500/50 text-red-500'
                                        : rec.type === 'caution'
                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                                            : 'bg-blue-500/20 border-blue-500/50 text-blue-500'
                                    }`}
                            >
                                <Icon size={18} className="flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-bold">{rec.title}</p>
                                    <p className="text-xs opacity-90 mt-1">{rec.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Chart */}
            <div className="bg-cdbg p-4 rounded border border-cdborder">
                <h3 className="text-cdtext font-bold text-sm mb-4 uppercase tracking-wide">
                    {trainingMetrics.rangeLabel} — Performance Management Chart
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingMetrics.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cdborder, #e2e8f0)" />
                        <XAxis
                            dataKey="date"
                            stroke="var(--color-cdmuted, #64748b)"
                            tick={{ fill: 'var(--color-cdmuted, #64748b)', fontSize: 10 }}
                            tickFormatter={(date) => {
                                const d = new Date(date);
                                return `${d.getDate()} ${NL_SHORT_MONTHS[d.getMonth()]}`;
                            }}
                        />
                        <YAxis
                            stroke="var(--color-cdmuted, #64748b)"
                            tick={{ fill: 'var(--color-cdmuted, #64748b)', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />

                        {/* Reference lines */}
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                        <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="2 2" label={{ value: 'Race Ready Zone', fill: '#22c55e', fontSize: 10 }} />
                        <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="2 2" label={{ value: 'Fatigue Zone', fill: '#ef4444', fontSize: 10 }} />

                        <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} name="CTL (Fitness)" dot={false} />
                        <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} name="ATL (Fatigue)" dot={false} />
                        <Line type="monotone" dataKey="tsb" stroke="#facc15" strokeWidth={2} name="TSB (Form)" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RecoveryAdvisor;
