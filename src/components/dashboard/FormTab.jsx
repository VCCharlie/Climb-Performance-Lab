import React, { useMemo } from 'react';
import { formatDateDDMMYYYY } from '../../utils';
import { chartCardClassLg } from '../../utils/chartTheme';
import { buildFitnessSeriesForRange } from '../../utils/formTabMetrics';
import FormFitnessChart from './FormFitnessChart';
import CollapsibleInfoCard from '../ui/CollapsibleInfoCard';

/**
 * FormTab: Shows CTL, ATL and TSB (fitness / fatigue / form) progression over time.
 */

const StatBadge = ({ label, value, color }) => (
    <div className="bg-cdsurface border border-cdborder rounded-lg p-4 text-center">
        <div className="text-xs uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
    </div>
);

const FormTab = ({
    data,
    customTicks,
    allActivities,
    displayStartYmd,
    displayEndYmd,
}) => {
    const { chartData: fitnessData, current: latest } = useMemo(
        () => buildFitnessSeriesForRange(allActivities || data, {
            displayStartYmd,
            displayEndYmd,
            asOfYmd: displayEndYmd,
        }),
        [allActivities, data, displayStartYmd, displayEndYmd],
    );

    const axisTicks = useMemo(() => {
        if (!customTicks) return undefined;
        return customTicks.map((t) => {
            const formatted = formatDateDDMMYYYY(t);
            if (formatted === '-') return new Date(t).getTime();
            const [dd, mm, yyyy] = formatted.split('-').map(Number);
            return new Date(yyyy, mm - 1, dd).getTime();
        });
    }, [customTicks]);

    const tsbColor = latest && latest.tsb >= 5
        ? 'text-green-400'
        : latest && latest.tsb >= -10
            ? 'text-cdprimary'
            : 'text-red-400';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {latest ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <StatBadge label="CTL (Fitness)" value={latest.ctl} color="text-blue-400" />
                        <StatBadge label="ATL (Fatigue)" value={latest.atl} color="text-cdaccent" />
                        <StatBadge label="TSB (Form)" value={latest.tsb} color={tsbColor} />
                    </div>

                    <div className={chartCardClassLg}>
                        <h3 className="text-lg font-bold text-cdtext mb-4">CTL / ATL / TSB</h3>
                        <FormFitnessChart
                            key={latest.date}
                            fitnessData={fitnessData}
                            axisTicks={axisTicks}
                        />
                        <CollapsibleInfoCard
                            title="CTL / ATL / TSB explained"
                            variant="info"
                            defaultExpanded={false}
                            className="mt-3 !shadow-none"
                            bodyClassName="!text-xs !text-cdmuted"
                        >
                            CTL (42-day) = fitness · ATL (7-day) = fatigue · TSB = CTL − ATL (form)
                        </CollapsibleInfoCard>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-24 text-cdmuted text-sm border border-dashed border-cdborder rounded-xl">
                    No TSS in this period — CTL / ATL / TSB cannot be computed.
                </div>
            )}

            {!data?.length && (
                <div className="flex items-center justify-center h-40 text-cdmuted">
                    No activities available.
                </div>
            )}
        </div>
    );
};

export default FormTab;
