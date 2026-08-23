import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { SegmentedControl } from '../ui';
import YtdCompareCard from './YtdCompareCard';
import PowerLongevityCard from './PowerLongevityCard';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';

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
        <CollapsibleDashboardCard
            title="Year & power trends"
            icon={TrendingUp}
            description="Compare volume year-to-date or review long-term power peaks."
            defaultExpanded
            bodyClassName="!pt-0"
        >
            <div className="flex justify-end mb-4">
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
        </CollapsibleDashboardCard>
    );
}
