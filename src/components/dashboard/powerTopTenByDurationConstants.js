import { formatDateDDMMYYYY } from '../../utils/formatters';
import { TOP_TEN_POWER_DURATIONS } from '../../utils/powerDurationStandard';

/** @deprecated Prefer TOP_TEN_POWER_DURATIONS from utils/powerDurationStandard.js */
export const DURATION_TARGETS = TOP_TEN_POWER_DURATIONS;

export const COMPARE_OPTIONS = [
    { value: 'none', label: 'No comparison' },
    { value: 'previous', label: 'Previous period (same length)' },
    { value: 'days', label: 'N days before' },
    { value: 'custom', label: 'Custom date ranges' },
];

export function formatLongRange(bounds) {
    if (!bounds) return '';
    const a = formatDateDDMMYYYY(bounds.start);
    const b = formatDateDDMMYYYY(bounds.end);
    if (a === '-' || b === '-') return '';
    return `${a} — ${b}`;
}
