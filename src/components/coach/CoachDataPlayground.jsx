import React, { useMemo, useState } from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { BarChart3, ChevronDown, ChevronRight, TrendingUp, Zap } from 'lucide-react';
import { ChartTooltip } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import { buildMultiYearPowerAnalysis } from '../../utils/coach/coachPowerAnalysis';
import {
    PLAYGROUND_METRICS,
    buildTrendPlaygroundData,
    defaultPlaygroundPrimaryRange,
    playgroundRangeForYears,
    resolvePlaygroundCompareRange,
} from '../../utils/coach/coachDataPlayground';
import { COMPARE_OPTIONS } from '../dashboard/powerTopTenByDurationConstants';
import { formatLongRange } from '../dashboard/powerTopTenByDurationConstants';
import NlDateInput from '../NlDateInput';
import { useProfileFtp } from '../../context/ProfileFtpContext';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { boundsFromYmdRange } from '../../utils/dashboardActivityWindow';

const YEAR_SPAN_OPTIONS = [5, 10, 15];
const TOP_N_OPTIONS = [5, 10, 15];
const RANGE_PRESETS = [
    { id: '1y', label: '1 year', years: 1 },
    { id: '3y', label: '3 years', years: 3 },
    { id: '5y', label: '5 years', years: 5 },
    { id: '10y', label: '10 years', years: 10 },
    { id: 'all', label: 'All data', years: 30 },
];

const CoachDataPlayground = ({ activities, userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const [expanded, setExpanded] = useState(true);
    const [mode, setMode] = useState('trends');

    if (!activities?.length) return null;

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full p-5 border-b border-cdborder flex items-start justify-between gap-3 text-left hover:bg-cdborder/10 transition-colors"
            >
                <div>
                    <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                        <BarChart3 size={20} className="text-cdaccent" />
                        Data Playground
                    </h3>
                    <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                        Filter, compare, and chart your full activity log — volume trends and power rankings.
                    </p>
                </div>
                {expanded ? <ChevronDown size={18} className="text-cdmuted shrink-0 mt-1" /> : <ChevronRight size={18} className="text-cdmuted shrink-0 mt-1" />}
            </button>

            {expanded && (
                <div className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <ModeButton active={mode === 'trends'} onClick={() => setMode('trends')} icon={TrendingUp} label="Volume trends" />
                        <ModeButton active={mode === 'power'} onClick={() => setMode('power')} icon={Zap} label="Power rankings" />
                    </div>

                    {mode === 'trends' ? (
                        <TrendsPanel activities={activities} />
                    ) : (
                        <PowerRankingsPanel activities={activities} ftp={ftp} />
                    )}
                </div>
            )}
        </div>
    );
};

function ModeButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                active
                    ? 'border-cdaccent text-cdaccent bg-cdaccent/10'
                    : 'border-cdborder text-cdmuted hover:text-cdtext'
            }`}
        >
            <Icon size={13} />
            {label}
        </button>
    );
}

function TrendsPanel({ activities }) {
    const theme = getChartTheme();
    const today = todayYmd();
    const defaultRange = defaultPlaygroundPrimaryRange(today);

    const [cadence, setCadence] = useState('monthly');
    const [metricId, setMetricId] = useState('distanceKm');
    const [rangePreset, setRangePreset] = useState('3y');
    const [primaryStart, setPrimaryStart] = useState(defaultRange.startYmd);
    const [primaryEnd, setPrimaryEnd] = useState(defaultRange.endYmd);
    const [compareMode, setCompareMode] = useState('none');
    const [compareDays, setCompareDays] = useState(365);
    const [compareStart, setCompareStart] = useState('');
    const [compareEnd, setCompareEnd] = useState('');
    const [trendWindow, setTrendWindow] = useState(3);

    const applyPreset = (presetId) => {
        setRangePreset(presetId);
        const preset = RANGE_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        const range = playgroundRangeForYears(today, preset.years);
        setPrimaryStart(range.startYmd);
        setPrimaryEnd(range.endYmd);
    };

    const compareRange = useMemo(() => {
        if (compareMode === 'custom') {
            return compareStart && compareEnd ? { startYmd: compareStart, endYmd: compareEnd } : null;
        }
        return resolvePlaygroundCompareRange(compareMode, primaryStart, primaryEnd, compareDays);
    }, [compareMode, primaryStart, primaryEnd, compareDays, compareStart, compareEnd]);

    const trendData = useMemo(
        () => buildTrendPlaygroundData(activities, {
            cadence,
            metricId,
            startYmd: primaryStart,
            endYmd: primaryEnd,
            compareMode,
            compareStartYmd: compareRange?.startYmd,
            compareEndYmd: compareRange?.endYmd,
            trendWindow,
        }),
        [activities, cadence, metricId, primaryStart, primaryEnd, compareMode, compareRange, trendWindow],
    );

    const metric = trendData.metric;
    const unitSuffix = metric.unit ? ` ${metric.unit}` : '';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <FilterSelect label="Metric" value={metricId} onChange={setMetricId} options={PLAYGROUND_METRICS.map((m) => ({ value: m.id, label: m.label }))} />
                <FilterSelect label="Group by" value={cadence} onChange={setCadence} options={[{ value: 'monthly', label: 'Month' }, { value: 'weekly', label: 'Week' }]} />
                <FilterSelect
                    label="Compare"
                    value={compareMode}
                    onChange={setCompareMode}
                    options={[
                        ...COMPARE_OPTIONS,
                        { value: 'prevYear', label: 'Same range, previous year' },
                    ]}
                />
                <FilterSelect label="Trend line" value={String(trendWindow)} onChange={(v) => setTrendWindow(Number(v))} options={[2, 3, 4, 6].map((n) => ({ value: String(n), label: `${n}-period avg` }))} />
            </div>

            <div className="flex flex-wrap gap-2">
                {RANGE_PRESETS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border ${rangePreset === p.id ? 'border-cdaccent text-cdaccent' : 'border-cdborder text-cdmuted'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField label="From" value={primaryStart} onChange={setPrimaryStart} />
                <DateField label="To" value={primaryEnd} onChange={setPrimaryEnd} />
            </div>

            {compareMode === 'days' && (
                <label className="text-xs text-cdmuted flex items-center gap-2">
                    Compare days before
                    <input type="number" min={7} max={730} value={compareDays} onChange={(e) => setCompareDays(Number(e.target.value))} className="w-20 bg-cdborder/30 border border-cdborder rounded px-2 py-1 text-cdtext" />
                </label>
            )}

            {compareMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DateField label="Compare from" value={compareStart} onChange={setCompareStart} />
                    <DateField label="Compare to" value={compareEnd} onChange={setCompareEnd} />
                </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
                <SummaryPill
                    label={`Total (${formatLongRange(boundsFromYmdRange(primaryStart, primaryEnd)) || 'range'})`}
                    value={`${trendData.primaryTotal}${unitSuffix}`}
                />
                {trendData.compareTotal != null && (
                    <SummaryPill
                        label="Compare total"
                        value={`${trendData.compareTotal}${unitSuffix}${trendData.deltaPct != null ? ` (${trendData.deltaPct >= 0 ? '+' : ''}${trendData.deltaPct}%)` : ''}`}
                    />
                )}
            </div>

            {trendData.chartData.length === 0 ? (
                <p className="text-sm text-cdmuted">No rides in this range.</p>
            ) : (
                <>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                                <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: theme.tick, fontSize: 11 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="value" name={metric.label} fill="rgba(250,204,21,0.75)" radius={[3, 3, 0, 0]} />
                                {compareMode !== 'none' && (
                                    <Bar dataKey="compareValue" name="Compare" fill="rgba(148,163,184,0.45)" radius={[3, 3, 0, 0]} />
                                )}
                                <Line type="monotone" dataKey="trend" name="Trend" stroke="rgba(96,165,250,0.9)" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-cdborder max-h-64 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-cdsurface">
                                <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                    <th className="px-3 py-2">Period</th>
                                    <th className="px-3 py-2">{metric.label}</th>
                                    {compareMode !== 'none' && <th className="px-3 py-2">Compare</th>}
                                    <th className="px-3 py-2">Trend</th>
                                    <th className="px-3 py-2">Rides</th>
                                </tr>
                            </thead>
                            <tbody className="text-cdtext">
                                {trendData.chartData.map((row) => (
                                    <tr key={row.key} className="border-t border-cdborder">
                                        <td className="px-3 py-1.5 whitespace-nowrap">{row.label}</td>
                                        <td className="px-3 py-1.5 font-mono">{row.value}{unitSuffix}</td>
                                        {compareMode !== 'none' && <td className="px-3 py-1.5 font-mono text-cdmuted">{row.compareValue ?? '—'}{row.compareValue != null ? unitSuffix : ''}</td>}
                                        <td className="px-3 py-1.5 font-mono text-blue-300">{row.trend}{unitSuffix}</td>
                                        <td className="px-3 py-1.5 text-cdmuted">{row.rideCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function PowerRankingsPanel({ activities, ftp }) {
    const theme = getChartTheme();
    const [yearSpan, setYearSpan] = useState(10);
    const [topN, setTopN] = useState(10);
    const [field, setField] = useState('best_60min');

    const analysis = useMemo(
        () => buildMultiYearPowerAnalysis(activities, ftp, { field, limit: topN, yearSpan }),
        [activities, ftp, field, topN, yearSpan],
    );

    const rowsWithData = analysis.yearly.filter((row) => row.count > 0);
    const durationLabel = field === 'best_20min' ? '20-minute' : '60-minute';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <FilterSelect label="Duration" value={field} onChange={setField} options={[{ value: 'best_60min', label: '60-minute' }, { value: 'best_20min', label: '20-minute' }]} />
                <FilterSelect label="Years" value={String(yearSpan)} onChange={(v) => setYearSpan(Number(v))} options={YEAR_SPAN_OPTIONS.map((n) => ({ value: String(n), label: `Last ${n} years` }))} />
                <FilterSelect label="Top N" value={String(topN)} onChange={(v) => setTopN(Number(v))} options={TOP_N_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} />
            </div>

            {rowsWithData.length === 0 ? (
                <p className="text-sm text-cdmuted">No {durationLabel} power data in this window.</p>
            ) : (
                <>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={analysis.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                                <XAxis dataKey="year" tick={{ fill: theme.tick, fontSize: 11 }} />
                                <YAxis tick={{ fill: theme.tick, fontSize: 11 }} unit=" W" />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="avg" name={`Avg top ${topN}`} fill="rgba(250,204,21,0.85)" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="avg" name="Trend" stroke="rgba(96,165,250,0.9)" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-cdborder">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                    <th className="px-3 py-2">Year</th>
                                    <th className="px-3 py-2">Top values (W)</th>
                                    <th className="px-3 py-2">Avg</th>
                                    <th className="px-3 py-2">Anomalies</th>
                                </tr>
                            </thead>
                            <tbody className="text-cdtext">
                                {rowsWithData.map((row) => (
                                    <tr key={row.year} className="border-t border-cdborder align-top">
                                        <td className="px-3 py-2 font-medium">{row.year}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-cdmuted">{row.efforts.map((e) => e.watts).join(', ')}</td>
                                        <td className="px-3 py-2 font-mono">{row.avg}W</td>
                                        <td className="px-3 py-2 text-xs text-cdmuted">{row.anomalies.length ? row.anomalies.map((a) => `${a.watts}W (${a.date})`).join(', ') : 'None'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function FilterSelect({ label, value, onChange, options }) {
    return (
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
            <span className="font-semibold text-cdtext">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[130px]">
                {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </label>
    );
}

function DateField({ label, value, onChange }) {
    return (
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
            <span className="font-semibold text-cdtext">{label}</span>
            <NlDateInput value={value} onChange={onChange} className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext w-full" />
        </label>
    );
}

function SummaryPill({ label, value }) {
    return (
        <div className="rounded-lg border border-cdborder bg-cdborder/20 px-3 py-2">
            <p className="text-[10px] uppercase text-cdmuted font-bold">{label}</p>
            <p className="text-sm font-bold text-cdtext tabular-nums">{value}</p>
        </div>
    );
}

export default CoachDataPlayground;
