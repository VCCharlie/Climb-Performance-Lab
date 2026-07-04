import React from 'react';
import { useActivityCardLayout } from '../../hooks/useMediaQuery';
import ActivityTable from './ActivityTable';
import ActivityCardList from './ActivityCardList';

/**
 * Responsive Activity Log: cards on mobile / touch / sub-lg viewports; table on large desktop.
 */
const ActivityLogView = (props) => {
    const useCardLayout = useActivityCardLayout();
    const bulkSelectionActive = (props.selectedActivityIds?.size ?? 0) > 0;
    if (useCardLayout) return <ActivityCardList {...props} bulkSelectionActive={bulkSelectionActive} />;
    return <ActivityTable {...props} />;
};

export default ActivityLogView;
