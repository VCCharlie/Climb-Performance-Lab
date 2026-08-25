/**
 * Lightweight typography scale for Climb Performance Lab.
 * Font family: Barlow (set on :root in index.css). Use tabular-nums for metrics — not font-mono.
 *
 * | Token            | Use case                          | Tailwind equivalent        |
 * |------------------|-----------------------------------|----------------------------|
 * | cdTypeSection    | Card / panel title                | text-lg font-bold          |
 * | cdTypeSubsection | Collapsible header, filter label  | text-xs font-semibold caps |
 * | cdTypeBody       | Body copy, table cells            | text-sm                    |
 * | cdTypeLabel      | Pills, badges, field labels       | text-[10px] uppercase      |
 * | cdTypeCaption    | Helper / info text                | text-[10px] muted          |
 * | cdTypeNumeric    | Metrics, scores (Barlow tabular)  | tabular-nums               |
 */

export const cdTypeSection = 'text-lg font-bold text-cdtext';

export const cdTypeSubsection =
    'text-xs font-semibold uppercase tracking-wide text-cdtext';

export const cdTypeBody = 'text-sm text-cdtext';

export const cdTypeLabel =
    'text-[10px] font-semibold uppercase tracking-wide text-cdmuted';

export const cdTypeCaption = 'text-[10px] text-cdmuted leading-snug';

export const cdTypeNumeric = 'tabular-nums';

/** Collapsible accordion chevron — always align right of header row. */
export const cdCollapsibleChevronClass = 'text-cdmuted shrink-0 cd-transition';
