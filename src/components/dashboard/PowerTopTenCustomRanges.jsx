import React from 'react';
import NlDateInput from '../NlDateInput';

/** Highlight jaar-knop alleen als Van/Tot exact heel kalenderjaar is. */
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
            Stel beide datumbereiken in. Jaar-knoppen: volledig kalenderjaar (1 jan — 31 dec). Bij eerste keuze
            &ldquo;Aangepaste periodes&rdquo; worden startwaarden afgeleid van je site-preset en de vorige even lange periode.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-cdaccent uppercase">Kolom 1</div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        Van
                        <NlDateInput
                            value={customPrimaryStart}
                            onChange={setCustomPrimaryStart}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Kolom 1 van (dd/mm/jjjj)"
                        />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        Tot
                        <NlDateInput
                            value={customPrimaryEnd}
                            onChange={setCustomPrimaryEnd}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Kolom 1 tot (dd/mm/jjjj)"
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
                <div className="text-[10px] font-bold text-blue-400 uppercase">Kolom 2</div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        Van
                        <NlDateInput
                            value={customCompareStart}
                            onChange={setCustomCompareStart}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Kolom 2 van (dd/mm/jjjj)"
                        />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[10px] text-cdmuted">
                        Tot
                        <NlDateInput
                            value={customCompareEnd}
                            onChange={setCustomCompareEnd}
                            className="bg-cdborder/30 border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                            aria-label="Kolom 2 tot (dd/mm/jjjj)"
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
                {!boundsPrimary && 'Vul geldige datums in voor kolom 1 (start ≤ einde).'}
                {boundsPrimary && !compareBounds && ' Vul geldige datums in voor kolom 2.'}
            </p>
        )}
    </div>
    );
};

export default PowerTopTenCustomRanges;
