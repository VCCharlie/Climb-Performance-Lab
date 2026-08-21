/** Short column titles for narrow mobile layouts (full label on sm+). */
const HEADER_SHORT = {
    'Normalized power': 'Norm. P',
    'Average power': 'Avg P',
    'Average speed': 'Avg spd',
    'Moving time': 'Time',
    'Elevation gain': 'Elev.',
    'Elevation': 'Elev.',
    'Heart rate': 'HR',
    'Max heart rate': 'Max HR',
    'Max HR (peak)': 'Max HR',
    'Training stress': 'TSS',
    'Load (TSS)': 'TSS',
    'EF (NP÷HR)': 'EF',
    'Decoupling %': 'Dec',
    'Threshold drift %': 'Thr',
    'Race drift %': 'Race',
};

export function shortPlaygroundHeader(label) {
    if (!label) return '';
    if (HEADER_SHORT[label]) return HEADER_SHORT[label];
    return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

export const playgroundExplorerSortKeys = {
    label: 'label',
    x: 'x',
    y: 'y',
    color: 'color',
    rideCount: 'rideCount',
};

export const playgroundTableClass = 'w-full table-fixed text-left text-[11px] sm:text-sm';

export const playgroundThClass =
    'px-1.5 sm:px-3 py-1 sm:py-1.5 font-semibold text-[10px] sm:text-xs uppercase text-cdmuted leading-tight align-middle whitespace-nowrap';

export const playgroundTdClass =
    'px-1.5 sm:px-3 py-1 sm:py-1.5 align-middle tabular-nums';

export const playgroundTdTextClass = `${playgroundTdClass} text-cdtext min-w-0 max-w-0`;

export const playgroundTdMonoClass = `${playgroundTdClass} font-mono whitespace-nowrap`;

export const playgroundTdMutedClass = `${playgroundTdClass} text-cdmuted whitespace-nowrap`;
