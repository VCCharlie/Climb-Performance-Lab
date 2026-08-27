import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
} from 'react';
import { findDuplicatesInList } from '../utils';
import { filterStoredDuplicatePairs } from '../utils/duplicateResolutions';
import { useConfirm } from './ConfirmContext';
import { useToast } from './ToastContext';

const DuplicatePromptContext = createContext(null);

/**
 * Lets Intervals sync (app-level provider) prompt for duplicate review
 * using the DataHub DuplicateResolver UI when mounted.
 */
export function DuplicatePromptProvider({ children }) {
    const confirm = useConfirm();
    const { showToast } = useToast();
    const openResolverRef = useRef(null);

    const registerOpenDuplicateResolver = useCallback((openFn) => {
        openResolverRef.current = openFn;
        return () => {
            if (openResolverRef.current === openFn) {
                openResolverRef.current = null;
            }
        };
    }, []);

    const promptDuplicatesAfterImport = useCallback(async (activityList) => {
        const foundDups = filterStoredDuplicatePairs(findDuplicatesInList(activityList));
        if (foundDups.length === 0) return;

        const shouldReview = await confirm({
            title: 'Possible duplicates',
            message: `Import finished with ${foundDups.length} possible duplicate pair(s). Open the duplicate resolver to review them now?`,
            confirmLabel: 'Review duplicates',
            cancelLabel: 'Later',
        });

        if (shouldReview && openResolverRef.current) {
            openResolverRef.current(foundDups);
        } else if (!shouldReview) {
            showToast(
                `${foundDups.length} possible duplicate pair(s) detected. Use Find duplicates in the activity log when you are ready to review.`,
                { variant: 'info', durationMs: 9000 },
            );
        } else {
            showToast(
                `${foundDups.length} possible duplicate pair(s) detected. Open the Activities tab to review them.`,
                { variant: 'info', durationMs: 9000 },
            );
        }
    }, [confirm, showToast]);

    const value = useMemo(() => ({
        registerOpenDuplicateResolver,
        promptDuplicatesAfterImport,
    }), [registerOpenDuplicateResolver, promptDuplicatesAfterImport]);

    return (
        <DuplicatePromptContext.Provider value={value}>
            {children}
        </DuplicatePromptContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with provider
export function useDuplicatePrompt() {
    const ctx = useContext(DuplicatePromptContext);
    if (!ctx) {
        throw new Error('useDuplicatePrompt requires DuplicatePromptProvider');
    }
    return ctx;
}

/** Safe when provider is absent (e.g. tests). */
export function useDuplicatePromptOptional() { // eslint-disable-line react-refresh/only-export-components -- optional hook
    return useContext(DuplicatePromptContext);
}
