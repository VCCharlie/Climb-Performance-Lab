/**
 * Linear regression helpers for explorer scatter trend lines.
 */

/**
 * @param {{ x: number, y: number }[]} points
 */
export function linearRegression(points) {
    const valid = (points || []).filter(
        (p) => p.x != null && p.y != null && !Number.isNaN(p.x) && !Number.isNaN(p.y),
    );
    if (valid.length < 2) return null;

    const n = valid.length;
    const sumX = valid.reduce((s, p) => s + p.x, 0);
    const sumY = valid.reduce((s, p) => s + p.y, 0);
    const sumXY = valid.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = valid.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (!denom) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

/**
 * Two endpoints for drawing a trend line across the scatter X range.
 * @param {{ x: number, y: number }[]} points
 */
export function buildTrendLineEndpoints(points) {
    const reg = linearRegression(points);
    if (!reg) return [];

    const xs = points.map((p) => p.x).filter((x) => x != null && !Number.isNaN(x));
    if (!xs.length) return [];

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const round = (v) => Math.round(v * 100) / 100;

    return [
        { x: minX, y: round(reg.slope * minX + reg.intercept) },
        { x: maxX, y: round(reg.slope * maxX + reg.intercept) },
    ];
}

/**
 * @param {{ x: number, y: number }[]} points
 */
export function computeAxisDomain(points, paddingPct = 0.05) {
    const xs = points.map((p) => p.x).filter((v) => v != null && v > 0);
    const ys = points.map((p) => p.y).filter((v) => v != null && v > 0);
    if (!xs.length || !ys.length) return null;

    const pad = (min, max) => {
        const span = max - min || 1;
        const padAmt = span * paddingPct;
        return [Math.max(0, min - padAmt), max + padAmt];
    };

    return {
        x: pad(Math.min(...xs), Math.max(...xs)),
        y: pad(Math.min(...ys), Math.max(...ys)),
    };
}
