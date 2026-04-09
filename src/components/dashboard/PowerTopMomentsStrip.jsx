import React, { useMemo, useState } from 'react';
import { ExternalLink, Zap } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import { computeTopPowerMoments, dashboardFilterLabel } from '../../utils/powerDurationTable';

/**
 * Horizontale chip-selector voor de sterkste geïnterpoleerde power-momenten in de gefilterde periode.
 */
const PowerTopMomentsStrip = ({ data, manualFtp, timeRange, onOpenActivityInLog }) => {
    const [topMomentIndex, setTopMomentIndex] = useState(0);

    const topMoments = useMemo(
        () => computeTopPowerMoments(data, manualFtp, 10),
        [data, manualFtp],
    );

    const selectedMoment = topMoments[topMomentIndex] ?? null;
    const periodLabel = dashboardFilterLabel(timeRange);

    if (topMoments.length === 0) return null;

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5 text-cdaccent shrink-0">
                    <Zap size={22} strokeWidth={2.2} aria-hidden />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-cdtext">Top 10 power-momenten</h3>
                    <p className="text-xs text-cdmuted mt-1 max-w-2xl leading-relaxed">
                        Geïnterpoleerde pieken (zelfde methode als de power-duration matrix) in{' '}
                        <span className="text-cdtext font-medium">{periodLabel}</span>. Tik een chip om de rit en links te zien.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
                {topMoments.map((m, idx) => {
                    const isSel = idx === topMomentIndex;
                    return (
                        <button
                            key={`${m.activity?.id ?? idx}-${m.durationLabel}-${m.watts}`}
                            type="button"
                            onClick={() => setTopMomentIndex(idx)}
                            className={`shrink-0 text-left rounded-lg border px-3 py-2 min-w-[7.5rem] transition-colors ${
                                isSel
                                    ? 'border-cdaccent bg-cdaccent/15 ring-2 ring-cdaccent/40'
                                    : 'border-cdborder bg-cdborder/20 hover:bg-cdborder/40'
                            }`}
                        >
                            <div className="font-mono font-bold text-cdtext tabular-nums">
                                {m.watts} W
                            </div>
                            <div className="text-[11px] text-cdaccent font-semibold">@{m.durationLabel}</div>
                            <div className="text-[10px] text-cdmuted truncate max-w-[9rem] mt-0.5" title={m.activity?.title}>
                                {m.activity?.title || '—'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedMoment && (
                <div className="mt-4 rounded-lg border border-cdborder bg-cdborder/10 p-4">
                    <div className="font-bold text-cdtext">{selectedMoment.activity?.title || 'Zonder titel'}</div>
                    <div className="text-xs text-cdmuted mt-1">
                        {formatDateDDMMYYYY(selectedMoment.activity?.date)} ·{' '}
                        <span className="text-cdaccent font-mono font-semibold">
                            ~{selectedMoment.watts} W @ {selectedMoment.durationLabel}
                        </span>
                        <span className="text-cdmuted"> (geschat)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {typeof onOpenActivityInLog === 'function' && selectedMoment.activity?.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(selectedMoment.activity.id)}
                                className="text-xs font-bold text-cdaccent hover:underline inline-flex items-center gap-1"
                            >
                                <ExternalLink size={12} /> Open in log
                            </button>
                        )}
                        {activityExternalLinks(selectedMoment.activity).map((l) => (
                            <a
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-cdmuted hover:text-cdaccent"
                            >
                                {l.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PowerTopMomentsStrip;
