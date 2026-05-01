export const DURATION_TARGETS = [
    { sec: 60, label: '1 min' },
    { sec: 300, label: '5 min' },
    { sec: 600, label: '10 min' },
    { sec: 1200, label: '20 min' },
    { sec: 3600, label: '60 min' },
    { sec: 7200, label: '120 min' },
];

export const COMPARE_OPTIONS = [
    { value: 'none', label: 'No comparison' },
    { value: 'previous', label: 'Previous period (same length)' },
    { value: 'days', label: 'N days before' },
    { value: 'custom', label: 'Custom date ranges' },
];

export function formatLongRange(bounds) {
    if (!bounds) return '';
    const opts = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
    const a = bounds.start.toLocaleDateString('en-GB', opts);
    const b = bounds.end.toLocaleDateString('en-GB', opts);
    return `${a} — ${b}`;
}
