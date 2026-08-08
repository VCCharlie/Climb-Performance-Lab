import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  EXPLORER_METRIC_GROUPS,
  EXPLORER_PRESETS,
  EXPLORER_VIEW_MODES,
  EXPLORER_VIEW_OPTIONS,
  formatPlaygroundAxisTick,
} from '../../../utils/coach/coachPlaygroundMetrics.js';
import { buildExplorerData, RIDE_ENVIRONMENT } from '../../../utils/coach/coachPlaygroundExplorer.js';
import {
  defaultPlaygroundPrimaryRange,
  playgroundRangeForYears,
} from '../../../utils/coach/coachDataPlayground.js';
import { todayYmd } from '../../../utils/coach/coachHelpers.js';
import NlDateInput from '../../NlDateInput.jsx';
import PlaygroundScatterChart from './PlaygroundScatterChart.jsx';
import PlaygroundPeriodTable from './PlaygroundPeriodTable.jsx';
import { playgroundTdMonoClass, playgroundTdMutedClass, playgroundTdTextClass, playgroundThClass } from '../../../utils/playgroundTableStyles.js';

const RANGE_PRESETS = [
  { id: '1y', label: '1 year', years: 1 },
  { id: '3y', label: '3 years', years: 3 },
  { id: '5y', label: '5 years', years: 5 },
  { id: '10y', label: '10 years', years: 10 },
  { id: 'all', label: 'All data', years: 30 },
];

const THEME = {
  grid: 'var(--cd-border, #334155)',
  text: 'var(--cd-muted, #94a3b8)',
  xLine: 'var(--cd-accent, #fbbf24)',
  yLine: '#38bdf8',
};

const SORT_KEYS = {
  label: 'label',
  x: 'x',
  y: 'y',
  color: 'color',
  rideCount: 'rideCount',
};

function MetricSelect({ label, value, onChange, allowNone = false }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-cdmuted min-w-[150px]">
      <span className="font-semibold text-cdtext">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext"
      >
        {allowNone && <option value="">None</option>}
        {EXPLORER_METRIC_GROUPS.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.options.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function SortHeader({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={playgroundThClass}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 sm:gap-1 uppercase font-semibold leading-tight ${active ? 'text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
      >
        {label}
        <Icon size={12} className="shrink-0" />
      </button>
    </th>
  );
}

function DualTimelineTooltip({ active, payload, xUnit, yUnit }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-cdtext">{row.label}</p>
      {row.xValue != null && (
        <p className="text-cdtext">X: <strong>{row.xValue}{xUnit ? ` ${xUnit}` : ''}</strong></p>
      )}
      {row.yValue != null && (
        <p className="text-cdtext">Y: <strong>{row.yValue}{yUnit ? ` ${yUnit}` : ''}</strong></p>
      )}
      {row.rideCount != null && <p className="text-cdmuted mt-1">Rides: {row.rideCount}</p>}
    </div>
  );
}

function sortPoints(points, sortKey, direction) {
  const factor = direction === 'asc' ? 1 : -1;
  return [...points].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (sortKey === SORT_KEYS.label) {
      return factor * String(av || '').localeCompare(String(bv || ''));
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return factor * (av - bv);
  });
}

export default function PlaygroundExplorerPanel({ activities }) {
  const today = todayYmd();
  const defaultRange = defaultPlaygroundPrimaryRange(today);

  const [viewMode, setViewMode] = useState(EXPLORER_VIEW_MODES.SCATTER);
  const [cadence, setCadence] = useState('yearly');
  const [xMetric, setXMetric] = useState('avgHr');
  const [yMetric, setYMetric] = useState('avgSpeed');
  const [colorMetric, setColorMetric] = useState('distanceKm');
  const [sizeMetric, setSizeMetric] = useState('');
  const [topN, setTopN] = useState(10);
  const [rideEnvironment, setRideEnvironment] = useState(RIDE_ENVIRONMENT.ALL);
  const [excludeZeros, setExcludeZeros] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [sortKey, setSortKey] = useState(SORT_KEYS.label);
  const [sortDir, setSortDir] = useState('desc');
  const [primaryStart, setPrimaryStart] = useState(defaultRange.startYmd);
  const [primaryEnd, setPrimaryEnd] = useState(defaultRange.endYmd);
  const [rangePreset, setRangePreset] = useState('5y');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === SORT_KEYS.label ? 'desc' : 'asc');
    }
  };

  const applyPreset = (preset) => {
    setXMetric(preset.xMetric);
    setYMetric(preset.yMetric);
    setColorMetric(preset.colorMetric || '');
    setCadence(preset.cadence || 'yearly');
  };

  const applyRangePreset = (presetId) => {
    setRangePreset(presetId);
    const preset = RANGE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const range = playgroundRangeForYears(today, preset.years);
    setPrimaryStart(range.startYmd);
    setPrimaryEnd(range.endYmd);
  };

  const explorer = useMemo(
    () => buildExplorerData(activities, {
      cadence,
      startYmd: primaryStart,
      endYmd: primaryEnd,
      xMetric,
      yMetric,
      colorMetric: colorMetric || undefined,
      sizeMetric: sizeMetric || undefined,
      topN,
      rideEnvironment,
      excludeZeros,
    }),
    [activities, cadence, primaryStart, primaryEnd, xMetric, yMetric, colorMetric, sizeMetric, topN, rideEnvironment, excludeZeros],
  );

  const sortedPoints = useMemo(
    () => sortPoints(explorer.points, sortKey, sortDir),
    [explorer.points, sortKey, sortDir],
  );

  const needsTopN = xMetric.endsWith('_topN') || yMetric.endsWith('_topN')
    || (colorMetric && colorMetric.endsWith('_topN'))
    || (sizeMetric && sizeMetric.endsWith('_topN'));

  return (
    <div className="space-y-4">
      <p className="text-xs text-cdmuted leading-relaxed">
        Combine any metrics freely: pick X and Y, optionally color or size bubbles by a third metric.
        Drag the brush below the chart to zoom. Each dot is one ride or one time bucket.
      </p>

      <div className="flex flex-wrap gap-2">
        {EXPLORER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            className="text-xs px-2.5 py-1 rounded-full border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <MetricSelect label="X axis" value={xMetric} onChange={setXMetric} />
        <MetricSelect label="Y axis" value={yMetric} onChange={setYMetric} />
        <MetricSelect label="Color by" value={colorMetric} onChange={setColorMetric} allowNone />
        <MetricSelect label="Bubble size" value={sizeMetric} onChange={setSizeMetric} allowNone />

        <label className="flex flex-col gap-1 text-xs text-cdmuted">
          <span className="font-semibold text-cdtext">Each dot is</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[130px]"
          >
            <option value="ride">One ride</option>
            <option value="weekly">One week</option>
            <option value="monthly">One month</option>
            <option value="yearly">One year</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-cdmuted">
          <span className="font-semibold text-cdtext">Ride type</span>
          <select
            value={rideEnvironment}
            onChange={(e) => setRideEnvironment(e.target.value)}
            className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[130px]"
          >
            <option value={RIDE_ENVIRONMENT.ALL}>Indoor + outdoor</option>
            <option value={RIDE_ENVIRONMENT.OUTDOOR}>Outdoor only</option>
            <option value={RIDE_ENVIRONMENT.INDOOR}>Indoor / virtual only</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-cdmuted">
          <span className="font-semibold text-cdtext">View</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[130px]"
          >
            {EXPLORER_VIEW_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>

        {needsTopN && (
          <label className="flex flex-col gap-1 text-xs text-cdmuted">
            <span className="font-semibold text-cdtext">Top N (power)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
              className="w-20 bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-sm text-cdtext"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-cdmuted">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showTrendLine} onChange={(e) => setShowTrendLine(e.target.checked)} />
          Show trend line (cyan)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={excludeZeros} onChange={(e) => setExcludeZeros(e.target.checked)} />
          Exclude zero / missing axis values
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoZoom} onChange={(e) => setAutoZoom(e.target.checked)} />
          Auto-zoom to data range
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyRangePreset(p.id)}
            className={`text-xs px-2.5 py-1 rounded-full border ${rangePreset === p.id ? 'border-cdaccent text-cdaccent' : 'border-cdborder text-cdmuted'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
          <span className="font-semibold text-cdtext">From</span>
          <NlDateInput value={primaryStart} onChange={setPrimaryStart} className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext w-full" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
          <span className="font-semibold text-cdtext">To</span>
          <NlDateInput value={primaryEnd} onChange={setPrimaryEnd} className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext w-full" />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border border-cdborder px-2.5 py-1 text-cdmuted">
          {explorer.validScatterCount} points with both X & Y
        </span>
        {explorer.correlation != null && (
          <span className="rounded-full border border-cdborder px-2.5 py-1 text-cdtext">
            Correlation (r): <strong className="text-cdaccent">{explorer.correlation}</strong>
            <span className="text-cdmuted ml-1">
              {Math.abs(explorer.correlation) > 0.7 ? '— strong' : Math.abs(explorer.correlation) > 0.4 ? '— moderate' : '— weak'}
            </span>
          </span>
        )}
      </div>

      {viewMode === EXPLORER_VIEW_MODES.SCATTER ? (
        <PlaygroundScatterChart
          points={explorer.scatterPoints}
          xLabel={explorer.xMeta.label}
          yLabel={explorer.yMeta.label}
          xUnit={explorer.xMeta.unit}
          yUnit={explorer.yMeta.unit}
          sizeLabel={explorer.sizeMeta?.label}
          showTrendLine={showTrendLine}
          autoZoom={autoZoom}
        />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={explorer.timelineData} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
            <XAxis dataKey="label" tick={{ fill: THEME.text, fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              yAxisId="left"
              tick={{ fill: THEME.text, fontSize: 11 }}
              width={48}
              tickFormatter={(v) => formatPlaygroundAxisTick(v, { decimals: explorer.xMeta.decimals, unit: explorer.xMeta.unit })}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: THEME.text, fontSize: 11 }}
              width={48}
              tickFormatter={(v) => formatPlaygroundAxisTick(v, { decimals: explorer.yMeta.decimals, unit: explorer.yMeta.unit })}
            />
            <Tooltip content={<DualTimelineTooltip xUnit={explorer.xMeta.unit} yUnit={explorer.yMeta.unit} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="xValue" name={explorer.xMeta.label} stroke={THEME.xLine} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="yValue" name={explorer.yMeta.label} stroke={THEME.yLine} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <PlaygroundPeriodTable>
        <thead>
          <tr className="bg-cdborder/40">
            <SortHeader label="Period" sortKey={SORT_KEYS.label} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortHeader label={explorer.xMeta.label} sortKey={SORT_KEYS.x} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortHeader label={explorer.yMeta.label} sortKey={SORT_KEYS.y} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            {explorer.colorMeta && (
              <SortHeader label={explorer.colorMeta.label} sortKey={SORT_KEYS.color} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            )}
            <SortHeader label="Rides" sortKey={SORT_KEYS.rideCount} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody className="text-cdtext">
          {sortedPoints.map((row) => (
            <tr key={row.key} className="border-t border-cdborder">
              <td className={playgroundTdTextClass}>{row.label}</td>
              <td className={playgroundTdMonoClass}>{row.x ?? '—'}</td>
              <td className={playgroundTdMonoClass}>{row.y ?? '—'}</td>
              {explorer.colorMeta && <td className={playgroundTdMutedClass}>{row.color ?? '—'}</td>}
              <td className={playgroundTdMutedClass}>{row.rideCount}</td>
            </tr>
          ))}
        </tbody>
      </PlaygroundPeriodTable>
    </div>
  );
}
