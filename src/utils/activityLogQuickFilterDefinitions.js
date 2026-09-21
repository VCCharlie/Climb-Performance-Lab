/**
 * Shared quick-filter chip definitions for Activity Log (drawer + primary bar).
 */

/** @typedef {'time' | 'power' | 'load' | 'ride' | 'meta' | 'strava'} QuickFilterGroup */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   title?: string,
 *   group: QuickFilterGroup,
 *   defaultOnBar?: boolean,
 *   desktopExtra?: boolean,
 * }} QuickFilterDefinition
 */

/** @type {QuickFilterDefinition[]} */
export const ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS = [
    { id: 'this_week', label: 'This week', group: 'time', defaultOnBar: true },
    { id: 'last_7d', label: 'Last 7d', group: 'time', desktopExtra: true },
    { id: 'last_14d', label: 'Last 14d', group: 'time' },
    { id: 'last_30d', label: 'Last 30d', group: 'time', defaultOnBar: true },
    { id: 'with_power', label: 'With power', group: 'power', defaultOnBar: true },
    { id: 'no_power', label: 'No power', group: 'power' },
    { id: 'high_load', label: 'High load', title: 'Load (TSS) > 120', group: 'load', defaultOnBar: true },
    { id: 'long_ride', label: 'Long ride', title: 'Distance > 100 km', group: 'ride', defaultOnBar: true },
    { id: 'has_tag', label: 'Has tag', title: 'Activities with at least one tag', group: 'meta', desktopExtra: true },
    { id: 'no_hr', label: 'No HR', title: 'Avg HR missing or zero', group: 'meta' },
    { id: 'strava_link', label: 'Strava link', group: 'strava', desktopExtra: true },
    { id: 'no_strava_link', label: 'No Strava link', title: 'Activities without a linked Strava id', group: 'strava' },
    {
        id: 'possible_duplicates',
        label: 'Possible duplicates',
        title: 'Show rows that match another activity on the same day (same title + duration)',
        group: 'meta',
    },
];

export const ACTIVITY_LOG_QUICK_FILTER_IDS = ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS.map((d) => d.id);

export const QUICK_FILTER_GROUP_LABELS = Object.freeze({
    time: 'Time',
    power: 'Power',
    load: 'Load',
    ride: 'Ride shape',
    meta: 'Tags & data',
    strava: 'Strava',
});

const DEF_BY_ID = Object.fromEntries(ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS.map((d) => [d.id, d]));

/**
 * @param {string} id
 */
export function getQuickFilterDefinition(id) {
    return DEF_BY_ID[id] || null;
}

/**
 * Resolve chip UI state for a quick filter id.
 * @param {string} id
 * @param {Record<string, unknown>} props
 * @returns {{ id: string, label: string, title?: string, selected: boolean, disabled?: boolean, onClick: () => void } | null}
 */
export function resolveQuickFilterChip(id, props) {
    const def = getQuickFilterDefinition(id);
    if (!def) return null;

    switch (id) {
        case 'this_week':
            return {
                ...def,
                selected: Boolean(props.thisWeekOnly),
                onClick: () => {
                    props.onThisWeekOnlyChange?.((v) => !v);
                    props.onRollingDaysChange?.(null);
                },
            };
        case 'last_7d':
            return {
                ...def,
                selected: props.rollingDays === 7,
                onClick: () => {
                    props.onRollingDaysChange?.((cur) => (cur === 7 ? null : 7));
                    props.onThisWeekOnlyChange?.(false);
                },
            };
        case 'last_14d':
            return {
                ...def,
                selected: props.rollingDays === 14,
                onClick: () => {
                    props.onRollingDaysChange?.((cur) => (cur === 14 ? null : 14));
                    props.onThisWeekOnlyChange?.(false);
                },
            };
        case 'last_30d':
            return {
                ...def,
                selected: props.rollingDays === 30,
                onClick: () => {
                    props.onRollingDaysChange?.((cur) => (cur === 30 ? null : 30));
                    props.onThisWeekOnlyChange?.(false);
                },
            };
        case 'with_power':
            return {
                ...def,
                selected: Boolean(props.withPowerOnly),
                onClick: () => {
                    props.onWithPowerOnlyChange?.((v) => {
                        const next = !v;
                        if (next) props.onNoPowerOnlyChange?.(false);
                        return next;
                    });
                },
            };
        case 'no_power':
            return {
                ...def,
                selected: Boolean(props.noPowerOnly),
                onClick: () => {
                    props.onNoPowerOnlyChange?.((v) => {
                        const next = !v;
                        if (next) props.onWithPowerOnlyChange?.(false);
                        return next;
                    });
                },
            };
        case 'high_load':
            return {
                ...def,
                selected: Boolean(props.highLoadOnly),
                onClick: () => props.onHighLoadOnlyChange?.((v) => !v),
            };
        case 'long_ride':
            return {
                ...def,
                selected: Boolean(props.longRideOnly),
                onClick: () => props.onLongRideOnlyChange?.((v) => !v),
            };
        case 'has_tag':
            return {
                ...def,
                selected: Boolean(props.hasTagOnly),
                onClick: () => props.onHasTagOnlyChange?.((v) => !v),
            };
        case 'no_hr':
            return {
                ...def,
                selected: Boolean(props.missingHrOnly),
                onClick: () => props.onMissingHrOnlyChange?.((v) => !v),
            };
        case 'strava_link':
            return {
                ...def,
                selected: Boolean(props.stravaLinkedOnly),
                disabled: !props.stravaGetToken,
                onClick: () => {
                    props.onStravaLinkedOnlyChange?.((v) => {
                        const next = !v;
                        if (next) props.onNoStravaLinkOnlyChange?.(false);
                        return next;
                    });
                },
            };
        case 'no_strava_link':
            return {
                ...def,
                selected: Boolean(props.noStravaLinkOnly),
                onClick: () => {
                    props.onNoStravaLinkOnlyChange?.((v) => {
                        const next = !v;
                        if (next) props.onStravaLinkedOnlyChange?.(false);
                        return next;
                    });
                },
            };
        case 'possible_duplicates':
            return {
                ...def,
                selected: Boolean(props.possibleDuplicatesOnly),
                onClick: () => props.onPossibleDuplicatesOnlyChange?.((v) => !v),
            };
        default:
            return null;
    }
}
