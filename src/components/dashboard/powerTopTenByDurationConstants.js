export const DURATION_TARGETS = [
    { sec: 60, label: '1 min' },
    { sec: 300, label: '5 min' },
    { sec: 600, label: '10 min' },
    { sec: 1200, label: '20 min' },
    { sec: 3600, label: '60 min' },
    { sec: 7200, label: '120 min' },
];

export const COMPARE_OPTIONS = [
    { value: 'none', label: 'Geen vergelijking' },
    { value: 'previous', label: 'Vorige even lange periode' },
    { value: 'days', label: 'Voorgaande N dagen' },
    { value: 'custom', label: 'Aangepaste periodes (data)' },
];

export function formatLongRange(bounds) {
    if (!bounds) return '';
    const opts = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
    const a = bounds.start.toLocaleDateString('nl-NL', opts);
    const b = bounds.end.toLocaleDateString('nl-NL', opts);
    return `${a} — ${b}`;
}
