import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceDot,
    ComposedChart,
    Bar,
    Cell,
} from 'recharts';
import { formatDateDDMMYYYY } from '../../utils';
import { ChartTooltip } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import useMediaQuery from '../../hooks/useMediaQuery';
import useChartTouchScrubber from '../../hooks/useChartTouchScrubber';
import { computeFitnessChartYDomain } from '../../utils/chartTouchScrubber';
import { cn } from '../ui';

/**
 * Fixed mobile inspection card — stays above the chart so values are never hidden under the thumb.
 */
function FormFitnessMobileDataCard({ datum, isScrubbing }) {
    if (!datum) return null;

    const tsb = Number(datum.tsb);
    const tsbColor = tsb >= 5
        ? 'text-green-400'
        : tsb >= -10
            ? 'text-cdprimary'
            : 'text-red-400';

    return (
        <div
            className={cn(
                'rounded-cdlg border border-cdborder/70 bg-cdsurfacelow/90 px-3 py-2.5 mb-3 cd-transition',
                isScrubbing && 'ring-2 ring-cdaccent/40 border-cdaccent/50',
            )}
            aria-live="polite"
            aria-atomic="true"
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-cdmuted">Selected date</span>
                {isScrubbing && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cdaccent">
                        Scrubbing
                    </span>
                )}
            </div>
            <p className="text-base font-black text-cdtext tabular-nums mb-2">
                {formatDateDDMMYYYY(datum.date ?? new Date(datum.dateNum))}
            </p>
            <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-cdsurface border border-cdborder/50 px-2 py-1.5">
                    <dt className="text-[10px] uppercase font-bold text-cdmuted tracking-wide">CTL</dt>
                    <dd className="text-lg font-black text-blue-400 tabular-nums">{datum.ctl ?? '—'}</dd>
                </div>
                <div className="rounded-md bg-cdsurface border border-cdborder/50 px-2 py-1.5">
                    <dt className="text-[10px] uppercase font-bold text-cdmuted tracking-wide">ATL</dt>
                    <dd className="text-lg font-black text-orange-400 tabular-nums">{datum.atl ?? '—'}</dd>
                </div>
                <div className="rounded-md bg-cdsurface border border-cdborder/50 px-2 py-1.5">
                    <dt className="text-[10px] uppercase font-bold text-cdmuted tracking-wide">TSB</dt>
                    <dd className={cn('text-lg font-black tabular-nums', tsbColor)}>{datum.tsb ?? '—'}</dd>
                </div>
            </dl>
        </div>
    );
}

/**
 * CTL / ATL / TSB timeline with touch-optimized scrubber and mobile data card.
 */
const FormFitnessChart = ({
    fitnessData,
    axisTicks,
}) => {
    const theme = getChartTheme();
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');
    const isNarrow = useMediaQuery('(max-width: 767px)');
    const isMobileLayout = isCoarsePointer || isNarrow;

    const defaultIndex = Math.max(0, (fitnessData?.length ?? 1) - 1);

    const {
        wrapperRef,
        activeDatum,
        isScrubbing,
        margins,
        touchAction,
        handlers,
    } = useChartTouchScrubber({
        data: fitnessData,
        defaultIndex,
        isCompact: isMobileLayout,
        enabled: Boolean(fitnessData?.length),
    });

    const displayDatum = activeDatum ?? fitnessData[defaultIndex];

    const yDomain = useMemo(
        () => computeFitnessChartYDomain(fitnessData, {
            paddingPct: isMobileLayout ? 0.12 : 0.08,
            minPadding: isMobileLayout ? 6 : 5,
        }),
        [fitnessData, isMobileLayout],
    );

    const chartHeight = isMobileLayout ? 'min(52vw, 280px)' : '18rem';
    const strokeWidth = isMobileLayout ? 2.5 : 2;
    const tickFontSize = isMobileLayout ? 10 : 11;
    const axisMinTickGap = isMobileLayout ? 28 : 50;
    const activeDotRadius = isMobileLayout ? 7 : 5;
    const crosshairX = displayDatum?.dateNum;

    const tsbBarFill = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return theme.grid;
        return n >= 0 ? theme.green : '#ef4444';
    };

    const ChartRoot = isMobileLayout ? ComposedChart : LineChart;

    return (
        <div className="space-y-2">
            {isMobileLayout && (
                <FormFitnessMobileDataCard datum={displayDatum} isScrubbing={isScrubbing} />
            )}

            <p className={cn('text-[11px] text-cdmuted', !isMobileLayout && 'sr-only')}>
                Long-press or drag horizontally across the chart to inspect a date. Scroll vertically anywhere else on the page.
            </p>

            <div
                ref={wrapperRef}
                className={cn(
                    'relative w-full select-none',
                    isScrubbing && 'cursor-grabbing',
                    !isScrubbing && isMobileLayout && 'cursor-crosshair',
                )}
                style={{
                    height: chartHeight,
                    touchAction,
                }}
                role="img"
                aria-label="CTL, ATL and TSB fitness chart. Touch and drag horizontally to inspect values."
                {...handlers}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ChartRoot
                        data={fitnessData}
                        margin={margins}
                        syncId="form-fitness-chart"
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={theme.grid}
                            opacity={isMobileLayout ? 0.5 : 0.65}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="dateNum"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            scale="time"
                            ticks={axisTicks}
                            interval={0}
                            minTickGap={axisMinTickGap}
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: tickFontSize }}
                            tickFormatter={(ts) => formatDateDDMMYYYY(new Date(ts))}
                            tickMargin={isMobileLayout ? 6 : 8}
                        />
                        <YAxis
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: tickFontSize }}
                            domain={yDomain}
                            width={isMobileLayout ? 32 : 40}
                            tickCount={isMobileLayout ? 5 : 6}
                        />

                        {!isMobileLayout && (
                            <Tooltip
                                content={(props) => (
                                    <ChartTooltip
                                        {...props}
                                        labelFormatter={(ts) => formatDateDDMMYYYY(ts)}
                                    />
                                )}
                                cursor={theme.cursor}
                            />
                        )}

                        {isMobileLayout && (
                            <Tooltip
                                active={false}
                                cursor={false}
                            />
                        )}

                        <Legend
                            iconType="circle"
                            wrapperStyle={{
                                paddingTop: isMobileLayout ? '8px' : '16px',
                                fontSize: isMobileLayout ? '11px' : '12px',
                            }}
                        />
                        <ReferenceLine y={0} stroke={theme.grid} strokeDasharray="4 4" />

                        {crosshairX != null && (
                            <ReferenceLine
                                x={crosshairX}
                                stroke={theme.primary}
                                strokeWidth={isScrubbing ? 2 : 1}
                                strokeOpacity={isScrubbing ? 0.9 : 0.55}
                                ifOverflow="extendDomain"
                            />
                        )}

                        {displayDatum && (
                            <>
                                <ReferenceDot
                                    x={displayDatum.dateNum}
                                    y={displayDatum.ctl}
                                    r={isMobileLayout ? 5 : 4}
                                    fill={theme.blue}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    isFront
                                />
                                <ReferenceDot
                                    x={displayDatum.dateNum}
                                    y={displayDatum.atl}
                                    r={isMobileLayout ? 5 : 4}
                                    fill={theme.primary}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    isFront
                                />
                                <ReferenceDot
                                    x={displayDatum.dateNum}
                                    y={displayDatum.tsb}
                                    r={isMobileLayout ? 5 : 4}
                                    fill={theme.green}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    isFront
                                />
                            </>
                        )}

                        {isMobileLayout && (
                            <Bar
                                dataKey="tsb"
                                name="TSB"
                                barSize={3}
                                radius={[2, 2, 0, 0]}
                                isAnimationActive={false}
                            >
                                {fitnessData.map((entry) => (
                                    <Cell
                                        key={entry.date}
                                        fill={tsbBarFill(entry.tsb)}
                                        fillOpacity={0.85}
                                    />
                                ))}
                            </Bar>
                        )}

                        <Line
                            type="monotone"
                            dataKey="ctl"
                            name="CTL"
                            stroke={theme.blue}
                            strokeWidth={strokeWidth}
                            dot={false}
                            activeDot={{
                                r: activeDotRadius,
                                stroke: theme.blue,
                                strokeWidth: 2,
                                fill: '#fff',
                            }}
                            isAnimationActive={!isScrubbing}
                        />
                        <Line
                            type="monotone"
                            dataKey="atl"
                            name="ATL"
                            stroke={theme.primary}
                            strokeWidth={strokeWidth}
                            dot={false}
                            activeDot={{
                                r: activeDotRadius,
                                stroke: theme.primary,
                                strokeWidth: 2,
                                fill: '#fff',
                            }}
                            isAnimationActive={!isScrubbing}
                        />

                        {!isMobileLayout && (
                            <Line
                                type="monotone"
                                dataKey="tsb"
                                name="TSB"
                                stroke={theme.green}
                                strokeWidth={strokeWidth}
                                dot={false}
                                activeDot={{
                                    r: activeDotRadius,
                                    stroke: theme.green,
                                    strokeWidth: 2,
                                    fill: '#fff',
                                }}
                            />
                        )}

                        {isMobileLayout && (
                            <Line
                                type="monotone"
                                dataKey="tsb"
                                name="TSB (line)"
                                stroke={theme.green}
                                strokeWidth={1.5}
                                strokeOpacity={0.35}
                                dot={false}
                                legendType="none"
                                isAnimationActive={false}
                            />
                        )}
                    </ChartRoot>
                </ResponsiveContainer>

                {isScrubbing && (
                    <div
                        className="pointer-events-none absolute inset-0 rounded-cdlg ring-1 ring-cdaccent/25 bg-cdaccent/5"
                        aria-hidden
                    />
                )}
            </div>
        </div>
    );
};

export default FormFitnessChart;
