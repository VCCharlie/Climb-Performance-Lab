/**
 * Bar fill colors for Dashboard Compare year bars (value-based gradient).
 */

/**
 * @param {number} normalizedValue 0 (lowest in set) … 1 (highest)
 * @param {{ isCurrentYear?: boolean }} [opts]
 * @returns {string}
 */
export function compareYearBarColor(normalizedValue, opts = {}) {
    const t = Math.min(1, Math.max(0, Number(normalizedValue) || 0));

    if (opts.isCurrentYear) {
        const mix = Math.round(38 + t * 62);
        return `color-mix(in srgb, var(--cd-accent, #ea580c) ${mix}%, var(--cd-surface, #334155) ${100 - mix}%)`;
    }

    const lightness = 74 - t * 36;
    const saturation = 38 + t * 32;
    return `hsl(215, ${saturation}%, ${lightness}%)`;
}

/**
 * @param {number[]} values
 * @returns {{ min: number, max: number, range: number }}
 */
export function compareYearValueSpan(values) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
        const n = Number(v) || 0;
        if (n < min) min = n;
        if (n > max) max = n;
    }
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 0;
    const range = max - min;
    return { min, max, range: range > 0 ? range : 1 };
}

/**
 * @param {number} value
 * @param {{ min: number, range: number }} span
 * @returns {number}
 */
export function normalizeCompareYearValue(value, span) {
    const v = Number(value) || 0;
    return (v - span.min) / span.range;
}
