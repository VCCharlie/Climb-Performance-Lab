import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Polygon,
    Legend,
} from 'recharts';
import { Activity, ExternalLink } from 'lucide-react';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import { getChartTheme, chartHostClass } from '../../utils/chartTheme';
import { getCssVar } from '../../theme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import useElementSize from '../../hooks/useElementSize';
import useMediaQuery from '../../hooks/useMediaQuery';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';
import PowerCategoryBars from './PowerCategoryBars';
import {
    cdTypeBody,
    cdTypeCaption,
    cdTypeLabel,
    cdTypeMetricLg,
    cdTypeNumeric,
    cdTypeSection,
} from '../../utils/typography';
import { cn } from '../ui';

const RADAR_MAX_FTP_PCT = 160;
const RADAR_GRADIENT_ID = 'power-profile-period-fill';
const RADAR_GLOW_ID = 'power-profile-dot-glow';
const BARLOW = 'Barlow, sans-serif';

function periodAccentColor() {
    return getCssVar('--cd-primary', '#f08a38');
}

function historyAccentColor() {
    return getCssVar('--cd-green', '#16a34a');
}

function periodAccentMuted(alpha = 0.18) {
    const base = periodAccentColor();
    return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, transparent)`;
}

function historyAccentMuted(alpha = 0.14) {
    const base = historyAccentColor();
    return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, transparent)`;
}

function rowByKey(rows, key) {
    return (rows || []).find((r) => r.key === key) || null;
}

/** Filled web ignores pointer — only the dots receive hover/click. */
function PeriodRadarFillShape(props) {
    const { points, ...rest } = props;
    return <Polygon {...rest} points={points} pointerEvents="none" />;
}

function CustomAngleTick({ x, y, payload, data, displayKey, isCoarsePointer }) {
    const datum = data?.find((d) => d.subject === payload?.value);
    const active = datum?.key === displayKey;
    const watts = datum?.wattsPeriod > 0 ? `${datum.wattsPeriod} W` : null;
    const isTop = datum?.key === 'peak_15s';
    const labelY = isTop ? -12 : 0;
    const wattsY = isTop ? 4 : 14;
    const pillW = watts ? Math.max(44, watts.length * (isCoarsePointer ? 6.2 : 6.8) + 12) : 0;

    return (
        <g transform={`translate(${x},${y + (isTop ? -8 : 0)})`}>
            <text
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={active ? 'var(--cd-text)' : 'var(--cd-muted, #64748b)'}
                fontSize={isCoarsePointer ? 11 : 12}
                fontWeight={700}
                fontFamily={BARLOW}
            >
                {payload?.value}
            </text>
            {watts ? (
                <g transform={`translate(0, ${wattsY})`}>
                    <rect
                        x={-pillW / 2}
                        y={-9}
                        width={pillW}
                        height={16}
                        rx={4}
                        fill="var(--cd-surface-bright, var(--cd-surface))"
                        fillOpacity={0.94}
                        stroke="var(--cd-border, #dce1e8)"
                        strokeOpacity={0.55}
                        strokeWidth={0.75}
                    />
                    <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={active ? periodAccentColor() : 'var(--cd-muted, #64748b)'}
                        fillOpacity={active ? 0.82 : 0.92}
                        fontSize={isCoarsePointer ? 9 : 10}
                        fontWeight={600}
                        fontFamily={BARLOW}
                    >
                        {watts}
                    </text>
                </g>
            ) : null}
        </g>
    );
}

function PowerRadarDetailPanel({ d, pinned, onDismissPin, onOpenActivityInLog }) {
    const linksP = d.activityPeriod ? activityExternalLinks(d.activityPeriod) : [];
    const linksH = d.activityMax ? activityExternalLinks(d.activityMax) : [];

    return (
        <div className="rounded-xl border border-cdborder/70 bg-cdsurfacelow/80 px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className={cn(cdTypeSection, 'leading-tight')}>{d.subject}</div>
                {pinned && (
                    <button
                        type="button"
                        onClick={onDismissPin}
                        className={cn(
                            'shrink-0 uppercase tracking-wide text-cdmuted hover:text-cdtext cd-min-touch-y cd-focus-ring',
                            cdTypeCaption,
                            'font-bold',
                        )}
                    >
                        Dismiss
                    </button>
                )}
            </div>
            {pinned && (
                <p className={cn(cdTypeCaption, 'mb-2 border-b border-cdborder/40 pb-2')}>
                    Pinned — tap outside the chart or this panel to close.
                </p>
            )}
            <div className="space-y-2.5">
                <div className="rounded-lg border border-cdprimary/20 bg-cdprimary/10 px-3 py-2">
                    <div className={cn(cdTypeLabel, 'text-cdprimary/90')}>
                        This period
                    </div>
                    <div className={cdTypeMetricLg}>{d.wattsPeriod} W</div>
                    {d.activityPeriod?.title && (
                        <div className={cn(cdTypeCaption, 'mt-0.5 break-words line-clamp-2')} title={d.activityPeriod.title}>
                            {d.activityPeriod.title}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                        {d.activityPeriod && typeof onOpenActivityInLog === 'function' && d.activityPeriod.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(d.activityPeriod.id)}
                                className={cn(
                                    'font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5 cd-min-touch-y cd-focus-ring',
                                    cdTypeCaption,
                                )}
                            >
                                <ExternalLink size={11} aria-hidden /> Log
                            </button>
                        )}
                        {linksP.map((l) => (
                            <a
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn('font-bold text-cdmuted hover:text-cdaccent', cdTypeCaption)}
                            >
                                {l.label}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="rounded-lg border border-cdgreen/25 bg-cdgreen/10 px-3 py-2">
                    <div className={cn(cdTypeLabel, 'text-cdgreen/90')}>
                        Best in history
                    </div>
                    <div className={cdTypeMetricLg}>{d.wattsMax} W</div>
                    {d.activityMax?.title && (
                        <div className={cn(cdTypeCaption, 'mt-0.5 break-words line-clamp-2')} title={d.activityMax.title}>
                            {d.activityMax.title}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                        {d.activityMax && typeof onOpenActivityInLog === 'function' && d.activityMax.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(d.activityMax.id)}
                                className={cn(
                                    'font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5 cd-min-touch-y cd-focus-ring',
                                    cdTypeCaption,
                                )}
                            >
                                <ExternalLink size={11} aria-hidden /> Log
                            </button>
                        )}
                        {linksH.map((l) => (
                            <a
                                key={`h-${l.label}`}
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn('font-bold text-cdmuted hover:text-cdaccent', cdTypeCaption)}
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
                'w-full flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2.5 text-left cd-transition cd-min-touch-y cd-focus-ring',
                active
                    ? 'bg-cdprimarycontainer/50 ring-1 ring-cdprimary/30'
                    : 'hover:bg-cdborder/25',
            )}
        >
            <span className={cn('font-bold text-cdtext w-12 shrink-0', cdTypeBody, 'text-xs sm:text-sm')}>{d.subject}</span>
            <span className={cn('font-bold text-cdprimary/90', cdTypeNumeric, cdTypeBody, 'text-xs sm:text-sm')}>
                {d.wattsPeriod > 0 ? `${d.wattsPeriod} W` : '—'}
            </span>
            <span className={cn('text-cdmuted', cdTypeCaption)}>/</span>
            <span
                className={cn('font-bold text-cdgreen/85', cdTypeNumeric, cdTypeBody, 'text-xs sm:text-sm')}
                title="Best in app history"
            >
                {d.wattsMax > 0 ? `${d.wattsMax} W` : '—'}
            </span>
            {d.activityPeriod && typeof onOpenActivityInLog === 'function' && d.activityPeriod.id != null && (
                <span
                    role="presentation"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenActivityInLog(d.activityPeriod.id);
                    }}
                    className={cn(
                        'ml-auto text-cdaccent font-bold hover:underline inline-flex items-center gap-0.5',
                        cdTypeCaption,
                    )}
                >
                    <ExternalLink size={11} aria-hidden /> Log
                </span>
            )}
        </button>
    );
}

/**
 * Best powers by duration: filled web = this period, dashed ring = best over dashboard history.
 */
const PowerProfileRadar = ({ powerPeakRows, historyPeakRows, manualFtp, weightKg = 0, onOpenActivityInLog }) => {
    const chartWrapRef = useRef(null);
    const sidePanelRef = useRef(null);
    const [chartRef, chartSize] = useElementSize();
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');
    const isNarrow = useMediaQuery('(max-width: 640px)');
    const isWide = useMediaQuery('(min-width: 1280px)');
    const theme = getChartTheme();

    const [hoverKey, setHoverKey] = useState(null);
    const [pinnedKey, setPinnedKey] = useState(null);

    const outerStroke = historyAccentColor();
    const outerFill = historyAccentMuted(0.14);
    const periodStroke = periodAccentColor();
    const periodFillStrong = periodAccentMuted(0.22);
    const periodFillSoft = periodAccentMuted(0.08);

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
        const host = chartWrapRef.current;
        if (!host) return undefined;

        const releaseChartFocus = () => {
            const active = document.activeElement;
            if (!(active instanceof Element)) return;
            if (!host.contains(active)) return;
            if (!active.closest('.recharts-surface, .recharts-wrapper')) return;
            active.blur();
        };

        host.addEventListener('pointerup', releaseChartFocus, true);
        return () => host.removeEventListener('pointerup', releaseChartFocus, true);
    }, []);

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
            const is15s = k === 'peak_15s';
            const baseR = is15s ? (isCoarsePointer ? 9 : 7) : (isCoarsePointer ? 11 : 9);
            const r = hi ? baseR + (isCoarsePointer ? 2 : 2) : baseR;
            return (
                <g>
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r + 4}
                        fill="transparent"
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
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={hi ? periodFillStrong : periodFillSoft}
                        stroke={periodStroke}
                        strokeOpacity={hi ? 0.78 : 0.55}
                        strokeWidth={hi ? 2 : 1.5}
                        filter={hi && !is15s ? `url(#${RADAR_GLOW_ID})` : undefined}
                        pointerEvents="none"
                    />
                </g>
            );
        },
        [displayKey, handleDotActivate, isCoarsePointer, periodFillSoft, periodFillStrong, periodStroke, pinnedKey],
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
        return Math.min(RADAR_MAX_FTP_PCT, Math.max(50, Math.ceil(peak / 10) * 10 + 10));
    }, [data, manualFtp]);

    const noFtpScaleMaxW = useMemo(
        () => (data.length ? data.reduce((max, x) => Math.max(max, x.wattsPeriod, x.wattsMax), 0) : 0),
        [data],
    );

    const chartHeight = isNarrow ? 380 : isCoarsePointer ? 440 : isWide ? 500 : 460;
    const chartOuterRadius = chartSize.width > 0 && chartSize.width < 360 ? '70%' : '76%';
    const chartReady = chartSize.width > 0 && chartSize.height > 0;

    const angleTickRenderer = useCallback(
        (props) => (
            <CustomAngleTick
                {...props}
                data={data}
                displayKey={displayKey}
                isCoarsePointer={isCoarsePointer}
            />
        ),
        [data, displayKey, isCoarsePointer],
    );

    const hasData = data.some((d) => d.wattsPeriod > 0 || d.wattsMax > 0);
    if (!hasData) return null;

    const scaleHint = manualFtp > 0
        ? `Both shapes use % of your FTP (${manualFtp} W), capped at ${RADAR_MAX_FTP_PCT}% on the chart. Axis labels show period watts.`
        : `FTP not set — both shapes use % of the strongest value among these durations (max ${noFtpScaleMaxW} W). Axis labels show period watts.`;

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
            <div className={cn('flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-x-8 sm:gap-y-2 mb-5 px-1', cdTypeBody, 'text-cdmuted')}>
                <span className="inline-flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-cdprimary/55 ring-1 ring-cdprimary/20" />
                    <span>
                        <span className="font-bold text-cdtext">This period</span>
                        <span className="hidden sm:inline"> — filled area</span>
                    </span>
                </span>
                <span className="inline-flex items-center gap-2.5">
                    <span className="h-0 w-8 shrink-0 border-t-2 border-dashed border-cdgreen/45" />
                    <span>
                        <span className="font-bold text-cdtext">All-time best</span>
                        <span className="hidden sm:inline"> — dashed ring{!showHistoryRing && ' (same as period)'}</span>
                    </span>
                </span>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,320px)] gap-6 items-start">
                <div className="min-w-0 order-2 2xl:order-1">
                    <PowerCategoryBars
                        powerPeakRows={powerPeakRows}
                        historyPeakRows={historyPeakRows}
                        manualFtp={manualFtp}
                        weightKg={weightKg}
                    />
                </div>

                <div
                    ref={(node) => {
                        chartWrapRef.current = node;
                        chartRef(node);
                    }}
                    className={cn(
                        'w-full min-w-0 order-1 2xl:order-2 rounded-2xl border border-cdborder/40 bg-cdsurfacelow/30 p-2 sm:p-4',
                        chartHostClass,
                        'outline-none focus:outline-none focus-visible:outline-none',
                    )}
                    tabIndex={-1}
                    style={{ height: chartHeight, minHeight: chartHeight }}
                >
                    {chartReady ? (
                        <RadarChart
                            width={chartSize.width}
                            height={chartHeight}
                            cx="50%"
                            cy="50%"
                            outerRadius={chartOuterRadius}
                            data={data}
                            margin={{ top: 48, right: 40, bottom: 32, left: 40 }}
                            {...CHART_A11Y_PROPS}
                        >
                            <defs>
                                <radialGradient id={RADAR_GRADIENT_ID} cx="50%" cy="50%" r="55%">
                                    <stop offset="10%" stopColor={periodStroke} stopOpacity={0.24} />
                                    <stop offset="70%" stopColor={periodStroke} stopOpacity={0.1} />
                                    <stop offset="100%" stopColor={periodStroke} stopOpacity={0.03} />
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
                                strokeOpacity={0.35}
                                gridType="polygon"
                                radialLines
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={angleTickRenderer}
                                tickLine={false}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, domainMax]}
                                tick={{
                                    fill: 'var(--cd-muted, #64748b)',
                                    fontSize: isCoarsePointer ? 10 : 11,
                                    fontWeight: 600,
                                    fontFamily: BARLOW,
                                }}
                                tickFormatter={(v) => `${v}%`}
                                axisLine={false}
                            />
                            <Radar
                                name="Best in history"
                                dataKey="pctMax"
                                stroke={outerStroke}
                                fill={outerFill}
                                fillOpacity={1}
                                strokeWidth={1.5}
                                strokeOpacity={0.5}
                                strokeDasharray="6 4"
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
                                strokeWidth={1.75}
                                strokeOpacity={0.65}
                                shape={PeriodRadarFillShape}
                                dot={renderPeriodDot}
                                activeDot={false}
                                isAnimationActive
                                animationDuration={500}
                            />
                            {!isNarrow && (
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{
                                        fontFamily: BARLOW,
                                        fontSize: 12,
                                        paddingTop: 8,
                                    }}
                                    formatter={(value) => (
                                        <span style={{ color: 'var(--cd-text)' }}>{value}</span>
                                    )}
                                />
                            )}
                        </RadarChart>
                    ) : (
                        <div
                            className="w-full h-full rounded-xl bg-cdborder/20 animate-pulse"
                            aria-hidden
                        />
                    )}
                </div>

                <div ref={sidePanelRef} className="flex flex-col gap-3 min-w-0 order-3">
                    {displayDatum ? (
                        <PowerRadarDetailPanel
                            d={displayDatum}
                            pinned={Boolean(pinnedKey)}
                            onDismissPin={() => setPinnedKey(null)}
                            onOpenActivityInLog={onOpenActivityInLog}
                        />
                    ) : (
                        <p className={cn(cdTypeBody, 'text-cdmuted leading-relaxed px-1')}>{interactionHint}</p>
                    )}

                    <div className="rounded-xl border border-cdborder/50 bg-cdsurfacelow/40 divide-y divide-cdborder/30 overflow-hidden">
                        <div className="px-3 py-2.5 bg-cdborder/15">
                            <p className={cdTypeLabel}>Duration peaks</p>
                        </div>
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
