import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, GitBranch, TrendingUp, Zap } from 'lucide-react';
import {
    VOLUME_METRICS,
    HR_METRICS,
    PERFORMANCE_METRICS,
    DRIFT_METRICS,
    CHART_TYPES,
    CHART_TYPE_OPTIONS,
    VOLUME_STAT_MODES,
    VOLUME_STAT_OPTIONS,
    buildTrendPlaygroundData,
    defaultPlaygroundPrimaryRange,
    playgroundRangeForYears,
    resolvePlaygroundCompareRange,
    isDriftRelatedMetric,
} from '../../utils/coach/coachDataPlayground';
import { COMPARE_OPTIONS } from '../dashboard/powerTopTenByDurationConstants';
import { formatLongRange } from '../dashboard/powerTopTenByDurationConstants';
import NlDateInput from '../NlDateInput';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { boundsFromYmdRange } from '../../utils/dashboardActivityWindow';
import PlaygroundVolumeChart from './playground/PlaygroundVolumeChart';
import PlaygroundPowerPanel from './playground/PlaygroundPowerPanel';
import PlaygroundExplorerPanel from './playground/PlaygroundExplorerPanel';
import PlaygroundPeriodTable from './playground/PlaygroundPeriodTable';
import PlaygroundResponsiveHeader from './playground/PlaygroundResponsiveHeader';
import CollapsibleSection from '../ui/CollapsibleSection';
import { SegmentedControl } from '../ui';
import {
    playgroundTdMonoClass,
    playgroundTdMutedClass,
    playgroundTdTextClass,
    playgroundThClass,
} from '../../utils/playgroundTableStyles';

const RANGE_PRESETS = [
    { id: '1y', label: '1 year', years: 1 },
    { id: '3y', label: '3 years', years: 3 },
    { id: '5y', label: '5 years', years: 5 },
    { id: '10y', label: '10 years', years: 10 },
    { id: 'all', label: 'All data', years: 30 },
];

const CoachDataPlayground = ({ activities, userSettings }) => {
    const [mode, setMode] = useState('trends');

    if (!activities?.length) return null;

    return (
        <CollapsibleSection
            title="Data Playground"
            subtitle="Explore volume, heart rate, power, HR drift, and cross-metric relationships — filter, compare, scatter plots, and manual anomaly exclusions."
            icon={BarChart3}
            defaultExpanded
        >
            <SegmentedControl
                size="sm"
                caps={false}
                value={mode}
                onChange={setMode}
                aria-label="Data playground mode"
                className="flex-wrap"
                options={[
                    { value: 'trends', label: 'Volume & HR trends', icon: TrendingUp },
                    { value: 'explorer', label: 'Metric explorer', icon: GitBranch },
                    { value: 'power', label: 'Power rankings', icon: Zap },
                ]}
            />

            {mode === 'trends' ? (
                <TrendsPanel activities={activities} userSettings={userSettings} />
            ) : mode === 'explorer' ? (
                <PlaygroundExplorerPanel activities={activities} />
            ) : (
                <PlaygroundPowerPanel activities={activities} />
            )}
        </CollapsibleSection>
    );
};

function TrendsPanel({ activities, userSettings }) {
    const today = todayYmd();
    const defaultRange = defaultPlaygroundPrimaryRange(today);

    const [cadence, setCadence] = useState('monthly');
    const [metricId, setMetricId] = useState('distanceKm');
    const [statMode, setStatMode] = useState(VOLUME_STAT_MODES.PRIMARY);
    const [chartType, setChartType] = useState(CHART_TYPES.COMPOSED);
    const [rangePreset, setRangePreset] = useState('3y');
    const [primaryStart, setPrimaryStart] = useState(defaultRange.startYmd);
    const [primaryEnd, setPrimaryEnd] = useState(defaultRange.endYmd);
    const [compareMode, setCompareMode] = useState('none');
    const [compareDays, setCompareDays] = useState(365);
    const [compareStart, setCompareStart] = useState('');
    const [compareEnd, setCompareEnd] = useState('');
    const [trendWindow, setTrendWindow] = useState(3);
    const [showMax, setShowMax] = useState(false);
    const [showMaxTrend, setShowMaxTrend] = useState(false);
    const [showDriftPeriodColumns, setShowDriftPeriodColumns] = useState(false);

    useEffect(() => {
        if (isDriftRelatedMetric(metricId)) {
            setShowDriftPeriodColumns(true);
        }
    }, [metricId]);

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

    const profileFtp = Number(userSettings?.ftp) || 0;

    const trendData = useMemo(
        () => buildTrendPlaygroundData(activities, {
            cadence,
            metricId,
            statMode,
            startYmd: primaryStart,
            endYmd: primaryEnd,
            compareMode,
            compareStartYmd: compareRange?.startYmd,
            compareEndYmd: compareRange?.endYmd,
            trendWindow,
            profileFtp,
        }),
        [activities, cadence, metricId, statMode, primaryStart, primaryEnd, compareMode, compareRange, trendWindow, profileFtp],
    );

    const metric = trendData.metric;
    const unitSuffix = metric.unit ? ` ${metric.unit}` : '';
    const metricOptions = [
        { group: 'Volume', options: VOLUME_METRICS },
        { group: 'Heart rate', options: HR_METRICS },
        { group: 'Performance', options: PERFORMANCE_METRICS },
        { group: 'HR drift', options: DRIFT_METRICS },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <FilterSelect label="Metric" value={metricId} onChange={setMetricId}>
                    {metricOptions.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                            {group.options.map((m) => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </optgroup>
                    ))}
                </FilterSelect>

                <FilterSelect
                    label="Group by"
                    value={cadence}
                    onChange={setCadence}
                    options={[
                        { value: 'weekly', label: 'Week' },
                        { value: 'monthly', label: 'Month' },
                        { value: 'yearly', label: 'Year' },
                    ]}
                />

                <FilterSelect
                    label="Value type"
                    value={statMode}
                    onChange={setStatMode}
                    options={VOLUME_STAT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                />

                <FilterSelect
                    label="Chart"
                    value={chartType}
                    onChange={setChartType}
                    options={CHART_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                />

                <FilterSelect
                    label="Compare"
                    value={compareMode}
                    onChange={setCompareMode}
                    options={[
                        ...COMPARE_OPTIONS,
                        { value: 'prevYear', label: 'Same range, previous year' },
                    ]}
                />

                <FilterSelect
                    label="Trend window"
                    value={String(trendWindow)}
                    onChange={(v) => setTrendWindow(Number(v))}
                    options={[2, 3, 4, 6].map((n) => ({ value: String(n), label: `${n}-period avg` }))}
                />
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-cdmuted">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showMax} onChange={(e) => setShowMax(e.target.checked)} />
                    Show max per period
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showMaxTrend} onChange={(e) => setShowMaxTrend(e.target.checked)} />
                    Show max trend line
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showDriftPeriodColumns} onChange={(e) => setShowDriftPeriodColumns(e.target.checked)} />
                    HR drift columns (Dec / Thr / Race)
                </label>
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
                    <div className="min-w-0 overflow-hidden">
                        <PlaygroundVolumeChart
                            data={trendData.chartData}
                            chartType={chartType}
                            metricLabel={metric.label}
                            metricUnit={metric.unit}
                            metricDecimals={metric.decimals}
                            showTrend
                            showMax={showMax}
                            showMaxTrend={showMaxTrend}
                        />
                    </div>

                    <PlaygroundPeriodTable>
                        <thead>
                            <tr className="bg-cdborder/40">
                                <th className={`${playgroundThClass} w-[18%]`}>Period</th>
                                <PlaygroundResponsiveHeader label={metric.label} className={`${playgroundThClass} w-[18%]`} />
                                {compareMode !== 'none' && (
                                    <th className={`${playgroundThClass} w-[14%]`}>
                                        <span className="sm:hidden">Cmp</span>
                                        <span className="hidden sm:inline">Compare</span>
                                    </th>
                                )}
                                <th className={`${playgroundThClass} w-[16%]`}>Trend</th>
                                {showMax && <th className={`${playgroundThClass} w-[12%]`}>Max</th>}
                                {showMaxTrend && (
                                    <th className={`${playgroundThClass} w-[14%]`}>
                                        <span className="sm:hidden">Mx tr</span>
                                        <span className="hidden sm:inline">Max trend</span>
                                    </th>
                                )}
                                {showDriftPeriodColumns && (
                                    <>
                                        <th className={`${playgroundThClass} w-[10%]`} title="Avg steady decoupling % per period (analyzed rides only)">Dec</th>
                                        <th className={`${playgroundThClass} w-[10%]`} title="Avg threshold drift % per period">Thr</th>
                                        <th className={`${playgroundThClass} w-[10%]`} title="Avg race drift % per period">Race</th>
                                    </>
                                )}
                                <th className={`${playgroundThClass} w-[10%]`}>Rides</th>
                            </tr>
                        </thead>
                        <tbody className="text-cdtext">
                            {trendData.chartData.map((row) => (
                                <tr key={row.key} className="border-t border-cdborder">
                                    <td className={playgroundTdTextClass}>{row.label}</td>
                                    <td className={playgroundTdMonoClass}>{row.value}{unitSuffix}</td>
                                    {compareMode !== 'none' && (
                                        <td className={`${playgroundTdMonoClass} text-cdmuted`}>
                                            {row.compareValue ?? '—'}{row.compareValue != null ? unitSuffix : ''}
                                        </td>
                                    )}
                                    <td className={`${playgroundTdMonoClass} text-blue-300`}>{row.trend}{unitSuffix}</td>
                                    {showMax && <td className={`${playgroundTdMonoClass} text-purple-300`}>{row.maxValue}{unitSuffix}</td>}
                                    {showMaxTrend && <td className={`${playgroundTdMonoClass} text-pink-300`}>{row.maxTrend}{unitSuffix}</td>}
                                    {showDriftPeriodColumns && (
                                        <>
                                            <DriftPeriodCell
                                                value={row.periodDecouplingPct}
                                                analyzedCount={row.decouplingAnalyzedCount}
                                                active={metricId === 'decouplingPct'}
                                            />
                                            <DriftPeriodCell
                                                value={row.periodThresholdDriftPct}
                                                analyzedCount={row.thresholdAnalyzedCount}
                                                active={metricId === 'thresholdDriftPct'}
                                            />
                                            <DriftPeriodCell
                                                value={row.periodRaceDriftPct}
                                                analyzedCount={row.raceAnalyzedCount}
                                                active={metricId === 'raceDriftPct'}
                                            />
                                        </>
                                    )}
                                    <td className={playgroundTdMutedClass}>{row.rideCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </PlaygroundPeriodTable>
                </>
            )}
        </div>
    );
}

function DriftPeriodCell({ value, analyzedCount, active = false }) {
    const title = analyzedCount > 0
        ? `Average from ${analyzedCount} analyzed ride${analyzedCount === 1 ? '' : 's'}`
        : 'No analyzed rides in this period';
    return (
        <td
            className={`${playgroundTdMonoClass} ${active ? 'text-cdaccent font-semibold' : 'text-cdmuted'}`}
            title={title}
        >
            {value != null ? `${value}%` : '—'}
        </td>
    );
}

function FilterSelect({ label, value, onChange, options, children }) {
    return (
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
            <span className="font-semibold text-cdtext">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[130px]">
                {children || options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
