/**
 * Symmetrische datumvensters voor Dashboard (o.a. vergelijking vorige periode).
 * Eindigt op referenceEndDate (EOD); start = zelfde rolling/cutoff als site-preset.
 */

/**
 * @returns {{ start: Date, end: Date } | null}
 */
export function getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate) {
    const end = referenceEndDate ? new Date(referenceEndDate) : new Date();
    end.setHours(23, 59, 59, 999);

    if (timeRange === 'Custom') {
        if (!customStart) {
            const startAll = new Date('2000-01-01');
            startAll.setHours(0, 0, 0, 0);
            return { start: startAll, end };
        }
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        const endCustom = customEnd ? new Date(customEnd) : new Date();
        endCustom.setHours(23, 59, 59, 999);
        return { start, end: endCustom };
    }

    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    if (timeRange === '1M') start.setMonth(start.getMonth() - 1);
    else if (timeRange === '3M') start.setMonth(start.getMonth() - 3);
    else if (timeRange === '6M') start.setMonth(start.getMonth() - 6);
    else if (timeRange === '1Y') start.setFullYear(start.getFullYear() - 1);
    else if (timeRange === '3Y') start.setFullYear(start.getFullYear() - 3);
    else if (timeRange === '6Y') start.setFullYear(start.getFullYear() - 6);
    else if (timeRange === 'ALL') start.setTime(new Date('2000-01-01').getTime());
    else start.setMonth(start.getMonth() - 12);

    return { start, end };
}

export function filterActivitiesInBounds(activities, bounds) {
    if (!bounds || !activities?.length) return [];
    return activities.filter((a) => {
        const d = new Date(a.date);
        return !Number.isNaN(d.getTime()) && d >= bounds.start && d <= bounds.end;
    });
}

/**
 * Zelfde lengte als huidig venster, direct ervoor (eindigt net voor bounds.start).
 */
export function previousWindowBounds(bounds) {
    if (!bounds) return null;
    const len = bounds.end.getTime() - bounds.start.getTime();
    if (len <= 0) return null;
    const prevEnd = new Date(bounds.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - len);
    return { start: prevStart, end: prevEnd };
}

/**
 * N dagen direct vóór bounds.start (start 00:00, eind dag ervoor EOD — compacte kalenderdagen).
 */
export function compareDaysBeforeWindow(bounds, days) {
    if (!bounds || days == null || days <= 0) return null;
    const prevEnd = new Date(bounds.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));
    prevStart.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
}
