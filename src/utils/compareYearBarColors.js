/**
 * Bar fill colors for Dashboard Compare year bars (value-based gradient).
 * Low volume → green, high volume → red (readable at a glance).
 */

/**
 * @param {number} normalizedValue 0 (lowest in set) … 1 (highest)
 * @returns {string}
 */
export function compareYearBarColor(normalizedValue) {
    const t = Math.min(1, Math.max(0, Number(normalizedValue) || 0));

    const hue = 142 - t * 138;
    const saturation = 48 + t * 22;
    const lightness = 46 - t * 8;

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
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
 * @param {string} hsl
 * @returns {number | null}
 */
export function parseCompareBarHue(hsl) {
    const match = (hsl || '').match(/hsl\(\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
}
