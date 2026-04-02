import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatDateDDMMYYYY } from '../../utils';
import PowerDurationTable from './PowerDurationTable';

/**
 * FormTab: Shows CTL, ATL and TSB ("Vorm") progression over time.
 * Calculates rolling CTL/ATL/TSB from activities using simplified fitness model.
 *  - CTL (Fitness): 42-day exponential weighted average of daily TSS
 *  - ATL (Fatigue): 7-day exponential weighted average of daily TSS
 *  - TSB (Form):    CTL - ATL (positive = fresh, negative = fatigued)
 */

const CTL_DAYS = 42;
const ATL_DAYS = 7;

const calculateFitnessMetrics = (activities) => {
    if (!activities || activities.length === 0) return [];

    // Build daily TSS map (sorted by date asc)
    const tssMap = {};
    activities.forEach(a => {
        if (a.date && a.load > 0) {
            if (!tssMap[a.date]) tssMap[a.date] = 0;
            tssMap[a.date] += a.load;
        }
    });

    const sortedDates = Object.keys(tssMap).sort();
    if (sortedDates.length === 0) return [];

    const start = new Date(sortedDates[0]);
    const end = new Date(sortedDates[sortedDates.length - 1]);

    const ctlFactor = 1 - Math.exp(-1 / CTL_DAYS);
    const atlFactor = 1 - Math.exp(-1 / ATL_DAYS);

    let ctl = 0;
    let atl = 0;
    const result = [];

    const current = new Date(start);
    while (current <= end) {
        const key = current.toISOString().slice(0, 10);
        const tss = tssMap[key] || 0;

        ctl = ctl + ctlFactor * (tss - ctl);
        atl = atl + atlFactor * (tss - atl);
        const tsb = ctl - atl;

        result.push({
            date: key,
            dateNum: current.getTime(),
            ctl: Math.round(ctl * 10) / 10,
            atl: Math.round(atl * 10) / 10,
            tsb: Math.round(tsb * 10) / 10,
        });

        current.setDate(current.getDate() + 1);
    }

    return result;
};

const StatBadge = ({ label, value, color }) => (
    <div className="bg-cdsurface border border-cdborder rounded-lg p-4 text-center">
        <div className="text-xs uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
    </div>
);

const FormTab = ({
    data,
    customTicks,
    chartData = [],
    manualFtp = 0,
    weightKg = 0,
    timeRange = '1Y',
    referenceEndDate,
    onOpenActivityInLog,
}) => {
    const fitnessData = useMemo(() => calculateFitnessMetrics(data), [data]);

    const axisTicks = useMemo(() => {
        if (!customTicks) return undefined;
        return customTicks.map(t => new Date(t).getTime());
    }, [customTicks]);

    const latest = fitnessData.length ? fitnessData[fitnessData.length - 1] : null;

    const tsbColor = latest && latest.tsb >= 5
        ? 'text-green-400'
        : latest && latest.tsb >= -10
            ? 'text-yellow-400'
            : 'text-red-400';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {latest ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <StatBadge label="CTL (Fitness)" value={latest.ctl} color="text-blue-400" />
                        <StatBadge label="ATL (Vermoeidheid)" value={latest.atl} color="text-orange-400" />
                        <StatBadge label="TSB (Vorm)" value={latest.tsb} color={tsbColor} />
                    </div>

                    <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-cdtext mb-4">CTL / ATL / TSB</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={fitnessData}
                                    margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                    <XAxis
                                        dataKey="dateNum"
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        scale="time"
                                        ticks={axisTicks}
                                        interval={0}
                                        minTickGap={50}
                                        stroke="#64748b"
                                        tickFormatter={(ts) => {
                                            const d = new Date(ts);
                                            return `${d.getDate()} ${d.toLocaleDateString('nl-NL', { month: 'short' })}`;
                                        }}
                                    />
                                    <YAxis stroke="#64748b" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                        itemStyle={{ color: '#94a3b8' }}
                                        labelFormatter={(ts) => formatDateDDMMYYYY(ts)}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                                    <Line type="monotone" dataKey="ctl" name="CTL" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="atl" name="ATL" stroke="#f97316" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="tsb" name="TSB" stroke="#22c55e" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-cdmuted mt-3">
                            CTL (42-dag) = Fitness · ATL (7-dag) = Vermoeidheid · TSB = CTL − ATL (Vorm)
                        </p>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-24 text-cdmuted text-sm border border-dashed border-cdborder rounded-xl">
                    Geen TSS in deze periode voor CTL/ATL/TSB — power-tabel hieronder gebruikt wel je volledige geschiedenis.
                </div>
            )}

            {chartData.length > 0 && (
                <PowerDurationTable
                    chartData={chartData}
                    filteredData={data}
                    manualFtp={manualFtp}
                    timeRange={timeRange}
                    referenceEndDate={referenceEndDate}
                    weightKg={Number(weightKg) > 0 ? Number(weightKg) : 0}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}

            {!chartData.length && !latest && (
                <div className="flex items-center justify-center h-40 text-cdmuted">
                    Geen activiteiten beschikbaar.
                </div>
            )}
        </div>
    );
};

export default FormTab;
