import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { ChartTooltip, SegmentedControl } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';
import NlDateInput from '../NlDateInput';
import { COGGAN_ZONES } from '../../cogganZones';
import {
    activitiesHaveZoneTimes,
    computeZoneChartLookbackYmd,
    powerZoneChartRows,
    powerZoneChartRowsAsPercent,
    ZONE_CHART_CADENCES,
    ZONE_CHART_LOOKBACK_PRESETS,
} from '../../utils/zoneTimes';

const ZONE_KEYS = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'];

const VALUE_MODE_OPTIONS = [
    { value: 'hours', label: 'Hours' },
    { value: 'percent', label: '%' },
];

/**
 * Stacked time-in-power-zones chart with cadence, lookback, and hours vs % display.
 */
export default function TimeInZonesCard({
    activities,
    dashboardStartYmd = '',
    dashboardEndYmd = '',
    referenceEndYmd = '',
}) {
    const [cadence, setCadence] = useState('week');
    const [valueMode, setValueMode] = useState('hours');
    const [lookback, setLookback] = useState('12w');
    const [customStartYmd, setCustomStartYmd] = useState('');
    const [customEndYmd, setCustomEndYmd] = useState('');

    const hasZoneData = activitiesHaveZoneTimes(activities);

    const { startYmd, endYmd } = useMemo(
        () => computeZoneChartLookbackYmd(lookback, {
            referenceEndYmd,
            dashboardStartYmd,
            dashboardEndYmd,
            customStartYmd,
            customEndYmd,
        }),
        [lookback, referenceEndYmd, dashboardStartYmd, dashboardEndYmd, customStartYmd, customEndYmd],
    );

    const chartRows = useMemo(() => {
        const hoursRows = powerZoneChartRows(activities, startYmd, endYmd, cadence);
        return valueMode === 'percent' ? powerZoneChartRowsAsPercent(hoursRows) : hoursRows;
    }, [activities, startYmd, endYmd, cadence, valueMode]);

    const theme = getChartTheme();
    const cadenceLabel = ZONE_CHART_CADENCES.find((c) => c.value === cadence)?.label?.toLowerCase() || 'week';
    const description = valueMode === 'percent'
        ? `${cadenceLabel.charAt(0).toUpperCase() + cadenceLabel.slice(1)}ly zone share (Z1–Z7) from Intervals sync`
        : `${cadenceLabel.charAt(0).toUpperCase() + cadenceLabel.slice(1)}ly hours per Coggan zone (Z1–Z7) from Intervals sync`;

    const formatTooltipValue = (value, name) => {
        const zone = COGGAN_ZONES.find((z) =>
            z.name.toLowerCase().startsWith(name.toLowerCase()),
        );
        const label = zone?.name || name;
        if (valueMode === 'percent') {
            return [`${value}%`, label];
        }
        return [`${value} h`, label];
    };

    if (!hasZoneData) {
        return (
            <CollapsibleDashboardCard
                title="Time in power zones"
                icon={Layers}
                description="Weekly Z1–Z7 distribution from Intervals sync"
                defaultExpanded={false}
                bodyClassName="!pt-0"
            >
                <p className="text-sm text-cdmuted py-4">
                    Zone times appear after Intervals sync with power data.
                </p>
            </CollapsibleDashboardCard>
        );
    }

    if (chartRows.length === 0) {
        return (
            <CollapsibleDashboardCard
                title="Time in power zones"
                icon={Layers}
                description={description}
                defaultExpanded
                bodyClassName="!pt-0"
            >
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2 mb-4">
                    <SegmentedControl
                        size="sm"
                        caps={false}
                        dense
                        value={cadence}
                        onChange={setCadence}
                        aria-label="Zone chart cadence"
                        options={ZONE_CHART_CADENCES}
                    />
                    <SegmentedControl
                        size="sm"
                        caps={false}
                        dense
                        value={valueMode}
                        onChange={setValueMode}
                        aria-label="Zone chart value mode"
                        options={VALUE_MODE_OPTIONS}
                    />
                    <SegmentedControl
                        size="sm"
                        caps={false}
                        dense
                        value={lookback}
                        onChange={setLookback}
                        aria-label="Zone chart lookback"
                        options={ZONE_CHART_LOOKBACK_PRESETS}
                    />
                </div>
                {lookback === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <NlDateInput
                            value={customStartYmd}
                            onChange={setCustomStartYmd}
                            aria-label="Zone chart custom start date"
                            className="bg-cdsurfacelow border border-cdborder rounded-lg px-2 py-1 text-xs text-cdtext w-28"
                        />
                        <span className="text-cdmuted text-xs">to</span>
                        <NlDateInput
                            value={customEndYmd || endYmd}
                            onChange={setCustomEndYmd}
                            aria-label="Zone chart custom end date"
                            className="bg-cdsurfacelow border border-cdborder rounded-lg px-2 py-1 text-xs text-cdtext w-28"
                        />
                    </div>
                )}
                <p className="text-sm text-cdmuted py-4">
                    No zone time in the selected period. Try a wider lookback or sync more rides from Intervals.icu.
                </p>
            </CollapsibleDashboardCard>
        );
    }

    return (
        <CollapsibleDashboardCard
            title="Time in power zones"
            icon={Layers}
            description={description}
            defaultExpanded
            bodyClassName="!pt-0"
        >
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2 mb-4">
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={cadence}
                    onChange={setCadence}
                    aria-label="Zone chart cadence"
                    options={ZONE_CHART_CADENCES}
                />
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={valueMode}
                    onChange={setValueMode}
                    aria-label="Zone chart value mode"
                    options={VALUE_MODE_OPTIONS}
                />
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={lookback}
                    onChange={setLookback}
                    aria-label="Zone chart lookback"
                    options={ZONE_CHART_LOOKBACK_PRESETS}
                />
            </div>

            {lookback === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <NlDateInput
                        value={customStartYmd}
                        onChange={setCustomStartYmd}
                        aria-label="Zone chart custom start date"
                        className="bg-cdsurfacelow border border-cdborder rounded-lg px-2 py-1 text-xs text-cdtext w-28"
                    />
                    <span className="text-cdmuted text-xs">to</span>
                    <NlDateInput
                        value={customEndYmd || endYmd}
                        onChange={setCustomEndYmd}
                        aria-label="Zone chart custom end date"
                        className="bg-cdsurfacelow border border-cdborder rounded-lg px-2 py-1 text-xs text-cdtext w-28"
                    />
                </div>
            )}

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: theme.tickFill, fontSize: 11 }}
                            axisLine={{ stroke: theme.axisStroke }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: theme.tickFill, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            unit={valueMode === 'percent' ? '%' : ' h'}
                            width={40}
                            domain={valueMode === 'percent' ? [0, 100] : undefined}
                        />
                        <Tooltip
                            content={
                                <ChartTooltip formatter={formatTooltipValue} />
                            }
                        />
                        <Legend
                            wrapperStyle={{ fontSize: 10 }}
                            formatter={(value) => {
                                const zone = COGGAN_ZONES[ZONE_KEYS.indexOf(value)];
                                return zone ? zone.name.replace(' Recovery', '').replace(' Endurance', '') : value;
                            }}
                        />
                        {ZONE_KEYS.map((key, idx) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                name={key.toUpperCase()}
                                stackId="zones"
                                fill={COGGAN_ZONES[idx]?.color || theme.primary}
                                radius={idx === ZONE_KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CollapsibleDashboardCard>
    );
}
