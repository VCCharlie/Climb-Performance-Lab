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

/**
 * Best powers by duration as a radar (% FTP or % of max in period). Links to source rides.
 */
const PowerProfileRadar = ({ powerPeakRows, manualFtp, onOpenActivityInLog }) => {
    const data = useMemo(() => {
        const rows = powerPeakRows || [];
        const maxW = rows.reduce((m, r) => Math.max(m, Number(r.watts) || 0), 0);
        const denom = manualFtp > 0 ? manualFtp : maxW > 0 ? maxW : 1;
        return rows.map((row) => {
            const w = Number(row.watts) || 0;
            const pct = denom > 0 ? Math.min((w / denom) * 100, RADAR_MAX_FTP_PCT) : 0;
            return {
                subject: row.label,
                pct: Math.round(pct * 10) / 10,
                watts: w,
                activity: row.activity,
                key: row.key,
            };
        });
    }, [powerPeakRows, manualFtp]);

    const domainMax = useMemo(() => {
        const m = Math.max(...data.map((d) => d.pct), manualFtp > 0 ? 100 : 0);
        return Math.min(RADAR_MAX_FTP_PCT, Math.max(40, Math.ceil(m / 10) * 10 + 10));
    }, [data, manualFtp]);

    const hasData = data.some((d) => d.watts > 0);
    if (!hasData) return null;

    const scaleHint = manualFtp > 0
        ? `Axes scaled as % of your FTP (${manualFtp} W), capped at ${RADAR_MAX_FTP_PCT}% for display.`
        : 'FTP not set — axes scaled as % of the strongest value in this period.';

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl space-y-4">
            <div>
                <h3 className="text-lg font-bold text-cdtext mb-1">Power profile (this period)</h3>
                <p className="text-xs text-cdmuted leading-relaxed">{scaleHint}</p>
            </div>

            <div className="h-[300px] w-full max-w-lg mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="52%" outerRadius="72%" data={data}>
                        <PolarGrid stroke="#64748b" strokeOpacity={0.35} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, domainMax]}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Radar
                            name="Best in period"
                            dataKey="pct"
                            stroke="#3b82f6"
                            fill="rgba(59, 130, 246, 0.35)"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.[0]) return null;
                                const d = payload[0].payload;
                                const links = d.activity ? activityExternalLinks(d.activity) : [];
                                return (
                                    <div className="rounded-lg border border-cdborder bg-cdsurface px-3 py-2 text-xs shadow-lg max-w-[240px]">
                                        <div className="font-bold text-cdtext mb-1">{d.subject}</div>
                                        <div className="text-cdmuted tabular-nums">{d.watts} W</div>
                                        {d.activity?.title && (
                                            <div className="text-cdmuted mt-1 truncate" title={d.activity.title}>
                                                {d.activity.title}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {d.activity && typeof onOpenActivityInLog === 'function' && d.activity.id != null && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenActivityInLog(d.activity.id)}
                                                    className="text-[10px] font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                                                >
                                                    <ExternalLink size={10} /> Log
                                                </button>
                                            )}
                                            {links.map((l) => (
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
                                );
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <ul className="text-[11px] text-cdmuted space-y-1 border-t border-cdborder/50 pt-3">
                {data.map((d) => (
                    <li key={d.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-cdtext w-12 shrink-0">{d.subject}</span>
                        <span className="font-mono text-cdtext">{d.watts > 0 ? `${d.watts} W` : '—'}</span>
                        {d.activity && typeof onOpenActivityInLog === 'function' && d.activity.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(d.activity.id)}
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
