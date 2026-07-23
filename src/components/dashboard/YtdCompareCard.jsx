import React, { useMemo } from 'react';
import { TrendingUp, Bike, Mountain, Clock, Zap } from 'lucide-react';
import { computeCplYtdYearOverYear, percentChange } from '../../utils/ytdYearOverYear';
import { chartCardClass } from '../../utils/chartTheme';

const LOCALE = 'en-GB';

const fmt = {
    int: (n) => Math.round(Number(n) || 0).toLocaleString(LOCALE),
    dist: (km) => `${(Number(km) || 0).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`,
    elev: (m) => `${Math.round(Number(m) || 0).toLocaleString(LOCALE)} m`,
    time: (sec) => {
        const s = Number(sec) || 0;
        const h = Math.floor(s / 3600);
        const mi = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${mi}m` : `${mi}m`;
    },
};

function pctArrow(pct) {
    if (pct == null) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${Math.round(pct)}%`;
}

function CompareLine({ label, cur, prev, pct, formatValue }) {
    if (prev === 0 && cur === 0) return null;
    const tone = pct == null ? 'text-cdmuted' : pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : pct < 0 ? 'text-amber-700 dark:text-amber-400' : 'text-cdtext';
    return (
        <p className="text-[11px] text-cdtext">
            <span className="font-bold text-cdmuted">{label}:</span>{' '}
            {formatValue(cur)}{' '}
            <span className="text-cdmuted">(last year {formatValue(prev)})</span>
            <span className={`font-medium ml-1 ${tone}`}>· {pctArrow(pct)} vs same period</span>
        </p>
    );
}

/**
 * YTD vs last year at the same calendar date — CPL activity log.
 */
const YtdCompareCard = ({ activities }) => {
    const ytdYoy = useMemo(
        () => computeCplYtdYearOverYear(activities, new Date()),
        [activities],
    );

    if (!ytdYoy?.thisYtd) return null;

    const { thisYtd, prevYtd } = ytdYoy;
    const refDate = new Date(ytdYoy.referenceDate);
    const subtitle = refDate.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });

    const hasAny = thisYtd.count > 0 || prevYtd.count > 0;
    if (!hasAny) return null;

    return (
        <div className={chartCardClass}>
            <div className="flex items-start gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-cdaccent shrink-0 mt-0.5" aria-hidden />
                <div>
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Year to date vs last year</h3>
                    <p className="text-[11px] text-cdmuted">
                        Same calendar window through {subtitle} — from your activity log.
                    </p>
                </div>
            </div>

            <div className="rounded-lg border border-cdborder/70 bg-cdbg/40 p-3 space-y-1">
                <CompareLine
                    label="Distance"
                    cur={thisYtd.distanceKm}
                    prev={prevYtd.distanceKm}
                    pct={percentChange(thisYtd.distanceKm, prevYtd.distanceKm)}
                    formatValue={fmt.dist}
                />
                <CompareLine
                    label="Elevation"
                    cur={thisYtd.elevationM}
                    prev={prevYtd.elevationM}
                    pct={percentChange(thisYtd.elevationM, prevYtd.elevationM)}
                    formatValue={fmt.elev}
                />
                <CompareLine
                    label="Moving time"
                    cur={thisYtd.movingTimeSec}
                    prev={prevYtd.movingTimeSec}
                    pct={percentChange(thisYtd.movingTimeSec, prevYtd.movingTimeSec)}
                    formatValue={fmt.time}
                />
                <CompareLine
                    label="TSS"
                    cur={thisYtd.load}
                    prev={prevYtd.load}
                    pct={percentChange(thisYtd.load, prevYtd.load)}
                    formatValue={(n) => fmt.int(n)}
                />
                <CompareLine
                    label="Activities"
                    cur={thisYtd.count}
                    prev={prevYtd.count}
                    pct={percentChange(thisYtd.count, prevYtd.count)}
                    formatValue={(n) => `${fmt.int(n)} rides`}
                />
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-cdmuted">
                <span className="flex items-center gap-1"><Bike size={12} className="text-orange-400" /> Rides</span>
                <span className="flex items-center gap-1"><TrendingUp size={12} className="text-blue-400" /> Distance</span>
                <span className="flex items-center gap-1"><Mountain size={12} className="text-green-400" /> Elevation</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-purple-400" /> Time</span>
                <span className="flex items-center gap-1"><Zap size={12} className="text-amber-400" /> TSS</span>
            </div>
        </div>
    );
};

export default YtdCompareCard;
