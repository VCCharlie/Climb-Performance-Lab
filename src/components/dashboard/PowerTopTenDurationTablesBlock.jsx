import React from 'react';
import { TopTable } from './powerTopTenByDurationUi';
import CollapsibleDurationSection from './CollapsibleDurationSection';

const PowerTopTenDurationTablesBlock = ({
    tablesByDuration,
    compareBounds,
    onOpenActivityInLog,
    mobileCompareColumn = 1,
}) => {
    return (
        <div className="space-y-3">
            {tablesByDuration.map(({ label, primary, secondary, footnote }) => {
                const activeRows = compareBounds && mobileCompareColumn === 2 ? secondary : primary;
                const topWatt = activeRows?.[0]?.watts;
                const summary = topWatt ? `${topWatt} W` : null;

                return (
                    <CollapsibleDurationSection
                        key={label}
                        label={label}
                        summary={summary}
                        footnote={footnote}
                        defaultExpanded={false}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
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
                    </CollapsibleDurationSection>
                );
            })}
        </div>
    );
};

export default PowerTopTenDurationTablesBlock;
