import React, { useEffect, useMemo, useState } from 'react';
import { Chip } from '../../ui';
import { resolveQuickFilterChip } from '../../../utils/activityLogQuickFilterDefinitions';
import { resolveVisiblePrimaryQuickFilterIds } from '../../../utils/activityLogPrimaryQuickFilters';
import { usePrimaryQuickFilterBar } from '../../../hooks/usePrimaryQuickFilterBar';
import PrimaryQuickFilterCustomize from './PrimaryQuickFilterCustomize';

const WIDE_DESKTOP_MEDIA_QUERY = '(min-width: 1280px)';

function useWideDesktopLayout() {
    const [wide, setWide] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(WIDE_DESKTOP_MEDIA_QUERY).matches;
    });

    useEffect(() => {
        const mq = window.matchMedia(WIDE_DESKTOP_MEDIA_QUERY);
        const onChange = () => setWide(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return wide;
}

/**
 * Top-level quick filters — user-configurable; xl adds popular extras (Option A-light).
 */
export default function PrimaryQuickFilterRow(props) {
    const wideDesktop = useWideDesktopLayout();
    const {
        selectedIds,
        toggleFilterOnBar,
        resetToDefaults,
    } = usePrimaryQuickFilterBar();

    const visibleIds = useMemo(
        () => resolveVisiblePrimaryQuickFilterIds(selectedIds, wideDesktop),
        [selectedIds, wideDesktop],
    );

    return (
        <div className="flex flex-col gap-1.5 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:flex-1">
            <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                {visibleIds.map((id) => {
                    const chip = resolveQuickFilterChip(id, props);
                    if (!chip) return null;
                    return (
                        <Chip
                            key={chip.id}
                            size="xs"
                            selected={chip.selected}
                            disabled={chip.disabled}
                            onClick={chip.onClick}
                            title={chip.title}
                        >
                            {chip.label}
                        </Chip>
                    );
                })}
            </div>
            <PrimaryQuickFilterCustomize
                selectedIds={selectedIds}
                onToggleFilter={toggleFilterOnBar}
                onResetDefaults={resetToDefaults}
            />
        </div>
    );
}
