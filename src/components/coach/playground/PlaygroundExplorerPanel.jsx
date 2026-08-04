import { useMemo, useState } from 'react';
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
} from '../../../utils/coach/coachPlaygroundMetrics.js';
import { buildExplorerData } from '../../../utils/coach/coachPlaygroundExplorer.js';
import {
  defaultPlaygroundPrimaryRange,
  playgroundRangeForYears,
} from '../../../utils/coach/coachDataPlayground.js';
import { todayYmd } from '../../../utils/coach/coachHelpers.js';
import NlDateInput from '../../NlDateInput.jsx';
import PlaygroundScatterChart from './PlaygroundScatterChart.jsx';

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
  const [primaryStart, setPrimaryStart] = useState(defaultRange.startYmd);
  const [primaryEnd, setPrimaryEnd] = useState(defaultRange.endYmd);
  const [rangePreset, setRangePreset] = useState('5y');

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
    }),
    [activities, cadence, primaryStart, primaryEnd, xMetric, yMetric, colorMetric, sizeMetric, topN],
  );

  const needsTopN = xMetric.endsWith('_topN') || yMetric.endsWith('_topN')
    || (colorMetric && colorMetric.endsWith('_topN'))
    || (sizeMetric && sizeMetric.endsWith('_topN'));

  return (
    <div className="space-y-4">
      <p className="text-xs text-cdmuted leading-relaxed">
        Combine any metrics freely: pick X and Y, optionally color or size bubbles by a third metric.
        Each dot is one ride or one time bucket (week / month / year).
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
          colorLabel={explorer.colorMeta?.label}
          sizeLabel={explorer.sizeMeta?.label}
        />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={explorer.timelineData} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
            <XAxis dataKey="label" tick={{ fill: THEME.text, fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fill: THEME.text, fontSize: 11 }} width={48} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: THEME.text, fontSize: 11 }} width={48} />
            <Tooltip content={<DualTimelineTooltip xUnit={explorer.xMeta.unit} yUnit={explorer.yMeta.unit} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="xValue" name={explorer.xMeta.label} stroke={THEME.xLine} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="yValue" name={explorer.yMeta.label} stroke={THEME.yLine} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="overflow-x-auto rounded-lg border border-cdborder max-h-56 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-cdsurface">
            <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">{explorer.xMeta.label}</th>
              <th className="px-3 py-2">{explorer.yMeta.label}</th>
              {explorer.colorMeta && <th className="px-3 py-2">{explorer.colorMeta.label}</th>}
              <th className="px-3 py-2">Rides</th>
            </tr>
          </thead>
          <tbody className="text-cdtext">
            {explorer.points.map((row) => (
              <tr key={row.key} className="border-t border-cdborder">
                <td className="px-3 py-1.5 whitespace-nowrap">{row.label}</td>
                <td className="px-3 py-1.5 font-mono">{row.x ?? '—'}</td>
                <td className="px-3 py-1.5 font-mono">{row.y ?? '—'}</td>
                {explorer.colorMeta && <td className="px-3 py-1.5 font-mono text-cdmuted">{row.color ?? '—'}</td>}
                <td className="px-3 py-1.5 text-cdmuted">{row.rideCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
