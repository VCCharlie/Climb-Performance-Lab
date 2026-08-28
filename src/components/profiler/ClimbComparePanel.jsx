import React, { useMemo, useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import ClimbSelector from '../shared/ClimbSelector';
import { getDefaultClimb } from '../../services/climbDatabase';
import { buildClimbComparisonRows } from '../../utils/climbCompare';

/**
 * Side-by-side climb comparison table (length, grade, physics estimates).
 */
export default function ClimbComparePanel({ userSettings, primaryClimb, intensityFraction = 0.85 }) {
    const [compareClimb, setCompareClimb] = useState(() => getDefaultClimb());
    const [open, setOpen] = useState(false);

    const rows = useMemo(
        () => buildClimbComparisonRows(primaryClimb, compareClimb, userSettings, { intensityFraction }),
        [primaryClimb, compareClimb, userSettings, intensityFraction],
    );

    if (!primaryClimb) return null;

    return (
        <div className="rounded-xl border border-cdborder bg-cdbg/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-cdtext flex items-center gap-2">
                    <GitCompareArrows size={16} className="text-cdaccent" />
                    Compare climbs
                </h3>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`text-xs font-bold px-3 py-1 rounded border ${open ? 'bg-cdaccent/15 text-cdaccent border-cdaccent/40' : 'text-cdmuted border-cdborder hover:border-cdaccent/40'}`}
                >
                    {open ? 'Hide comparison' : 'Compare with…'}
                </button>
            </div>

            {open && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div>
                        <label className="text-[11px] text-cdmuted uppercase tracking-wider block mb-2 font-semibold">
                            Second climb
                        </label>
                        <ClimbSelector
                            mode="single"
                            selected={compareClimb}
                            onSelect={setCompareClimb}
                            excludeIds={primaryClimb?.id ? [primaryClimb.id] : []}
                        />
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-cdborder">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-cdsurface border-b border-cdborder text-left">
                                    <th className="px-3 py-2 text-xs text-cdmuted uppercase">Metric</th>
                                    <th className="px-3 py-2 text-xs text-cdtext font-bold">{primaryClimb.name}</th>
                                    <th className="px-3 py-2 text-xs text-cdtext font-bold">{compareClimb?.name || '—'}</th>
                                    <th className="px-3 py-2 text-xs text-cdmuted uppercase text-right">Δ (A−B)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.key} className="border-b border-cdborder/60 last:border-0">
                                        <td className="px-3 py-2 text-cdmuted whitespace-nowrap">{row.label}</td>
                                        <td className="px-3 py-2 text-cdtext tabular-nums">{row.a}</td>
                                        <td className="px-3 py-2 text-cdtext tabular-nums">{row.b}</td>
                                        <td className="px-3 py-2 text-cdmuted tabular-nums text-right">{row.delta || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] text-cdmuted leading-snug">
                        Estimates use your profile weight, FTP, and physics defaults at {Math.round(intensityFraction * 100)}% intensity.
                    </p>
                </div>
            )}
        </div>
    );
}
