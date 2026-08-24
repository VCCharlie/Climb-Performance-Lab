import React, { useCallback, useEffect, useState } from 'react';
import NlDateInput from '../NlDateInput';
import { inputBaseClass, cn } from './index';
import {
    isValidCustomDateRange,
    isCustomDateApplyEnabled,
    normalizeYmd,
    resolveDraftYmd,
} from '../../utils/customDateRange';

/**
 * Start/end date inputs with Apply and auto-apply when both dates are valid.
 */
export default function CustomDateRangeFields({
    startYmd = '',
    endYmd = '',
    onApply,
    defaultEndYmd = '',
    compact = false,
    className,
    startAriaLabel = 'Start date (dd/mm/yyyy)',
    endAriaLabel = 'End date (dd/mm/yyyy)',
    showApply = true,
}) {
    const [draftStart, setDraftStart] = useState(startYmd);
    const [draftEnd, setDraftEnd] = useState(endYmd);

    useEffect(() => {
        setDraftStart(startYmd);
    }, [startYmd]);

    useEffect(() => {
        setDraftEnd(endYmd);
    }, [endYmd]);

    const resolvedEnd = draftEnd || defaultEndYmd;
    const appliedEnd = endYmd || defaultEndYmd;
    const applyEnabled = isCustomDateApplyEnabled(draftStart, resolvedEnd);

    const applyRange = useCallback(() => {
        if (!isValidCustomDateRange(draftStart, resolvedEnd)) return;
        onApply(resolveDraftYmd(draftStart), resolveDraftYmd(resolvedEnd));
    }, [draftStart, resolvedEnd, onApply]);

    const tryAutoApply = useCallback((nextStart, nextEnd) => {
        const end = nextEnd || defaultEndYmd;
        if (!isValidCustomDateRange(nextStart, end)) return;
        const nextStartNorm = resolveDraftYmd(nextStart);
        const nextEndNorm = resolveDraftYmd(end);
        if (nextStartNorm === normalizeYmd(startYmd) && nextEndNorm === normalizeYmd(appliedEnd)) {
            return;
        }
        onApply(nextStartNorm, nextEndNorm);
    }, [appliedEnd, defaultEndYmd, onApply, startYmd]);

    const handleStartChange = useCallback((iso) => {
        setDraftStart(iso);
        tryAutoApply(iso, draftEnd);
    }, [draftEnd, tryAutoApply]);

    const handleEndChange = useCallback((iso) => {
        setDraftEnd(iso);
        tryAutoApply(draftStart, iso);
    }, [draftStart, tryAutoApply]);

    const inputClass = cn(
        inputBaseClass,
        compact ? 'text-[10px] py-0.5' : 'text-xs py-1',
        'flex-1 min-w-[6.5rem]',
    );

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <NlDateInput
                value={draftStart}
                onChange={handleStartChange}
                className={inputClass}
                aria-label={startAriaLabel}
            />
            <span className="text-cdmuted text-[10px] shrink-0">–</span>
            <NlDateInput
                value={draftEnd}
                onChange={handleEndChange}
                placeholder={defaultEndYmd ? undefined : 'dd-mm-jjjj'}
                className={inputClass}
                aria-label={endAriaLabel}
            />
            {showApply ? (
                <button
                    type="button"
                    onClick={applyRange}
                    disabled={!applyEnabled}
                    className={cn(
                        'shrink-0 font-semibold uppercase tracking-wide rounded-cdmd border cd-focus-ring cd-transition',
                        compact ? 'px-2 py-0.5 text-[10px] min-h-7' : 'px-2.5 py-1 text-[10px] min-h-8',
                        applyEnabled
                            ? 'border-cdprimary bg-cdprimarycontainer text-cdonprimarycontainer hover:opacity-90'
                            : 'border-cdborder/60 text-cdmuted opacity-60 cursor-not-allowed',
                    )}
                >
                    Apply
                </button>
            ) : null}
        </div>
    );
}
