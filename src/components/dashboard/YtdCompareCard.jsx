import React, { useMemo } from 'react';
import { TrendingUp, Bike, Mountain, Clock, Zap } from 'lucide-react';
import { computeCplYtdYearOverYear, computeYtdGravelVsRoad, percentChange } from '../../utils/ytdYearOverYear';
import { chartCardClass } from '../../utils/chartTheme';

const LOCALE = 'en-GB';

const fmt = {
    int: (n) => Math.round(Number(n) || 0).toLocaleString(LOCALE),
    dist: (km) => `${(Number(km) || 0).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`,
    elev: (m) => `${Math.round(Number(m) || 0).toLocaleString(LOCALE)} m`,
    watts: (w) => {
        const n = Math.round(Number(w) || 0);
        return n > 0 ? `${n} W` : '—';
    },
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
const YtdCompareCard = ({ activities, manualFtp = 0, bare = false }) => {
    const ytdYoy = useMemo(
        () => computeCplYtdYearOverYear(activities, new Date(), manualFtp),
        [activities, manualFtp],
    );

    const ytdSurface = useMemo(
        () => computeYtdGravelVsRoad(activities, new Date()),
        [activities],
    );

    if (!ytdYoy?.thisYtd) return null;

    const { thisYtd, prevYtd } = ytdYoy;
    const refDate = new Date(ytdYoy.referenceDate);
    const subtitle = refDate.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });

    const hasAny = thisYtd.count > 0 || prevYtd.count > 0;
    if (!hasAny) return null;

    const body = (
        <>
            <div className={`flex items-start gap-2 ${bare ? 'mb-3' : 'mb-3'}`}>
                {!bare ? (
                    <>
                        <TrendingUp className="w-5 h-5 text-cdaccent shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Year to date vs last year</h3>
                            <p className="text-[11px] text-cdmuted">
                                Same calendar window through {subtitle} — from your activity log.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-[11px] text-cdmuted">
                        Same calendar window through {subtitle} — from your activity log.
                    </p>
                )}
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

            {(thisYtd.peakEftp20 > 0 || prevYtd.peakEftp20 > 0
                || thisYtd.peakBest60min > 0 || prevYtd.peakBest60min > 0) && (
                <div className="mt-4 rounded-lg border border-cdborder/70 bg-cdbg/30 p-3 space-y-1">
                    <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-2">
                        YTD power peaks
                    </h4>
                    <p className="text-[10px] text-cdmuted mb-2">
                        Best efforts in the same calendar window (eFTP = 20 min × 0.95).
                    </p>
                    <CompareLine
                        label="Peak eFTP (20m)"
                        cur={thisYtd.peakEftp20}
                        prev={prevYtd.peakEftp20}
                        pct={percentChange(thisYtd.peakEftp20, prevYtd.peakEftp20)}
                        formatValue={fmt.watts}
                    />
                    <CompareLine
                        label="Peak 20 min"
                        cur={thisYtd.peakBest20min}
                        prev={prevYtd.peakBest20min}
                        pct={percentChange(thisYtd.peakBest20min, prevYtd.peakBest20min)}
                        formatValue={fmt.watts}
                    />
                    <CompareLine
                        label="Peak 60 min"
                        cur={thisYtd.peakBest60min}
                        prev={prevYtd.peakBest60min}
                        pct={percentChange(thisYtd.peakBest60min, prevYtd.peakBest60min)}
                        formatValue={fmt.watts}
                    />
                </div>
            )}

            {ytdSurface && (ytdSurface.thisYtd.road.count > 0 || ytdSurface.thisYtd.gravel.count > 0
                || ytdSurface.prevYtd.road.count > 0 || ytdSurface.prevYtd.gravel.count > 0) && (
                <div className="mt-4 rounded-lg border border-cdborder/70 bg-cdbg/30 p-3 space-y-2">
                    <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">
                        YTD volume — road vs gravel
                    </h4>
                    <p className="text-[10px] text-cdmuted">
                        Road = Ride + VirtualRide · Gravel = GravelRide (same calendar window as above).
                    </p>
                    <CompareLine
                        label="Road distance"
                        cur={ytdSurface.thisYtd.road.distanceKm}
                        prev={ytdSurface.prevYtd.road.distanceKm}
                        pct={percentChange(ytdSurface.thisYtd.road.distanceKm, ytdSurface.prevYtd.road.distanceKm)}
                        formatValue={fmt.dist}
                    />
                    <CompareLine
                        label="Road moving time"
                        cur={ytdSurface.thisYtd.road.movingTimeSec}
                        prev={ytdSurface.prevYtd.road.movingTimeSec}
                        pct={percentChange(ytdSurface.thisYtd.road.movingTimeSec, ytdSurface.prevYtd.road.movingTimeSec)}
                        formatValue={fmt.time}
                    />
                    <CompareLine
                        label="Gravel distance"
                        cur={ytdSurface.thisYtd.gravel.distanceKm}
                        prev={ytdSurface.prevYtd.gravel.distanceKm}
                        pct={percentChange(ytdSurface.thisYtd.gravel.distanceKm, ytdSurface.prevYtd.gravel.distanceKm)}
                        formatValue={fmt.dist}
                    />
                    <CompareLine
                        label="Gravel moving time"
                        cur={ytdSurface.thisYtd.gravel.movingTimeSec}
                        prev={ytdSurface.prevYtd.gravel.movingTimeSec}
                        pct={percentChange(ytdSurface.thisYtd.gravel.movingTimeSec, ytdSurface.prevYtd.gravel.movingTimeSec)}
                        formatValue={fmt.time}
                    />
                </div>
            )}

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-cdmuted">
                <span className="flex items-center gap-1"><Bike size={12} className="text-orange-400" /> Rides</span>
                <span className="flex items-center gap-1"><TrendingUp size={12} className="text-blue-400" /> Distance</span>
                <span className="flex items-center gap-1"><Mountain size={12} className="text-green-400" /> Elevation</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-purple-400" /> Time</span>
                <span className="flex items-center gap-1"><Zap size={12} className="text-amber-400" /> TSS</span>
            </div>
        </>
    );

    if (bare) return body;

    return <div className={chartCardClass}>{body}</div>;
};

export default YtdCompareCard;
