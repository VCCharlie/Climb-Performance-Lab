import { getCssVar } from '../theme';

/**
 * Resolved chart colors from MD3 CSS variables (respects light/dark).
 */
export function getChartTheme() {
  const muted = getCssVar('--cd-muted', '#64748b');
  const border = getCssVar('--cd-border', '#dce1e8');
  const surfaceHigh = getCssVar('--cd-surface-container-high', '#e2e5ea');

  return {
    grid: border,
    axis: muted,
    axisStroke: muted,
    axisTick: { fill: muted, fontSize: 11 },
    cursor: {
      fill: surfaceHigh,
      fillOpacity: 0.4,
    },
    primary: getCssVar('--cd-primary', '#a96332'),
    green: getCssVar('--cd-green', '#16a34a'),
    blue: getCssVar('--cd-blue', '#3b82f6'),
  };
}

/** Tonal chart card — no heavy shadow. */
const chartCardBase = 'rounded-cdlg border border-cdborder/60 bg-cdsurface';
export const chartCardShellClass = chartCardBase;
export const chartCardClass = `${chartCardBase} p-5`;
export const chartCardClassLg = `${chartCardBase} p-6`;

export const chartTooltipShellClass =
  'rounded-cdlg border border-cdborder/60 bg-cdsurface px-3 py-2.5 text-left shadow-lg max-w-xs pointer-events-none outline-none';

/** Wrapper around ResponsiveContainer — suppresses sticky chart focus after touch scrub/tap. */
export const chartHostClass = 'cd-chart-host';

/** Mobile-friendly toggle buttons on dashboard chart cards (week/month, metric pickers). */
export function chartSegmentToggleClass(isActive, activeClasses = 'bg-cdaccent text-white') {
  return `px-3 py-1.5 text-[11px] font-bold cd-min-touch-y cd-focus-ring transition-colors ${
    isActive ? activeClasses : 'text-cdmuted hover:text-cdtext'
  }`;
}
