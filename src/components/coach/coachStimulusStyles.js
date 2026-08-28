/** Shared stimulus styling for coach UI components — muted cd* tokens, left-border accents. */

const ZONE_PILL = 'border border-cdborder/50 text-cdmuted bg-cdborder/5';
const ACCENT_ZONE_PILL = 'border border-cdaccent/25 text-cdtext bg-cdborder/5';

export const STIMULUS_STYLES = {
    rest: {
        label: 'Rest',
        mobileLabel: 'Rest',
        border: 'border-l-cdborder/60',
        rowBg: '',
        badge: ZONE_PILL,
        accent: 'text-cdmuted',
        dot: 'bg-cdmuted/40',
    },
    recovery: {
        label: 'Recovery',
        mobileLabel: 'Rec',
        border: 'border-l-cdborder/60',
        rowBg: '',
        badge: ZONE_PILL,
        accent: 'text-cdmuted',
        dot: 'bg-cdmuted/50',
    },
    endurance: {
        label: 'Endurance',
        mobileLabel: 'Z2',
        border: 'border-l-cdborder/60',
        rowBg: '',
        badge: ZONE_PILL,
        accent: 'text-cdmuted',
        dot: 'bg-cdmuted/50',
    },
    sweetspot: {
        label: 'Sweetspot',
        mobileLabel: 'SS',
        border: 'border-l-cdaccent/40',
        rowBg: '',
        badge: ACCENT_ZONE_PILL,
        accent: 'text-cdtext',
        dot: 'bg-cdaccent/50',
    },
    threshold: {
        label: 'Threshold',
        mobileLabel: 'Thr',
        border: 'border-l-cdaccent/50',
        rowBg: '',
        badge: ACCENT_ZONE_PILL,
        accent: 'text-cdtext',
        dot: 'bg-cdaccent/60',
    },
    vo2: {
        label: 'VO2',
        mobileLabel: 'VO2',
        border: 'border-l-cdaccent/60',
        rowBg: '',
        badge: ACCENT_ZONE_PILL,
        accent: 'text-cdtext',
        dot: 'bg-cdaccent/70',
    },
    completed: {
        label: 'Done',
        mobileLabel: 'Done',
        border: 'border-l-cdborder/50',
        rowBg: '',
        badge: ZONE_PILL,
        accent: 'text-cdmuted',
        dot: 'bg-cdmuted/40',
    },
};

export function getStimulusStyle(stimulus) {
    return STIMULUS_STYLES[stimulus] || STIMULUS_STYLES.rest;
}
