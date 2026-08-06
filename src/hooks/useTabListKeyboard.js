import { useCallback } from 'react';

/**
 * WAI-ARIA tabs keyboard pattern: ArrowLeft/Right, Home, End.
 */
export function useTabListKeyboard(tabIds, activeId, onSelect, { orientation = 'horizontal' } = {}) {
    const onKeyDown = useCallback((event) => {
        if (!tabIds?.length) return;

        const currentIndex = tabIds.indexOf(activeId);
        if (currentIndex < 0) return;

        const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

        let nextIndex = null;

        if (event.key === prevKey) {
            event.preventDefault();
            nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        } else if (event.key === nextKey) {
            event.preventDefault();
            nextIndex = (currentIndex + 1) % tabIds.length;
        } else if (event.key === 'Home') {
            event.preventDefault();
            nextIndex = 0;
        } else if (event.key === 'End') {
            event.preventDefault();
            nextIndex = tabIds.length - 1;
        }

        if (nextIndex == null) return;
        const nextId = tabIds[nextIndex];
        onSelect(nextId);
        document.getElementById(`tab-${nextId}`)?.focus?.();
    }, [tabIds, activeId, onSelect, orientation]);

    return onKeyDown;
}
