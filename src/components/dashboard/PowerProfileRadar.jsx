import React, { useMemo } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';

const RADAR_MAX_FTP_PCT = 160;

function rowByKey(rows, key) {
    return (rows || []).find((r) => r.key === key) || null;
}

/**
 * Best powers by duration: inner web = this period, outer ring = best over dashboard history.
 */
const PowerProfileRadar = ({ powerPeakRows, historyPeakRows, manualFtp, onOpenActivityInLog }) => {
    const data = useMemo(() => {
        const periodRows = powerPeakRows || [];
        const historyRows =
            historyPeakRows?.length > 0 ? historyPeakRows : periodRows;

        let rawMax = 0;
        for (const r of periodRows) {
            rawMax = Math.max(rawMax, Number(r.watts) || 0);
        }
        for (const r of historyRows) {
            rawMax = Math.max(rawMax, Number(r.watts) || 0);
        }
        const denom = manualFtp > 0 ? manualFtp : rawMax > 0 ? rawMax : 1;

        return periodRows.map((row) => {
            const h = rowByKey(historyRows, row.key) || row;
            const wP = Number(row.watts) || 0;
            const wH = Number(h.watts) || 0;
            const pctPeriod = denom > 0 ? Math.min((wP / denom) * 100, RADAR_MAX_FTP_PCT) : 0;
            const pctMax = denom > 0 ? Math.min((wH / denom) * 100, RADAR_MAX_FTP_PCT) : 0;
            return {
                subject: row.label,
                pctPeriod: Math.round(pctPeriod * 10) / 10,
                pctMax: Math.round(pctMax * 10) / 10,
                wattsPeriod: wP,
                wattsMax: wH,
                activityPeriod: row.activity,
                activityMax: h.activity,
                key: row.key,
            };
        });
    }, [powerPeakRows, historyPeakRows, manualFtp]);

    const showHistoryRing = useMemo(() => {
        if (!historyPeakRows?.length || !powerPeakRows?.length) return false;
        return data.some((d) => (d.wattsMax || 0) > (d.wattsPeriod || 0) + 0.5);
    }, [data, historyPeakRows, powerPeakRows]);

    const domainMax = useMemo(() => {
        const peak = Math.max(
            ...data.flatMap((d) => [d.pctPeriod, d.pctMax]),
            manualFtp > 0 ? 100 : 0,
        );
        return Math.min(RADAR_MAX_FTP_PCT, Math.max(40, Math.ceil(peak / 10) * 10 + 10));
    }, [data, manualFtp]);

    const noFtpScaleMaxW = useMemo(
        () => (data.length ? Math.max(0, ...data.map((x) => Math.max(x.wattsPeriod, x.wattsMax))) : 0),
        [data],
    );

    const hasData = data.some((d) => d.wattsPeriod > 0 || d.wattsMax > 0);
    if (!hasData) return null;

    const scaleHint = manualFtp > 0
        ? `Both shapes use % of your FTP (${manualFtp} W), capped at ${RADAR_MAX_FTP_PCT}% on the chart.`
        : `FTP not set — both shapes use % of the strongest value among these durations (max of period and history, ${noFtpScaleMaxW} W in this view), capped at ${RADAR_MAX_FTP_PCT}%.`;

    const radarTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        if (!d) return null;
        const linksP = d.activityPeriod ? activityExternalLinks(d.activityPeriod) : [];
        const linksH = d.activityMax ? activityExternalLinks(d.activityMax) : [];

        return (
            <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg max-w-[260px]">
                <div className="font-bold text-cdtext mb-2">{d.subject}</div>
                <div className="space-y-2">
                    <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-orange-200/90 font-bold">
                            This period
                        </div>
                        <div className="text-cdtext font-mono font-bold tabular-nums">{d.wattsPeriod} W</div>
                        {d.activityPeriod?.title && (
                            <div className="text-cdmuted mt-0.5 truncate" title={d.activityPeriod.title}>
                                {d.activityPeriod.title}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                            {d.activityPeriod && typeof onOpenActivityInLog === 'function' && d.activityPeriod.id != null && (
                                <button
                                    type="button"
                                    onClick={() => onOpenActivityInLog(d.activityPeriod.id)}
                                    className="text-[10px] font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                                >
                                    <ExternalLink size={10} /> Log
                                </button>
                            )}
                            {linksP.map((l) => (
                                <a
                                    key={l.label}
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-cdmuted hover:text-cdaccent"
                                >
                                    {l.label}
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-md border border-slate-500/35 bg-slate-500/10 px-2 py-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-slate-300 font-bold">
                            Best in history
                        </div>
                        <div className="text-cdtext font-mono font-bold tabular-nums">{d.wattsMax} W</div>
                        {d.activityMax?.title && (
                            <div className="text-cdmuted mt-0.5 truncate" title={d.activityMax.title}>
                                {d.activityMax.title}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                            {d.activityMax && typeof onOpenActivityInLog === 'function' && d.activityMax.id != null && (
                                <button
                                    type="button"
                                    onClick={() => onOpenActivityInLog(d.activityMax.id)}
                                    className="text-[10px] font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                                >
                                    <ExternalLink size={10} /> Log
                                </button>
                            )}
                            {linksH.map((l) => (
                                <a
                                    key={`h-${l.label}`}
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-cdmuted hover:text-cdaccent"
                                >
                                    {l.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl space-y-4">
            <div>
                <h3 className="text-lg font-bold text-cdtext mb-1">Power profile (this period)</h3>
                <p className="text-xs text-cdmuted leading-relaxed">{scaleHint}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-cdmuted">
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-orange-500 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
                    <span>
                        <span className="font-semibold text-cdtext">This period</span>
                        {' — '}best in the selected date range
                    </span>
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="h-0 w-6 shrink-0 border-t-2 border-dashed border-slate-400"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.95)' }}
                    />
                    <span>
                        <span className="font-semibold text-cdtext">Outer ring</span>
                        {' — '}best over all rides loaded in the app
                        {!showHistoryRing && ' (matches period when identical)'}
                    </span>
                </span>
            </div>

            <div className="h-[320px] w-full max-w-lg mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="52%" outerRadius="74%" data={data}>
                        <PolarGrid
                            stroke="#64748b"
                            strokeOpacity={0.4}
                            gridType="polygon"
                        />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, domainMax]}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Radar
                            name="Best in history"
                            dataKey="pctMax"
                            stroke="rgba(148, 163, 184, 0.95)"
                            fill="rgba(148, 163, 184, 0.07)"
                            fillOpacity={1}
                            strokeWidth={2.25}
                            strokeDasharray="6 5"
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Radar
                            name="This period"
                            dataKey="pctPeriod"
                            stroke="#ea580c"
                            fill="rgba(249, 115, 22, 0.42)"
                            fillOpacity={1}
                            strokeWidth={2}
                            dot={{
                                r: 4,
                                fill: '#ffedd5',
                                stroke: '#c2410c',
                                strokeWidth: 2,
                            }}
                            isAnimationActive={false}
                        />
                        <Tooltip content={radarTooltip} cursor={{ strokeDasharray: '4 4' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <ul className="text-[11px] text-cdmuted space-y-1.5 border-t border-cdborder/50 pt-3">
                {data.map((d) => (
                    <li key={d.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-cdtext w-12 shrink-0">{d.subject}</span>
                        <span className="font-mono text-orange-200/95 tabular-nums">
                            {d.wattsPeriod > 0 ? `${d.wattsPeriod} W` : '—'}
                        </span>
                        <span className="text-cdmuted">/</span>
                        <span className="font-mono text-slate-300 tabular-nums" title="Best in app history">
                            {d.wattsMax > 0 ? `${d.wattsMax} W` : '—'}
                        </span>
                        {d.activityPeriod && typeof onOpenActivityInLog === 'function' && d.activityPeriod.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(d.activityPeriod.id)}
                                className="text-cdaccent font-bold hover:underline inline-flex items-center gap-0.5"
                            >
                                <ExternalLink size={10} /> Log
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PowerProfileRadar;
