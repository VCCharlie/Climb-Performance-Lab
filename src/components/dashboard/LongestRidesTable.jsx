import React from 'react';
import { formatNlNumber } from '../../utils';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
    RankedTableDesktop,
    RankedTableMobileCards,
} from './dashboardRankedTableParts';

const kmCompareClass = (km, peerKm) => {
    const k = Number(km) || 0;
    const p = peerKm != null ? Number(peerKm) : NaN;
    if (!k || Number.isNaN(p) || p <= 0) return 'text-cdtext';
    if (k > p) return 'text-emerald-400/95 bg-emerald-500/[0.08] rounded px-1.5 -mx-0.5';
    if (k < p) return 'text-cdmuted/80';
    return 'text-cdtext';
};

const kmCompareTitle = (km, peerKm) => {
    const k = Number(km) || 0;
    const p = peerKm != null ? Number(peerKm) : NaN;
    if (!k || Number.isNaN(p) || p <= 0) return undefined;
    if (k > p) return `Longer ride at this rank (${formatNlNumber(p, { maximumFractionDigits: 1 })} km)`;
    if (k < p) return `Shorter ride at this rank (${formatNlNumber(p, { maximumFractionDigits: 1 })} km)`;
    return 'Same distance at this rank';
};

const formatKm = (km) => formatNlNumber(Math.round(km * 10) / 10, { maximumFractionDigits: 1 });

/**
 * @param {{ activity: object, km: number }[]} rows
 * @param {{ activity: object, km: number }[] | null} peerRows - same rank index for comparison highlight
 */
export default function LongestRidesTable({ rows, peerRows, onOpenActivityInLog, emptyHint }) {
    const isMobile = useMediaQuery('(max-width: 639px)');

    const sharedProps = {
        rows,
        peerRows,
        variant: 'distance',
        onOpenActivityInLog,
        emptyHint: emptyHint || 'No rides with distance in this period.',
        valueCompareClass: kmCompareClass,
        valueCompareTitle: kmCompareTitle,
        getValue: (row) => row.km,
        formatValue: formatKm,
    };

    if (isMobile) {
        return <RankedTableMobileCards {...sharedProps} />;
    }

    return <RankedTableDesktop {...sharedProps} />;
}
