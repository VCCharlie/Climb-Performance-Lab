/**
 * Lightweight typography scale for Climb Performance Lab.
 * Font family: Barlow (set on :root in index.css). Use tabular-nums for metrics — not font-mono.
 *
 * | Token              | Use case                          | Tailwind equivalent        |
 * |--------------------|-----------------------------------|----------------------------|
 * | cdTypePageTitle    | Tab page shell h2                 | text-xl md:text-2xl bold   |
 * | cdTypePageSubtitle | Tab page shell subtitle           | text-sm muted              |
 * | cdTypeSection      | Card / panel title                | text-lg font-bold          |
 * | cdTypeSubsection   | Collapsible header, filter label  | text-xs font-semibold caps |
 * | cdTypeBody         | Body copy, table cells            | text-sm                    |
 * | cdTypeLabel        | Pills, badges, field labels       | text-[10px] uppercase      |
 * | cdTypeCaption      | Helper / info text                | text-[10px] muted          |
 * | cdTypeMetric       | Bold numeric readout              | text-sm bold tabular-nums  |
 * | cdTypeMetricLg     | Hero metric (watts, scores)       | text-lg bold tabular-nums  |
 * | cdTypeNumeric      | Metrics alignment only            | tabular-nums               |
 */

export const cdTypePageTitle = 'text-xl md:text-2xl font-bold text-cdtext tracking-tight';

export const cdTypePageSubtitle = 'text-sm text-cdmuted mt-0.5';

export const cdTypeSection = 'text-lg font-bold text-cdtext';

export const cdTypeSubsection =
    'text-xs font-semibold uppercase tracking-wide text-cdtext';

export const cdTypeBody = 'text-sm text-cdtext';

export const cdTypeLabel =
    'text-[10px] font-semibold uppercase tracking-wide text-cdmuted';

export const cdTypeCaption = 'text-[10px] text-cdmuted leading-snug';

export const cdTypeMetric = 'text-sm font-bold tabular-nums text-cdtext';

export const cdTypeMetricLg = 'text-lg font-bold tabular-nums text-cdtext';

export const cdTypeNumeric = 'tabular-nums';

/** Collapsible accordion chevron — always align right of header row. */
export const cdCollapsibleChevronClass = 'text-cdmuted shrink-0 cd-transition';
