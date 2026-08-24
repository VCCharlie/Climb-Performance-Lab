import React from 'react';
import { formatNlNumber } from '../../utils';
import { formatLongRange } from './powerTopTenByDurationConstants';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
    RankedTableDesktop,
    RankedTableMobileCards,
} from './dashboardRankedTableParts';

export const PeriodSummaryCard = ({
    title,
    accentClass,
    bounds,
    stats,
    showRideAverages = false,
}) => (
    <div className={`rounded-lg border p-3 ${accentClass}`}>
        <div className="text-[10px] font-bold uppercase text-cdmuted mb-1">{title}</div>
        <p className="text-xs text-cdtext font-medium leading-snug mb-3 break-words">
            {bounds ? formatLongRange(bounds) : '—'}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Rides</div>
                <div className="text-sm font-bold text-cdtext tabular-nums">{formatNlNumber(stats.rideCount)}</div>
            </div>
            <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Distance</div>
                <div className="text-sm font-bold text-cdtext tabular-nums break-words">
                    {formatNlNumber(Math.round(stats.distanceKm * 10) / 10)} km
                </div>
            </div>
            <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Elevation</div>
                <div className="text-sm font-bold text-cdtext tabular-nums">{formatNlNumber(stats.elevationM)} m</div>
            </div>
        </div>
        {showRideAverages && (
            <div className="grid grid-cols-2 gap-2 text-center sm:text-left mt-2 pt-2 border-t border-cdborder/40">
                <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Avg distance</div>
                    <div className="text-sm font-bold text-cdtext tabular-nums">
                        {stats.avgDistanceKm != null && stats.rideCount > 0
                            ? `${formatNlNumber(Math.round(stats.avgDistanceKm * 10) / 10)} km`
                            : '—'}
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Avg speed</div>
                    <div className="text-sm font-bold text-cdtext tabular-nums">
                        {stats.avgSpeedKmh != null
                            ? `${formatNlNumber(Math.round(stats.avgSpeedKmh * 10) / 10)} km/h`
                            : '—'}
                    </div>
                </div>
            </div>
        )}
    </div>
);

const wattCompareClass = (watts, peerWatts) => {
    const w = Number(watts) || 0;
    const p = peerWatts != null ? Number(peerWatts) : NaN;
    if (!w || Number.isNaN(p) || p <= 0) return 'text-cdtext';
    if (w > p) return 'text-emerald-400/95 bg-emerald-500/[0.08] rounded px-1.5 -mx-0.5';
    if (w < p) return 'text-cdmuted/80';
    return 'text-cdtext';
};

const wattCompareTitle = (watts, peerWatts) => {
    const w = Number(watts) || 0;
    const p = peerWatts != null ? Number(peerWatts) : NaN;
    if (!w || Number.isNaN(p) || p <= 0) return undefined;
    if (w > p) return `Higher than the other period at this rank (${p} W)`;
    if (w < p) return `Lower than the other period at this rank (${p} W)`;
    return 'Tied at this rank';
};

export const TopTable = ({ rows, peerRows, onOpenActivityInLog, emptyHint }) => {
    const isMobile = useMediaQuery('(max-width: 639px)');

    const sharedProps = {
        rows,
        peerRows,
        variant: 'power',
        onOpenActivityInLog,
        emptyHint: emptyHint || 'No data.',
        valueCompareClass: wattCompareClass,
        valueCompareTitle: wattCompareTitle,
        getValue: (row) => row.watts,
        formatValue: (watts) => watts,
    };

    if (isMobile) {
        return <RankedTableMobileCards {...sharedProps} />;
    }

    return <RankedTableDesktop {...sharedProps} />;
};
