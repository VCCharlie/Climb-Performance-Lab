import React, { useMemo, useState } from 'react';
import { GitCompare } from 'lucide-react';
import { SPORT_TYPES } from '../../config';
import { chartCardClass } from '../../utils/chartTheme';
import { COMPARE_PERIODS, comparePeriodSubtitle } from '../../utils/comparePeriodWindows';
import { computeMultiYearCompareRows } from '../../utils/multiYearSameMoment';
import { computeSportMixForComparePeriod } from '../../utils/compareSportMix';
import YearAtMomentBars from './YearAtMomentBars';
import CompareSportDonut from './CompareSportDonut';

const DEFAULT_SPORTS = new Set(['Ride', 'VirtualRide']);

const METRICS = [
    { id: 'distanceKm', label: 'Distance' },
    { id: 'elevationM', label: 'Elevation' },
    { id: 'movingTimeSec', label: 'Moving time' },
];

function sportPillClass(active) {
    return active
        ? 'bg-cdaccent/20 text-cdaccent border-cdaccent/50'
        : 'bg-cdsurface border-cdborder text-cdmuted hover:text-cdtext';
}

/**
 * Year-over-year comparison — sport filters, period toggle, bars + donut.
 */
const CompareTab = ({ allActivities }) => {
    const [selectedSports, setSelectedSports] = useState(() => new Set(DEFAULT_SPORTS));
    const [period, setPeriod] = useState('ytd');
    const now = useMemo(() => new Date(), []);
    const currentYear = now.getFullYear();

    const rows = useMemo(
        () => computeMultiYearCompareRows(allActivities, now, 5, selectedSports, period),
        [allActivities, now, selectedSports, period],
    );

    const sportMix = useMemo(
        () => computeSportMixForComparePeriod(allActivities, period, now, selectedSports, 'distanceKm'),
        [allActivities, period, now, selectedSports],
    );

    const periodLabel = COMPARE_PERIODS.find((p) => p.id === period)?.label || 'YTD';

    const toggleSport = (type) => {
        setSelectedSports((prev) => {
            const next = new Set(prev);
            if (next.has(type)) {
                if (next.size <= 1) return prev;
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    if (!allActivities?.length) {
        return (
            <div className="flex items-center justify-center h-40 text-cdmuted">
                No activities in your log yet.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className={chartCardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-2">
                        <GitCompare className="w-5 h-5 text-cdaccent shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">
                                Compare years ({periodLabel})
                            </h3>
                            <p className="text-[11px] text-cdmuted">
                                {comparePeriodSubtitle(period, now)}
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden text-[11px] font-bold">
                        {COMPARE_PERIODS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPeriod(p.id)}
                                className={`px-3 py-1.5 transition-colors ${
                                    period === p.id ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-2">Sport types</div>
                    <div className="flex flex-wrap gap-1.5">
                        {SPORT_TYPES.map((type) => {
                            const active = selectedSports.has(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleSport(type)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-full border cd-transition ${sportPillClass(active)}`}
                                    aria-pressed={active}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!rows.length ? (
                    <p className="text-sm text-cdmuted text-center py-8">
                        No activities for the selected sport types in this period.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {METRICS.map((m) => (
                                <div key={m.id} className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">{m.label}</h4>
                                    <YearAtMomentBars rows={rows} metricId={m.id} currentYear={currentYear} />
                                </div>
                            ))}
                        </div>
                        <CompareSportDonut rows={sportMix} basis="distanceKm" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompareTab;
