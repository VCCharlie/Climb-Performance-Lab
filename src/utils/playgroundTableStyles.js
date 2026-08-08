/** Short column titles for narrow mobile layouts (full label on sm+). */
const HEADER_SHORT = {
    'Normalized power': 'Norm. P',
    'Average power': 'Avg P',
    'Moving time': 'Time',
    'Elevation gain': 'Elev.',
    'Heart rate': 'HR',
    'Max heart rate': 'Max HR',
    'Training stress': 'TSS',
};

export function shortPlaygroundHeader(label) {
    if (!label) return '';
    if (HEADER_SHORT[label]) return HEADER_SHORT[label];
    return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

export const playgroundTableClass = 'w-full table-fixed text-left text-[11px] sm:text-sm';

export const playgroundThClass =
    'px-1.5 sm:px-3 py-1.5 sm:py-2 font-semibold text-[10px] sm:text-xs uppercase text-cdmuted break-words leading-tight align-bottom';

export const playgroundTdClass =
    'px-1.5 sm:px-3 py-1 sm:py-1.5 break-words align-top tabular-nums';

export const playgroundTdTextClass = `${playgroundTdClass} text-cdtext`;

export const playgroundTdMonoClass = `${playgroundTdClass} font-mono`;

export const playgroundTdMutedClass = `${playgroundTdClass} text-cdmuted`;
