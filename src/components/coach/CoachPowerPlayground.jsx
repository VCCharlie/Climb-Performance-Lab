import React, { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { ChartTooltip } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import { buildMultiYearPowerAnalysis } from '../../utils/coach/coachPowerAnalysis';
import { useProfileFtp } from '../../context/ProfileFtpContext';

const YEAR_SPAN_OPTIONS = [5, 10, 15];
const TOP_N_OPTIONS = [5, 10, 15];

const CoachPowerPlayground = ({ activities, userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;
    const theme = getChartTheme();

    const [expanded, setExpanded] = useState(true);
    const [yearSpan, setYearSpan] = useState(10);
    const [topN, setTopN] = useState(10);
    const [field, setField] = useState('best_60min');

    const analysis = useMemo(
        () => buildMultiYearPowerAnalysis(activities, ftp, { field, limit: topN, yearSpan }),
        [activities, ftp, field, topN, yearSpan],
    );

    const rowsWithData = analysis.yearly.filter((row) => row.count > 0);
    const durationLabel = field === 'best_20min' ? '20-minute' : '60-minute';

    if (!activities?.length) return null;

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full p-5 border-b border-cdborder flex items-start justify-between gap-3 text-left hover:bg-cdborder/10 transition-colors"
            >
                <div>
                    <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                        <BarChart3 size={20} className="text-cdaccent" />
                        Power Analysis
                    </h3>
                    <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                        Explore top efforts per year with filters — same data as Ask the Coach, with charts and tables.
                    </p>
                </div>
                {expanded ? <ChevronDown size={18} className="text-cdmuted shrink-0 mt-1" /> : <ChevronRight size={18} className="text-cdmuted shrink-0 mt-1" />}
            </button>

            {expanded && (
                <div className="p-5 space-y-5">
                    <div className="flex flex-wrap gap-3">
                        <FilterSelect
                            label="Duration"
                            value={field}
                            onChange={setField}
                            options={[
                                { value: 'best_60min', label: '60-minute' },
                                { value: 'best_20min', label: '20-minute' },
                            ]}
                        />
                        <FilterSelect
                            label="Years"
                            value={String(yearSpan)}
                            onChange={(v) => setYearSpan(Number(v))}
                            options={YEAR_SPAN_OPTIONS.map((n) => ({ value: String(n), label: `Last ${n} years` }))}
                        />
                        <FilterSelect
                            label="Top N"
                            value={String(topN)}
                            onChange={(v) => setTopN(Number(v))}
                            options={TOP_N_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))}
                        />
                    </div>

                    {rowsWithData.length === 0 ? (
                        <p className="text-sm text-cdmuted">
                            No {durationLabel} power data in this window. Import rides with best power fields from Intervals.icu or Garmin.
                        </p>
                    ) : (
                        <>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                                        <XAxis dataKey="year" tick={{ fill: theme.tick, fontSize: 11 }} />
                                        <YAxis tick={{ fill: theme.tick, fontSize: 11 }} unit=" W" />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="avg" name={`Avg top ${topN} (${durationLabel})`} fill="rgba(250,204,21,0.85)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <p className="text-xs text-cdmuted">
                                Bars show the average of your top {topN} {durationLabel} efforts per calendar year.
                            </p>

                            <div className="overflow-x-auto rounded-lg border border-cdborder">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                            <th className="px-3 py-2 font-semibold">Year</th>
                                            <th className="px-3 py-2 font-semibold">Top values (W)</th>
                                            <th className="px-3 py-2 font-semibold">Avg</th>
                                            <th className="px-3 py-2 font-semibold">Anomalies</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-cdtext">
                                        {rowsWithData.map((row) => (
                                            <tr key={row.year} className="border-t border-cdborder align-top">
                                                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.year}</td>
                                                <td className="px-3 py-2 text-cdmuted font-mono text-xs">
                                                    {row.efforts.map((e) => e.watts).join(', ')}
                                                </td>
                                                <td className="px-3 py-2 font-mono whitespace-nowrap">{row.avg}W</td>
                                                <td className="px-3 py-2 text-xs text-cdmuted">
                                                    {row.anomalies.length
                                                        ? row.anomalies.map((a) => (
                                                            <span key={`${a.date}-${a.watts}`} className="block text-orange-300">
                                                                {a.watts}W ({a.date})
                                                            </span>
                                                        ))
                                                        : 'None'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

function FilterSelect({ label, value, onChange, options }) {
    return (
        <label className="flex flex-col gap-1 text-xs text-cdmuted">
            <span className="font-semibold text-cdtext">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext min-w-[140px]"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </label>
    );
}

export default CoachPowerPlayground;
