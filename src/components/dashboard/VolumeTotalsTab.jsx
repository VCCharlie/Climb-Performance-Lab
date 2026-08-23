import React, { useMemo } from 'react';
import { BarChart3, CalendarRange } from 'lucide-react';
import CollapsibleInfoCard from '../ui/CollapsibleInfoCard';
import { formatNlNumber } from '../../utils/formatters';
import {
    buildMonthlyVolumeTotals,
    buildWeeklyVolumeTotals,
    buildYearlyVolumeTotals,
    formatDurationHoursMinutes,
} from '../../utils/dashboardVolumeTotals';
import VolumeTotalsChart from './VolumeTotalsChart';

const TotalsTable = ({ rows, periodHeading }) => (
    <div className="overflow-x-auto rounded-lg border border-cdborder">
        <table className="w-full text-left text-xs min-w-[520px]">
            <thead>
                <tr className="bg-cdborder/40 text-cdmuted uppercase tracking-wide">
                    <th className="px-3 py-2 font-semibold">{periodHeading}</th>
                    <th className="px-3 py-2 font-semibold text-right">Rides</th>
                    <th className="px-3 py-2 font-semibold text-right">Distance</th>
                    <th className="px-3 py-2 font-semibold text-right">Elevation</th>
                    <th className="px-3 py-2 font-semibold text-right">Moving time</th>
                    <th className="px-3 py-2 font-semibold text-right">Load (TSS)</th>
                </tr>
            </thead>
            <tbody className="text-cdtext divide-y divide-cdborder/50">
                {rows.map((row) => (
                    <tr key={row.key} className="hover:bg-cdborder/15">
                        <td className="px-3 py-2 font-medium text-cdtext whitespace-nowrap">{row.label}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNlNumber(row.rideCount)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNlNumber(row.distanceKm)} km</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNlNumber(row.elevationM)} m</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-cdmuted">{formatDurationHoursMinutes(row.movingTimeSec)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-400/95">{formatNlNumber(row.load)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/**
 * Dashboard: weekly, monthly & yearly distance, elevation, moving time, and TSS-style load totals.
 */
const VolumeTotalsTab = ({
    data,
    onOpenActivityLogDateRange,
    comparePrevPeriodActivities = [],
    comparePrevYearActivities = [],
}) => {
    const monthly = useMemo(() => buildMonthlyVolumeTotals(data), [data]);
    const weekly = useMemo(() => buildWeeklyVolumeTotals(data), [data]);
    const yearly = useMemo(() => buildYearlyVolumeTotals(data), [data]);

    if (!data?.length) {
        return (
            <div className="rounded-xl border border-cdborder bg-cdsurface p-6 text-center text-cdmuted text-sm">
                No activities in the selected period — widen the date range or import rides to see volume totals.
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <CollapsibleInfoCard
                title="About volume totals"
                defaultExpanded={false}
                variant="default"
                className="!shadow-none"
                bodyClassName="!text-xs !text-cdmuted !leading-relaxed"
            >
                Totals follow the <strong className="text-cdtext">same date filter</strong> as the rest of the Dashboard (preset or custom range).
                Weeks start on <strong className="text-cdtext">Monday</strong>. Load is the sum of activity training load (TSS).
            </CollapsibleInfoCard>

            <VolumeTotalsChart
                weeklyRows={weekly}
                monthlyRows={monthly}
                yearlyRows={yearly}
                onOpenActivityLogDateRange={onOpenActivityLogDateRange}
                comparePrevPeriodActivities={comparePrevPeriodActivities}
                comparePrevYearActivities={comparePrevYearActivities}
            />

            <section>
                <h3 className="text-sm font-bold text-cdtext mb-2 flex items-center gap-2">
                    <CalendarRange size={16} className="text-cdaccent shrink-0" aria-hidden />
                    Yearly totals
                </h3>
                {yearly.length === 0 ? (
                    <p className="text-xs text-cdmuted">No yearly buckets in this range.</p>
                ) : (
                    <TotalsTable rows={yearly} periodHeading="Year" />
                )}
            </section>

            <section>
                <h3 className="text-sm font-bold text-cdtext mb-2 flex items-center gap-2">
                    <CalendarRange size={16} className="text-cdaccent shrink-0" aria-hidden />
                    Monthly totals
                </h3>
                {monthly.length === 0 ? (
                    <p className="text-xs text-cdmuted">No monthly buckets in this range.</p>
                ) : (
                    <TotalsTable rows={monthly} periodHeading="Month" />
                )}
            </section>

            <section>
                <h3 className="text-sm font-bold text-cdtext mb-2 flex items-center gap-2">
                    <BarChart3 size={16} className="text-cdaccent shrink-0" aria-hidden />
                    Weekly totals
                </h3>
                {weekly.length === 0 ? (
                    <p className="text-xs text-cdmuted">No weekly buckets in this range.</p>
                ) : (
                    <TotalsTable rows={weekly} periodHeading="Week (Mon–Sun)" />
                )}
            </section>
        </div>
    );
};

export default VolumeTotalsTab;
