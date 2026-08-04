import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Legend,
} from 'recharts';

const THEME = {
  grid: 'var(--cd-border, #334155)',
  text: 'var(--cd-muted, #94a3b8)',
  primary: 'var(--cd-accent, #fbbf24)',
};

function sizeRange(points) {
  const sizes = points.map((p) => p.size).filter((s) => s != null && s > 0);
  if (!sizes.length) return [40, 40];
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  if (min === max) return [60, 60];
  return [30, 200];
}

function ExplorerScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg max-w-xs">
      <p className="mb-1 font-semibold text-cdtext">{row.label}</p>
      {row.x != null && (
        <p className="text-cdtext">
          {row.xMetric || 'X'}: <strong>{row.x}</strong>
        </p>
      )}
      {row.y != null && (
        <p className="text-cdtext">
          {row.yMetric || 'Y'}: <strong>{row.y}</strong>
        </p>
      )}
      {row.color != null && row.colorMetric && (
        <p className="text-cdmuted">
          {row.colorMetric}: <strong>{row.color}</strong>
        </p>
      )}
      {row.size != null && row.sizeMetric && (
        <p className="text-cdmuted">
          {row.sizeMetric}: <strong>{row.size}</strong>
        </p>
      )}
      {row.rideCount != null && (
        <p className="mt-1 text-cdmuted">Rides: {row.rideCount}</p>
      )}
    </div>
  );
}

export default function PlaygroundScatterChart({
  points,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  colorLabel,
  sizeLabel,
}) {
  if (!points?.length) {
    return (
      <p className="text-sm text-cdmuted py-8 text-center">No overlapping data for this metric pair.</p>
    );
  }

  const [zMin, zMax] = sizeRange(points);
  const hasSize = points.some((p) => p.size != null && p.size > 0);

  const chartPoints = points.map((p) => ({
    ...p,
    z: p.size ?? 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} opacity={0.5} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fill: THEME.text, fontSize: 11 }}
          label={{ value: `${xLabel}${xUnit ? ` (${xUnit})` : ''}`, position: 'insideBottom', offset: -4, fill: THEME.text, fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fill: THEME.text, fontSize: 11 }}
          width={52}
          label={{ value: `${yLabel}${yUnit ? ` (${yUnit})` : ''}`, angle: -90, position: 'insideLeft', fill: THEME.text, fontSize: 11 }}
        />
        {hasSize && (
          <ZAxis type="number" dataKey="z" range={[zMin, zMax]} name={sizeLabel || 'Size'} />
        )}
        <Tooltip content={<ExplorerScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Scatter
          name={`${xLabel} vs ${yLabel}`}
          data={chartPoints}
          fill={THEME.primary}
          fillOpacity={0.75}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
