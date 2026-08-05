import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import PowerCurveChart from './charts/PowerCurveChart';
import { formatDateDDMMYYYY } from '../../utils';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClassLg } from '../../utils/chartTheme';
import useMediaQuery from '../../hooks/useMediaQuery';
import { RankedTableLinks } from './dashboardRankedTableParts';
import CollapsibleDurationSection from './CollapsibleDurationSection';

const DURATION_LABELS = { a_5min: '5 min', b_20min: '20 min', c_60min: '60 min' };

function BestPowerPeriodAccordion({ powerPeakRows, onOpenActivityInLog }) {
    return (
        <div className="space-y-2">
            {powerPeakRows.map((row, index) => {
                const wattsLabel = row.watts > 0 ? `${row.watts} W` : '—';
                return (
                    <CollapsibleDurationSection
                        key={row.key}
                        label={row.label}
                        summary={wattsLabel}
                        defaultExpanded={index === 0}
                    >
                        <div className="space-y-2 pt-2 text-sm">
                            {row.activity?.title && (
                                <p className="text-cdtext leading-snug break-words">{row.activity.title}</p>
                            )}
                            <p className="text-[11px] text-cdmuted">
                                {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                            </p>
                            <div className="pt-1 border-t border-cdborder/40">
                                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold mb-1">
                                    Links
                                </div>
                                <RankedTableLinks activity={row.activity} onOpenActivityInLog={onOpenActivityInLog} />
                            </div>
                        </div>
                    </CollapsibleDurationSection>
                );
            })}
        </div>
    );
}

/**
 * Table of best powers by duration, monthly chart, and MMP curve — only rendered when period stats exist.
 */
const PowerTabDetails = ({ powerPeakRows, monthlyBests, data, manualFtp, onOpenActivityInLog }) => {
    const theme = getChartTheme();
    const isMobile = useMediaQuery('(max-width: 639px)');

    return (
    <>
        <div className={chartCardClassLg}>
            <h3 className="text-lg font-bold text-cdtext mb-1">Best powers in this period</h3>
            <p className="text-xs text-cdmuted mb-4">
                Strongest value per duration in your filtered data (same caps as the chart). Similar to the power view on{' '}
                <a href="https://intervals.icu/power" target="_blank" rel="noopener noreferrer" className="text-cdaccent hover:underline">
                    intervals.icu/power
                </a>
                . Tap a duration to expand ride details.
            </p>

            <BestPowerPeriodAccordion
                powerPeakRows={powerPeakRows}
                onOpenActivityInLog={onOpenActivityInLog}
            />
        </div>

        <div className={chartCardClassLg}>
            <h3 className="text-lg font-bold text-cdtext mb-4">Best monthly efforts (W)</h3>
            <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    <LineChart
                        data={monthlyBests}
                        margin={{ top: 5, right: isMobile ? 8 : 20, left: isMobile ? -8 : 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: isMobile ? 9 : 11 }}
                            interval={isMobile ? 'preserveStartEnd' : 0}
                            minTickGap={isMobile ? 16 : 30}
                            angle={isMobile ? -35 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                            height={isMobile ? 48 : 30}
                        />
                        <YAxis
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: isMobile ? 10 : 11 }}
                            width={isMobile ? 36 : 60}
                        />
                        <Tooltip
                            content={(props) => (
                                <ChartTooltip
                                    {...props}
                                    formatter={(value, name) => [
                                        value ? `${value} W` : '—',
                                        DURATION_LABELS[name] ?? name,
                                    ]}
                                />
                            )}
                            cursor={theme.cursor}
                        />
                        <Legend
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '12px', fontSize: isMobile ? '10px' : '12px' }}
                            formatter={(value) => DURATION_LABELS[value] ?? value}
                        />
                        <Line type="monotone" dataKey="a_5min" stroke={theme.blue} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                        <Line type="monotone" dataKey="b_20min" stroke={theme.primary} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                        <Line type="monotone" dataKey="c_60min" stroke={theme.green} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <PowerCurveChart data={data} manualFtp={manualFtp} />
    </>
    );
};

export default PowerTabDetails;
