import React from 'react';
import { cn } from './cn';
import { chartTooltipShellClass } from '../../utils/chartTheme';

/**
 * MD3-styled Recharts tooltip — theme-aware surface, no hardcoded slate hex.
 *
 * Usage:
 *   <Tooltip content={(props) => <ChartTooltip {...props} formatter={...} />} cursor={theme.cursor} />
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
  className,
  accessibilityLayer = false,
}) {
  if (!active || !payload?.length) return null;

  const entries = payload.filter((entry) => entry.value != null && entry.value !== '');
  if (!entries.length) return null;

  const title = !hideLabel && label != null && label !== ''
    ? (labelFormatter ? labelFormatter(label) : label)
    : null;

  const a11yProps = accessibilityLayer
    ? { role: 'status', 'aria-live': 'polite' }
    : { 'aria-hidden': true };

  return (
    <div className={cn(chartTooltipShellClass, className)} {...a11yProps}>
      {title != null && (
        <p className="text-xs font-semibold text-cdtext mb-1.5 tabular-nums">{title}</p>
      )}
      <ul className="space-y-1">
        {entries.map((entry) => {
          let displayValue = entry.value;
          let displayName = entry.name ?? entry.dataKey;

          if (formatter) {
            const result = formatter(entry.value, entry.name, entry);
            if (Array.isArray(result)) {
              [displayValue, displayName] = result;
            } else if (result != null) {
              displayValue = result;
            }
          }

          return (
            <li
              key={`${entry.dataKey}-${String(entry.name)}`}
              className="flex items-center justify-between gap-4 text-xs leading-snug"
            >
              <span className="flex items-center gap-1.5 text-cdmuted min-w-0">
                {entry.color && (
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden
                  />
                )}
                <span className="truncate">{displayName}</span>
              </span>
              <span className="font-semibold text-cdtext tabular-nums shrink-0">{displayValue}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
