import React from 'react';
import { TopTable } from './powerTopTenByDurationUi';

const PowerTopTenDurationTablesBlock = ({
    tablesByDuration,
    compareBounds,
    onOpenActivityInLog,
    mobileCompareColumn = 1,
}) => (
    <div className="space-y-6">
        {tablesByDuration.map(({ label, primary, secondary, footnote }) => (
            <div key={label}>
                <h4 className="text-sm font-bold text-cdaccent mb-2">{label}</h4>
                {footnote && (
                    <p className="text-[10px] text-cdmuted mb-2 leading-snug max-w-3xl">{footnote}</p>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className={compareBounds && mobileCompareColumn !== 1 ? 'hidden lg:block' : ''}>
                        <p className="text-[10px] uppercase text-cdmuted font-bold tracking-wide mb-1.5">
                            Column 1
                        </p>
                        <TopTable
                            rows={primary}
                            peerRows={secondary}
                            onOpenActivityInLog={onOpenActivityInLog}
                            emptyHint="No rides with power in this window."
                        />
                    </div>
                    {compareBounds ? (
                        <div className={mobileCompareColumn === 2 ? 'block' : 'hidden lg:block'}>
                            <p className="text-[10px] uppercase text-cdmuted font-bold tracking-wide mb-1.5">
                                Column 2
                            </p>
                            <TopTable
                                rows={secondary}
                                peerRows={primary}
                                onOpenActivityInLog={onOpenActivityInLog}
                                emptyHint="No rides in the comparison window."
                            />
                        </div>
                    ) : (
                        <div className="hidden lg:block rounded-lg border border-dashed border-cdborder/60 p-4 text-xs text-cdmuted">
                            Choose a comparison mode to show a second column here.
                        </div>
                    )}
                </div>
            </div>
        ))}
    </div>
);

export default PowerTopTenDurationTablesBlock;
