import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  AreaChart,
  ScatterChart,
  Scatter,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_TYPES, formatPlaygroundAxisTick } from '../../../utils/coach/coachPlaygroundMetrics.js';
import { CHART_A11Y_PROPS } from '../../../utils/chartA11y';
import ChartHost from '../../ui/ChartHost';

const THEME = {
  grid: 'var(--cd-border, #334155)',
  text: 'var(--cd-muted, #94a3b8)',
  primary: 'var(--cd-accent, #fbbf24)',
  secondary: '#38bdf8',
  tertiary: '#a78bfa',
};

function ChartShell({ children }) {
  return (
    <ChartHost className="relative min-w-0 overflow-hidden isolate">
      {children}
    </ChartHost>
  );
}

function PlaygroundTooltip({ active, payload, label, metricLabel, showMax, showTrend, showMaxTrend }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-cdtext">{label}</p>
      {row.value != null && (
        <p className="text-cdtext">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.primary }} />
          {metricLabel}: <strong>{row.value}</strong>
        </p>
      )}
      {showMax && row.maxValue != null && (
        <p className="text-cdtext">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.tertiary }} />
          Max: <strong>{row.maxValue}</strong>
        </p>
      )}
      {showTrend && row.trend != null && (
        <p className="text-cdmuted">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: THEME.secondary }} />
          Avg trend ({row.trendWindow || 3}): <strong>{row.trend}</strong>
        </p>
      )}
      {showMaxTrend && row.maxTrend != null && (
        <p className="text-cdmuted">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: '#f472b6' }} />
          Max trend: <strong>{row.maxTrend}</strong>
        </p>
      )}
      {row.count != null && (
        <p className="mt-1 text-cdmuted">Activities: {row.count}</p>
      )}
    </div>
  );
}

function buildTooltipProps(metricLabel, showMax, showTrend, showMaxTrend) {
  return {
    allowEscapeViewBox: { x: false, y: false },
    wrapperStyle: { zIndex: 20, pointerEvents: 'none' },
    content: (
      <PlaygroundTooltip
        metricLabel={metricLabel}
        showMax={showMax}
        showTrend={showTrend}
        showMaxTrend={showMaxTrend}
      />
    ),
  };
}

export default function PlaygroundVolumeChart({
  data,
  chartType,
  metricLabel,
  metricUnit = '',
  metricDecimals,
  showTrend,
  showMax,
  showMaxTrend,
}) {
  if (!data?.length) {
    return (
      <p className="text-sm text-cdmuted py-8 text-center">No data for this selection.</p>
    );
  }

  const common = {
    data,
    margin: { top: 8, right: 12, left: 0, bottom: 0 },
    ...CHART_A11Y_PROPS,
  };

  const yTickFormatter = (v) => formatPlaygroundAxisTick(v, { decimals: metricDecimals, unit: metricUnit });
  const tooltip = buildTooltipProps(metricLabel, showMax, showTrend, showMaxTrend);

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
      <XAxis dataKey="label" tick={{ fill: THEME.text, fontSize: 11 }} />
      <YAxis tick={{ fill: THEME.text, fontSize: 11 }} width={48} tickFormatter={yTickFormatter} />
      <Tooltip {...tooltip} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </>
  );

  if (chartType === CHART_TYPES.SCATTER) {
    const scatterData = data.map((row, index) => ({
      ...row,
      periodIndex: index + 1,
    }));
    return (
      <ChartShell>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
            <XAxis
              type="number"
              dataKey="periodIndex"
              name="Period"
              tick={{ fill: THEME.text, fontSize: 11 }}
            />
            <YAxis tick={{ fill: THEME.text, fontSize: 11 }} width={48} tickFormatter={yTickFormatter} />
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Scatter name={metricLabel} data={scatterData} dataKey="value" fill={THEME.primary} fillOpacity={0.8} />
            {showMax && (
              <Scatter name="Max" data={scatterData} dataKey="maxValue" fill={THEME.tertiary} fillOpacity={0.6} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (chartType === CHART_TYPES.LINE) {
    return (
      <ChartShell>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart {...common}>
            {axes}
            <Line type="monotone" dataKey="value" name={metricLabel} stroke={THEME.primary} strokeWidth={2} dot={{ r: 3 }} />
            {showMax && (
              <Line type="monotone" dataKey="maxValue" name="Max" stroke={THEME.tertiary} strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 2" />
            )}
            {showTrend && (
              <Line type="monotone" dataKey="trend" name="Avg trend" stroke={THEME.secondary} strokeWidth={2} dot={false} />
            )}
            {showMaxTrend && (
              <Line type="monotone" dataKey="maxTrend" name="Max trend" stroke="#f472b6" strokeWidth={2} dot={false} strokeDasharray="6 3" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (chartType === CHART_TYPES.AREA) {
    return (
      <ChartShell>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart {...common}>
            {axes}
            <Area type="monotone" dataKey="value" name={metricLabel} stroke={THEME.primary} fill={THEME.primary} fillOpacity={0.25} />
            {showMax && (
              <Area type="monotone" dataKey="maxValue" name="Max" stroke={THEME.tertiary} fill={THEME.tertiary} fillOpacity={0.15} />
            )}
            {showTrend && (
              <Line type="monotone" dataKey="trend" name="Avg trend" stroke={THEME.secondary} strokeWidth={2} dot={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (chartType === CHART_TYPES.BAR) {
    return (
      <ChartShell>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart {...common}>
            {axes}
            <Bar dataKey="value" name={metricLabel} fill={THEME.primary} radius={[4, 4, 0, 0]} />
            {showMax && <Bar dataKey="maxValue" name="Max" fill={THEME.tertiary} radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart {...common}>
          {axes}
          <Bar dataKey="value" name={metricLabel} fill={THEME.primary} radius={[4, 4, 0, 0]} />
          {showMax && <Bar dataKey="maxValue" name="Max" fill={THEME.tertiary} radius={[4, 4, 0, 0]} opacity={0.7} />}
          {showTrend && (
            <Line type="monotone" dataKey="trend" name="Avg trend" stroke={THEME.secondary} strokeWidth={2} dot={{ r: 3 }} />
          )}
          {showMaxTrend && (
            <Line type="monotone" dataKey="maxTrend" name="Max trend" stroke="#f472b6" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
