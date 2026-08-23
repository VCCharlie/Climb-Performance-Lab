import React, { useMemo } from 'react';
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
import { ChartTooltip } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';
import { COGGAN_ZONES } from '../../cogganZones';
import {
    activitiesHaveZoneTimes,
    weeklyPowerZoneChartRows,
} from '../../utils/zoneTimes';

const ZONE_KEYS = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'];

/**
 * Stacked weekly time-in-power-zones chart (hours per Coggan zone).
 */
export default function TimeInZonesCard({ activities, startYmd, endYmd }) {
    const hasZoneData = activitiesHaveZoneTimes(activities);

    const chartRows = useMemo(
        () => weeklyPowerZoneChartRows(activities, startYmd, endYmd),
        [activities, startYmd, endYmd],
    );

    const theme = getChartTheme();

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
                description="Weekly Z1–Z7 distribution from Intervals sync"
                defaultExpanded
                bodyClassName="!pt-0"
            >
                <p className="text-sm text-cdmuted py-4">
                    No zone time in the selected period. Try a wider date range or sync more rides from Intervals.icu.
                </p>
            </CollapsibleDashboardCard>
        );
    }

    return (
        <CollapsibleDashboardCard
            title="Time in power zones"
            icon={Layers}
            description="Weekly hours per Coggan zone (Z1–Z7) from Intervals sync"
            defaultExpanded
            bodyClassName="!pt-0"
        >
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
                            unit=" h"
                            width={36}
                        />
                        <Tooltip
                            content={
                                <ChartTooltip
                                    formatter={(value, name) => {
                                        const zone = COGGAN_ZONES.find((z) =>
                                            z.name.toLowerCase().startsWith(name.toLowerCase()),
                                        );
                                        const label = zone?.name || name;
                                        return [`${value} h`, label];
                                    }}
                                />
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
