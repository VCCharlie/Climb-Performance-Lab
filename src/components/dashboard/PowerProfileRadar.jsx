import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Polygon,
} from 'recharts';
import { Activity, ExternalLink } from 'lucide-react';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import { getChartTheme } from '../../utils/chartTheme';
import useElementSize from '../../hooks/useElementSize';
import useMediaQuery from '../../hooks/useMediaQuery';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';
import { cn } from '../ui';

const RADAR_MAX_FTP_PCT = 160;
const RADAR_GRADIENT_ID = 'power-profile-period-fill';
const RADAR_GLOW_ID = 'power-profile-dot-glow';

function rowByKey(rows, key) {
    return (rows || []).find((r) => r.key === key) || null;
}

/** Filled web ignores pointer — only the dots receive hover/click. */
function PeriodRadarFillShape(props) {
    const { points, ...rest } = props;
    return <Polygon {...rest} points={points} pointerEvents="none" />;
}

function PowerRadarDetailPanel({ d, pinned, onDismissPin, onOpenActivityInLog }) {
    const linksP = d.activityPeriod ? activityExternalLinks(d.activityPeriod) : [];
    const linksH = d.activityMax ? activityExternalLinks(d.activityMax) : [];

    return (
        <div className="rounded-lg border border-cdborder/70 bg-cdsurfacelow/80 px-3 py-2 text-xs shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-cdtext leading-tight">{d.subject}</div>
                {pinned && (
                    <button
                        type="button"
                        onClick={onDismissPin}
                        className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-cdmuted hover:text-cdtext"
                    >
                        Dismiss
                    </button>
                )}
            </div>
            {pinned && (
                <p className="text-[10px] text-cdmuted mb-2 border-b border-cdborder/40 pb-2">
                    Pinned — tap outside the chart or this panel to close.
                </p>
            )}
            <div className="space-y-2">
                <div className="rounded-md border border-orange-500/25 bg-orange-500/10 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-orange-600 dark:text-orange-200/90 font-bold">
                        This period
                    </div>
                    <div className="text-cdtext font-mono font-bold tabular-nums">{d.wattsPeriod} W</div>
                    {d.activityPeriod?.title && (
                        <div className="text-cdmuted mt-0.5 break-words line-clamp-2" title={d.activityPeriod.title}>
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
                                <ExternalLink size={10} aria-hidden /> Log
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
                <div className="rounded-md border border-emerald-700/30 bg-emerald-500/10 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-200/95 font-bold">
                        Best in history
                    </div>
                    <div className="text-cdtext font-mono font-bold tabular-nums">{d.wattsMax} W</div>
                    {d.activityMax?.title && (
                        <div className="text-cdmuted mt-0.5 break-words line-clamp-2" title={d.activityMax.title}>
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
                                <ExternalLink size={10} aria-hidden /> Log
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
}

function DurationValueRow({
    d,
    active,
    onActivate,
    onOpenActivityInLog,
}) {
    return (
        <button
            type="button"
            onClick={() => onActivate(d.key)}
            onMouseEnter={() => onActivate(d.key, { hoverOnly: true })}
            onMouseLeave={() => onActivate(null, { hoverOnly: true })}
            className={cn(
                'w-full flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-left cd-transition',
                active
                    ? 'bg-cdprimarycontainer/50 ring-1 ring-cdprimary/30'
                    : 'hover:bg-cdborder/25',
            )}
        >
            <span className="font-semibold text-cdtext w-10 shrink-0 text-[11px]">{d.subject}</span>
            <span className="font-mono text-orange-600 dark:text-orange-300 tabular-nums text-[11px] font-bold">
                {d.wattsPeriod > 0 ? `${d.wattsPeriod} W` : '—'}
            </span>
            <span className="text-cdmuted text-[10px]">/</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums text-[11px]" title="Best in app history">
                {d.wattsMax > 0 ? `${d.wattsMax} W` : '—'}
            </span>
            {d.activityPeriod && typeof onOpenActivityInLog === 'function' && d.activityPeriod.id != null && (
                <span
                    role="presentation"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenActivityInLog(d.activityPeriod.id);
                    }}
                    className="ml-auto text-cdaccent font-bold text-[10px] hover:underline inline-flex items-center gap-0.5"
                >
                    <ExternalLink size={10} aria-hidden /> Log
                </span>
            )}
        </button>
    );
}

/**
 * Best powers by duration: inner web = this period, outer ring = best over dashboard history.
 */
const PowerProfileRadar = ({ powerPeakRows, historyPeakRows, manualFtp, onOpenActivityInLog }) => {
    const chartWrapRef = useRef(null);
    const sidePanelRef = useRef(null);
    const [chartRef, chartSize] = useElementSize();
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');
    const theme = getChartTheme();

    const [hoverKey, setHoverKey] = useState(null);
    const [pinnedKey, setPinnedKey] = useState(null);

    const outerStroke = theme.green;
    const outerFill = 'rgba(22, 101, 52, 0.14)';
    const periodStroke = theme.primary;

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

    const displayKey = pinnedKey || hoverKey;
    const displayDatum = useMemo(
        () => (displayKey ? data.find((row) => row.key === displayKey) : null),
        [data, displayKey],
    );

    useEffect(() => {
        if (!pinnedKey) return undefined;
        const onDocPointerDown = (e) => {
            const t = e.target;
            if (chartWrapRef.current?.contains(t)) return;
            if (sidePanelRef.current?.contains(t)) return;
            setPinnedKey(null);
        };
        document.addEventListener('mousedown', onDocPointerDown);
        document.addEventListener('touchstart', onDocPointerDown, { passive: true });
        return () => {
            document.removeEventListener('mousedown', onDocPointerDown);
            document.removeEventListener('touchstart', onDocPointerDown);
        };
    }, [pinnedKey]);

    useEffect(() => {
        if (!pinnedKey) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setPinnedKey(null);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [pinnedKey]);

    const handleDotActivate = useCallback((key) => {
        setPinnedKey(key);
        setHoverKey(key);
    }, []);

    const handleRowActivate = useCallback((key, opts = {}) => {
        if (opts.hoverOnly) {
            if (!pinnedKey) setHoverKey(key);
            return;
        }
        if (key) handleDotActivate(key);
    }, [handleDotActivate, pinnedKey]);

    const renderPeriodDot = useCallback(
        (dotProps) => {
            const { cx, cy, payload } = dotProps;
            if (cx == null || cy == null || !payload?.key) return null;
            const k = payload.key;
            const hi = displayKey === k;
            return (
                <circle
                    cx={cx}
                    cy={cy}
                    r={hi ? 11 : 8}
                    fill={hi ? 'rgba(249, 115, 22, 0.45)' : 'rgba(249, 115, 22, 0.2)'}
                    stroke={periodStroke}
                    strokeWidth={hi ? 2.5 : 1.5}
                    filter={hi ? `url(#${RADAR_GLOW_ID})` : undefined}
                    style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                    onMouseEnter={() => setHoverKey(k)}
                    onMouseLeave={() => { if (!pinnedKey) setHoverKey(null); }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDotActivate(k);
                    }}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDotActivate(k);
                    }}
                />
            );
        },
        [displayKey, handleDotActivate, periodStroke, pinnedKey],
    );

    const showHistoryRing = useMemo(() => {
        if (!historyPeakRows?.length || !powerPeakRows?.length) return false;
        return data.some((d) => (d.wattsMax || 0) > (d.wattsPeriod || 0) + 0.5);
    }, [data, historyPeakRows, powerPeakRows]);

    const domainMax = useMemo(() => {
        const peak = data.reduce(
            (acc, d) => Math.max(acc, d.pctPeriod, d.pctMax),
            manualFtp > 0 ? 100 : 0,
        );
        return Math.min(RADAR_MAX_FTP_PCT, Math.max(40, Math.ceil(peak / 10) * 10 + 10));
    }, [data, manualFtp]);

    const noFtpScaleMaxW = useMemo(
        () => (data.length ? data.reduce((max, x) => Math.max(max, x.wattsPeriod, x.wattsMax), 0) : 0),
        [data],
    );

    const chartHeight = isCoarsePointer ? 260 : 300;
    const chartOuterRadius = chartSize.width > 0 && chartSize.width < 320 ? '70%' : '78%';
    const chartReady = chartSize.width > 0 && chartSize.height > 0;

    const hasData = data.some((d) => d.wattsPeriod > 0 || d.wattsMax > 0);
    if (!hasData) return null;

    const scaleHint = manualFtp > 0
        ? `Both shapes use % of your FTP (${manualFtp} W), capped at ${RADAR_MAX_FTP_PCT}% on the chart.`
        : `FTP not set — both shapes use % of the strongest value among these durations (max ${noFtpScaleMaxW} W in this view).`;

    const interactionHint = isCoarsePointer
        ? 'Tap a duration row or chart point for details.'
        : 'Hover a row or chart point; click to pin details.';

    return (
        <CollapsibleDashboardCard
            title="Power profile (this period)"
            icon={Activity}
            description={scaleHint}
            defaultExpanded
        >
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-cdmuted mb-3">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cdprimary shadow-sm" />
                    <span><span className="font-semibold text-cdtext">This period</span> — selected date range</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-5 shrink-0 border-t-2 border-dashed border-emerald-600" />
                    <span><span className="font-semibold text-cdtext">Outer ring</span> — best in app history{!showHistoryRing && ' (same as period)'}</span>
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] gap-4 items-start">
                <div
                    ref={(node) => {
                        chartWrapRef.current = node;
                        chartRef(node);
                    }}
                    className="w-full min-w-0 mx-auto lg:mx-0 max-w-sm lg:max-w-none"
                    style={{ height: chartHeight }}
                >
                    {chartReady ? (
                        <RadarChart
                            width={chartSize.width}
                            height={chartHeight}
                            cx="50%"
                            cy="50%"
                            outerRadius={chartOuterRadius}
                            data={data}
                        >
                            <defs>
                                <radialGradient id={RADAR_GRADIENT_ID} cx="50%" cy="50%" r="50%">
                                    <stop offset="15%" stopColor={periodStroke} stopOpacity={0.5} />
                                    <stop offset="85%" stopColor={periodStroke} stopOpacity={0.08} />
                                </radialGradient>
                                <filter id={RADAR_GLOW_ID} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <PolarGrid
                                stroke={theme.grid}
                                strokeOpacity={0.55}
                                gridType="polygon"
                                radialLines={false}
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{
                                    fill: theme.axis,
                                    fontSize: isCoarsePointer ? 10 : 11,
                                    fontWeight: 600,
                                }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, domainMax]}
                                tick={{ fill: theme.axis, fontSize: 9 }}
                                tickFormatter={(v) => `${v}%`}
                                axisLine={false}
                            />
                            <Radar
                                name="Best in history"
                                dataKey="pctMax"
                                stroke={outerStroke}
                                fill={outerFill}
                                fillOpacity={1}
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                isAnimationActive
                                animationDuration={450}
                                pointerEvents="none"
                            />
                            <Radar
                                name="This period"
                                dataKey="pctPeriod"
                                stroke={periodStroke}
                                fill={`url(#${RADAR_GRADIENT_ID})`}
                                fillOpacity={1}
                                strokeWidth={2}
                                shape={PeriodRadarFillShape}
                                dot={renderPeriodDot}
                                activeDot={false}
                                isAnimationActive
                                animationDuration={500}
                            />
                        </RadarChart>
                    ) : (
                        <div
                            className="w-full h-full rounded-lg bg-cdborder/20 animate-pulse"
                            aria-hidden
                        />
                    )}
                </div>

                <div ref={sidePanelRef} className="flex flex-col gap-3 min-w-0">
                    {displayDatum ? (
                        <PowerRadarDetailPanel
                            d={displayDatum}
                            pinned={Boolean(pinnedKey)}
                            onDismissPin={() => setPinnedKey(null)}
                            onOpenActivityInLog={onOpenActivityInLog}
                        />
                    ) : (
                        <p className="text-[11px] text-cdmuted leading-relaxed px-1">{interactionHint}</p>
                    )}

                    <div className="rounded-lg border border-cdborder/50 bg-cdsurfacelow/40 divide-y divide-cdborder/30 overflow-hidden">
                        {data.map((d) => (
                            <DurationValueRow
                                key={d.key}
                                d={d}
                                active={displayKey === d.key}
                                onActivate={handleRowActivate}
                                onOpenActivityInLog={onOpenActivityInLog}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </CollapsibleDashboardCard>
    );
};

export default PowerProfileRadar;
