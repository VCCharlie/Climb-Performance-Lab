/**
 * Bar fill colors for Dashboard Compare year bars (value-based gradient).
 * Excel-style 3-color scale: green (min) → yellow (mid) → red (max).
 */

/** @type {[number, number, number]} Excel conditional-formatting green */
const EXCEL_LOW_RGB = [99, 190, 123];
/** @type {[number, number, number]} */
const EXCEL_MID_RGB = [255, 235, 132];
/** @type {[number, number, number]} Excel conditional-formatting red */
const EXCEL_HIGH_RGB = [248, 105, 107];

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerpChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
}

/**
 * @param {[number, number, number]} from
 * @param {[number, number, number]} to
 * @param {number} t
 * @returns {string}
 */
function lerpRgb(from, to, t) {
    const r = lerpChannel(from[0], to[0], t);
    const g = lerpChannel(from[1], to[1], t);
    const b = lerpChannel(from[2], to[2], t);
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * @param {number} normalizedValue 0 (lowest in set) … 1 (highest)
 * @returns {string}
 */
export function compareYearBarColor(normalizedValue) {
    const t = Math.min(1, Math.max(0, Number(normalizedValue) || 0));

    if (t <= 0.5) {
        return lerpRgb(EXCEL_LOW_RGB, EXCEL_MID_RGB, t / 0.5);
    }
    return lerpRgb(EXCEL_MID_RGB, EXCEL_HIGH_RGB, (t - 0.5) / 0.5);
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

/**
 * @param {string} rgb
 * @returns {[number, number, number] | null}
 */
export function parseCompareBarRgb(rgb) {
    const match = (rgb || '').match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}
