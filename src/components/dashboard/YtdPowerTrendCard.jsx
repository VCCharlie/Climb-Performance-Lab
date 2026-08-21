import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { SegmentedControl } from '../ui';
import YtdCompareCard from './YtdCompareCard';
import PowerLongevityCard from './PowerLongevityCard';
import { chartCardClass } from '../../utils/chartTheme';

/**
 * Merged YTD volume compare + long-term power trend with internal metric switcher.
 */
export default function YtdPowerTrendCard({
    activities,
    manualFtp,
    weightKg,
    userSettings,
    onGoToPowerTab,
}) {
    const [view, setView] = useState('volume');

    return (
        <div className={chartCardClass}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-start gap-2 min-w-0">
                    <TrendingUp className="w-5 h-5 text-cdaccent shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">
                            Year &amp; power trends
                        </h3>
                        <p className="text-[11px] text-cdmuted leading-snug">
                            Compare volume year-to-date or review long-term power peaks.
                        </p>
                    </div>
                </div>
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={view}
                    onChange={setView}
                    aria-label="Year and power trend view"
                    options={[
                        { value: 'volume', label: 'Volume YTD' },
                        { value: 'power', label: 'Power trend' },
                    ]}
                />
            </div>

            {view === 'volume' ? (
                <YtdCompareCard bare activities={activities} manualFtp={manualFtp} />
            ) : (
                <PowerLongevityCard
                    bare
                    activities={activities}
                    manualFtp={manualFtp}
                    weightKg={weightKg}
                    userSettings={userSettings}
                    onGoToPowerTab={onGoToPowerTab}
                />
            )}
        </div>
    );
}
