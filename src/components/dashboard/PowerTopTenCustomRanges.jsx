import React from 'react';
import NlDateInput from '../NlDateInput';

/** Highlight year button only when From/To is exactly a full calendar year. */
function selectedFullYear(startYmd, endYmd) {
    if (!startYmd || !endYmd || startYmd.length < 10 || endYmd.length < 10) return null;
    const y = startYmd.slice(0, 4);
    if (startYmd !== `${y}-01-01` || endYmd !== `${y}-12-31`) return null;
    const n = Number(y);
    return Number.isFinite(n) ? n : null;
}

/**
 * Date inputs + year quick-fill for both columns in custom compare mode.
 */
const PowerTopTenCustomRanges = ({
    yearPresets,
    customPrimaryStart,
    setCustomPrimaryStart,
    customPrimaryEnd,
    setCustomPrimaryEnd,
    customCompareStart,
    setCustomCompareStart,
    customCompareEnd,
    setCustomCompareEnd,
    boundsPrimary,
    compareBounds,
}) => {
    const selPrimaryYear = selectedFullYear(customPrimaryStart, customPrimaryEnd);
    const selCompareYear = selectedFullYear(customCompareStart, customCompareEnd);

    return (
    <div className="rounded-lg border border-cdborder bg-cdbg/25 p-3 space-y-3">
        <p className="text-[10px] text-cdmuted leading-relaxed">
            Set both date ranges. Year buttons: full calendar year (1 Jan — 31 Dec). The first time you pick
            &ldquo;Custom date ranges&rdquo;, defaults are derived from your site preset and the previous period of the same length.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-cdaccent uppercase">Column 1</div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        From
                        <NlDateInput
                            value={customPrimaryStart}
                            onChange={setCustomPrimaryStart}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Column 1 from (dd/mm/yyyy)"
                        />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        To
                        <NlDateInput
                            value={customPrimaryEnd}
                            onChange={setCustomPrimaryEnd}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Column 1 to (dd/mm/yyyy)"
                        />
                    </label>
                </div>
                <div className="flex flex-wrap gap-1">
                    {yearPresets.map((y) => {
                        const active = selPrimaryYear === y;
                        return (
                            <button
                                key={`py-${y}`}
                                type="button"
                                onClick={() => {
                                    setCustomPrimaryStart(`${y}-01-01`);
                                    setCustomPrimaryEnd(`${y}-12-31`);
                                }}
                                className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                                    active
                                        ? 'border-cdaccent bg-cdaccent/20 text-cdaccent ring-1 ring-cdaccent/40'
                                        : 'border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50'
                                }`}
                            >
                                {y}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-blue-400 uppercase">Column 2</div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        From
                        <NlDateInput
                            value={customCompareStart}
                            onChange={setCustomCompareStart}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Column 2 from (dd/mm/yyyy)"
                        />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        To
                        <NlDateInput
                            value={customCompareEnd}
                            onChange={setCustomCompareEnd}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Column 2 to (dd/mm/yyyy)"
                        />
                    </label>
                </div>
                <div className="flex flex-wrap gap-1">
                    {yearPresets.map((y) => {
                        const active = selCompareYear === y;
                        return (
                            <button
                                key={`cy-${y}`}
                                type="button"
                                onClick={() => {
                                    setCustomCompareStart(`${y}-01-01`);
                                    setCustomCompareEnd(`${y}-12-31`);
                                }}
                                className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                                    active
                                        ? 'border-blue-400 bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/35'
                                        : 'border-cdborder text-cdmuted hover:text-blue-400 hover:border-blue-400/50'
                                }`}
                            >
                                {y}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
        {(!boundsPrimary || !compareBounds) && (
            <p className="text-xs text-orange-400/90">
                {!boundsPrimary && 'Enter valid dates for column 1 (start ≤ end).'}
                {boundsPrimary && !compareBounds && ' Enter valid dates for column 2.'}
            </p>
        )}
    </div>
    );
};

export default PowerTopTenCustomRanges;
