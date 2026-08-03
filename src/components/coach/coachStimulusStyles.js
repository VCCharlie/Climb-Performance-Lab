/** Shared stimulus styling for coach UI components. */

export const STIMULUS_STYLES = {
    rest: {
        label: 'Rest',
        border: 'border-cdborder',
        rowBg: '',
        badge: 'bg-cdborder/30 text-cdmuted',
        accent: 'text-cdmuted',
        dot: 'bg-cdmuted',
    },
    recovery: {
        label: 'Recovery',
        border: 'border-green-500/40',
        rowBg: 'bg-green-500/5',
        badge: 'bg-green-500/15 text-green-400',
        accent: 'text-green-400',
        dot: 'bg-green-400',
    },
    endurance: {
        label: 'Endurance',
        border: 'border-blue-500/40',
        rowBg: 'bg-blue-500/5',
        badge: 'bg-blue-500/15 text-blue-400',
        accent: 'text-blue-400',
        dot: 'bg-blue-400',
    },
    sweetspot: {
        label: 'Sweetspot',
        border: 'border-yellow-500/40',
        rowBg: 'bg-yellow-500/5',
        badge: 'bg-yellow-500/15 text-yellow-400',
        accent: 'text-yellow-400',
        dot: 'bg-yellow-400',
    },
    threshold: {
        label: 'Threshold',
        border: 'border-orange-500/40',
        rowBg: 'bg-orange-500/5',
        badge: 'bg-orange-500/15 text-orange-400',
        accent: 'text-orange-400',
        dot: 'bg-orange-400',
    },
    vo2: {
        label: 'VO2',
        border: 'border-red-500/40',
        rowBg: 'bg-red-500/5',
        badge: 'bg-red-500/15 text-red-400',
        accent: 'text-red-400',
        dot: 'bg-red-400',
    },
    completed: {
        label: 'Done',
        border: 'border-emerald-500/30',
        rowBg: 'bg-emerald-500/5',
        badge: 'bg-emerald-500/15 text-emerald-400',
        accent: 'text-emerald-400',
        dot: 'bg-emerald-400',
    },
};

export function getStimulusStyle(stimulus) {
    return STIMULUS_STYLES[stimulus] || STIMULUS_STYLES.rest;
}
