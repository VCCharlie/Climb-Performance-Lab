/**
 * Default date range for Intervals.icu sync UI.
 * @param {number} [daysBack=14]
 */
export function buildDefaultSyncDates(daysBack = 14) {
    const safeDays = Number.isFinite(Number(daysBack)) && Number(daysBack) > 0
        ? Math.round(Number(daysBack))
        : 14;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - safeDays);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}
