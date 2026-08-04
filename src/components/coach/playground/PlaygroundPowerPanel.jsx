import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { buildPowerYearlyAnalysis } from '../../../utils/coach/coachPowerAnalysis.js';
import {
  POWER_PEAK_FIELDS,
  CHART_TYPES,
  POWER_STAT_MODES,
} from '../../../utils/coach/coachPlaygroundMetrics.js';

const THEME = {
  grid: 'var(--cd-border, #334155)',
  text: 'var(--cd-muted, #94a3b8)',
  primary: 'var(--cd-accent, #fbbf24)',
  secondary: '#38bdf8',
  tertiary: '#a78bfa',
  anomaly: '#f87171',
};

function PowerTooltip({ active, payload, label, barLabel, showTrend, showMaxTrend }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg max-w-xs">
      <p className="mb-1 font-semibold text-cdtext">{label}</p>
      {row.avg != null && (
        <p className="text-cdtext">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.primary }} />
          {barLabel}: <strong>{row.avg}</strong>
        </p>
      )}
      {row.max != null && (
        <p className="text-cdtext">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.tertiary }} />
          Max (top {row.topN || 'N'}): <strong>{row.max}</strong>
        </p>
      )}
      {showTrend && row.trend != null && (
        <p className="text-cdmuted">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.secondary }} />
          Avg trend: <strong>{row.trend}</strong>
        </p>
      )}
      {showMaxTrend && row.maxTrend != null && (
        <p className="text-cdmuted">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: '#f472b6' }} />
          Max trend: <strong>{row.maxTrend}</strong>
        </p>
      )}
      {row.count != null && <p className="mt-1 text-cdmuted">Qualifying rides: {row.count}</p>}
    </div>
  );
}

export default function PlaygroundPowerPanel({ activities }) {
  const [field, setField] = useState('best_60min');
  const [topN, setTopN] = useState(10);
  const [years, setYears] = useState(10);
  const [trendWindow, setTrendWindow] = useState(3);
  const [chartType, setChartType] = useState(CHART_TYPES.COMPOSED);
  const [statMode, setStatMode] = useState(POWER_STAT_MODES.AVG_AND_TREND);
  const [autoAnomalies, setAutoAnomalies] = useState(true);
  const [showAnomalyColor, setShowAnomalyColor] = useState(true);
  const [excludedKeys, setExcludedKeys] = useState(() => new Set());

  const analysis = useMemo(
    () =>
      buildPowerYearlyAnalysis(activities, {
        field,
        topN,
        years,
        trendWindow,
        excludedKeys,
        autoDetectAnomalies: autoAnomalies,
      }),
    [activities, field, topN, years, trendWindow, excludedKeys, autoAnomalies],
  );

  const peakMeta = POWER_PEAK_FIELDS.find((p) => p.id === field) || POWER_PEAK_FIELDS[0];
  const barLabel =
    statMode === POWER_STAT_MODES.MAX_ONLY || statMode === POWER_STAT_MODES.MAX_AND_TREND
      ? `Max top ${topN}`
      : `Avg top ${topN}`;
  const showTrend = statMode === POWER_STAT_MODES.AVG_AND_TREND || statMode === POWER_STAT_MODES.MAX_AND_TREND;
  const showMaxTrend = statMode === POWER_STAT_MODES.MAX_AND_TREND;
  const showMaxBar = statMode === POWER_STAT_MODES.MAX_ONLY || statMode === POWER_STAT_MODES.MAX_AND_TREND;

  const chartData = useMemo(
    () =>
      analysis.yearly.map((row) => ({
        ...row,
        barValue: showMaxBar ? row.max : row.avg,
        topN,
      })),
    [analysis.yearly, showMaxBar, topN],
  );

  const toggleExclusion = (key) => {
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleEfforts = analysis.efforts.slice(0, 80);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-cdmuted">
          Duration
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="mt-1 block rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          >
            {POWER_PEAK_FIELDS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-cdmuted">
          Top N
          <input
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            className="mt-1 block w-20 rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          />
        </label>

        <label className="text-xs text-cdmuted">
          Years back
          <input
            type="number"
            min={1}
            max={30}
            value={years}
            onChange={(e) => setYears(Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
            className="mt-1 block w-20 rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          />
        </label>

        <label className="text-xs text-cdmuted">
          Trend window
          <input
            type="number"
            min={1}
            max={10}
            value={trendWindow}
            onChange={(e) => setTrendWindow(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
            className="mt-1 block w-20 rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          />
        </label>

        <label className="text-xs text-cdmuted">
          Chart
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="mt-1 block rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          >
            <option value={CHART_TYPES.COMPOSED}>Bars + lines</option>
            <option value={CHART_TYPES.BAR}>Bars only</option>
            <option value={CHART_TYPES.LINE}>Lines only</option>
          </select>
        </label>

        <label className="text-xs text-cdmuted">
          Stats
          <select
            value={statMode}
            onChange={(e) => setStatMode(e.target.value)}
            className="mt-1 block rounded-lg border border-cdborder bg-cdsurface px-2 py-1.5 text-sm text-cdtext"
          >
            <option value={POWER_STAT_MODES.AVG_AND_TREND}>Avg + avg trend</option>
            <option value={POWER_STAT_MODES.MAX_ONLY}>Max only</option>
            <option value={POWER_STAT_MODES.MAX_AND_TREND}>Max + max trend</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-cdmuted">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoAnomalies} onChange={(e) => setAutoAnomalies(e.target.checked)} />
          Auto-detect anomalies (z-score)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAnomalyColor} onChange={(e) => setShowAnomalyColor(e.target.checked)} />
          Highlight anomalies in list
        </label>
        {excludedKeys.size > 0 && (
          <button
            type="button"
            onClick={() => setExcludedKeys(new Set())}
            className="text-cdaccent hover:underline"
          >
            Clear {excludedKeys.size} manual exclusion(s)
          </button>
        )}
      </div>

      <p className="text-xs text-cdmuted">
        Click efforts below to exclude/include from rankings. {peakMeta.label} — watts.
      </p>

      {chartData.some((r) => r.barValue != null) ? (
        <ResponsiveContainer width="100%" height={280}>
          {chartType === CHART_TYPES.LINE ? (
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
              <XAxis dataKey="year" tick={{ fill: THEME.text, fontSize: 11 }} />
              <YAxis tick={{ fill: THEME.text, fontSize: 11 }} width={48} />
              <Tooltip content={<PowerTooltip barLabel={barLabel} showTrend={showTrend} showMaxTrend={showMaxTrend} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="barValue" name={barLabel} stroke={THEME.primary} strokeWidth={2} dot={{ r: 3 }} />
              {showTrend && (
                <Line type="monotone" dataKey="trend" name="Avg trend" stroke={THEME.secondary} strokeWidth={2} dot={false} />
              )}
              {showMaxTrend && (
                <Line type="monotone" dataKey="maxTrend" name="Max trend" stroke="#f472b6" strokeWidth={2} dot={false} />
              )}
            </LineChart>
          ) : chartType === CHART_TYPES.BAR ? (
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
              <XAxis dataKey="year" tick={{ fill: THEME.text, fontSize: 11 }} />
              <YAxis tick={{ fill: THEME.text, fontSize: 11 }} width={48} />
              <Tooltip content={<PowerTooltip barLabel={barLabel} showTrend={false} showMaxTrend={false} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="barValue" name={barLabel} fill={THEME.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
              <XAxis dataKey="year" tick={{ fill: THEME.text, fontSize: 11 }} />
              <YAxis tick={{ fill: THEME.text, fontSize: 11 }} width={48} />
              <Tooltip content={<PowerTooltip barLabel={barLabel} showTrend={showTrend} showMaxTrend={showMaxTrend} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="barValue" name={barLabel} fill={THEME.primary} radius={[4, 4, 0, 0]} />
              {showTrend && (
                <Line type="monotone" dataKey="trend" name="Avg trend" stroke={THEME.secondary} strokeWidth={2} dot={{ r: 3 }} />
              )}
              {showMaxTrend && (
                <Line type="monotone" dataKey="maxTrend" name="Max trend" stroke="#f472b6" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-cdmuted py-8 text-center">No power peaks for this duration in the selected years.</p>
      )}

      <div className="max-h-48 overflow-y-auto rounded-lg border border-cdborder p-2 space-y-1">
        {visibleEfforts.map((e) => {
          const isAnomaly = analysis.anomalyKeys.has(e.key);
          const isExcluded = e.excluded || excludedKeys.has(e.key);
          const dimmed = isExcluded;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => toggleExclusion(e.key)}
              className={`w-full text-left text-xs px-2 py-1 rounded flex justify-between gap-2 ${
                dimmed ? 'opacity-40 line-through' : 'hover:bg-cdborder/30'
              } ${showAnomalyColor && isAnomaly && !dimmed ? 'border border-red-500/50 text-red-300' : ''}`}
              title={dimmed ? 'Click to include' : 'Click to exclude from rankings'}
            >
              <span className="truncate text-cdtext">
                {e.year} · {analysis.formatEffortDate(e.date)} · {e.title}
              </span>
              <span className="shrink-0 font-mono text-cdaccent">{e.watts} W</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
