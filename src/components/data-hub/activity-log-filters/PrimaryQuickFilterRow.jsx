import React from 'react';
import { Chip } from '../../ui';

/**
 * Top-level quick filters always visible — full set lives in the filter drawer.
 */
export default function PrimaryQuickFilterRow({
    compact = false,
    thisWeekOnly,
    onThisWeekOnlyChange,
    rollingDays,
    onRollingDaysChange,
    withPowerOnly,
    onWithPowerOnlyChange,
    noPowerOnly,
    onNoPowerOnlyChange,
    highLoadOnly,
    onHighLoadOnlyChange,
    longRideOnly,
    onLongRideOnlyChange,
}) {
    return (
        <div className="flex flex-wrap gap-1.5 items-center min-w-0 flex-1">
            {!compact ? (
                <Chip
                    size="xs"
                    selected={thisWeekOnly}
                    onClick={() => {
                        onThisWeekOnlyChange((v) => !v);
                        onRollingDaysChange(null);
                    }}
                >
                    This week
                </Chip>
            ) : null}
            <Chip
                size="xs"
                selected={rollingDays === 30}
                onClick={() => {
                    onRollingDaysChange((cur) => (cur === 30 ? null : 30));
                    onThisWeekOnlyChange(false);
                }}
            >
                Last 30d
            </Chip>
            <Chip
                size="xs"
                selected={withPowerOnly}
                onClick={() => {
                    onWithPowerOnlyChange((v) => {
                        const next = !v;
                        if (next) onNoPowerOnlyChange(false);
                        return next;
                    });
                }}
            >
                With power
            </Chip>
            <Chip
                size="xs"
                selected={longRideOnly}
                onClick={() => onLongRideOnlyChange((v) => !v)}
                title="Distance > 100 km"
            >
                Long ride
            </Chip>
            <Chip
                size="xs"
                selected={highLoadOnly}
                onClick={() => onHighLoadOnlyChange((v) => !v)}
                title="Load (TSS) > 120"
            >
                High load
            </Chip>
        </div>
    );
}
