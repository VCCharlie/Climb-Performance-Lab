/**
 * Shared helpers for the fluid AI coach engine.
 */

import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';

export function movingTimeSec(val) {
    if (val == null) return 0;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string') {
        const parts = val.split(':').map((p) => Number(p));
        if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        const n = parseFloat(val.replace(',', '.'));
        return Number.isNaN(n) ? 0 : n;
    }
    return 0;
}

export function todayYmd() {
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export function filterActivitiesInRange(activities, startYmd, endYmd) {
    return (activities || []).filter((a) => {
        const ymd = normalizeDate(a.date);
        return ymd && ymd.length >= 10 && ymd >= startYmd && ymd <= endYmd;
    });
}

export function sumTss(activities) {
    return activities.reduce((acc, a) => acc + (Number(a.load) || 0), 0);
}

export function bestInRange(activities, key) {
    return activities.reduce((max, a) => Math.max(max, Number(a[key]) || 0), 0);
}

export function activityIF(activity, ftp) {
    if (!ftp || ftp <= 0) return null;
    const watts = Number(activity.norm_power) || Number(activity.avg_power) || 0;
    if (!watts || watts <= 0) return null;
    return watts / ftp;
}

export function classifyIF(ifVal) {
    if (ifVal == null) return 'unknown';
    if (ifVal < 0.75) return 'z1z2';
    if (ifVal < 0.88) return 'tempo';
    if (ifVal < 0.95) return 'sweetspot';
    if (ifVal <= 1.05) return 'threshold';
    return 'vo2';
}

export function weeksAgoYmd(weeks, endYmd = todayYmd()) {
    return addDaysToYmd(endYmd, -weeks * 7);
}

export function weeklyTssTarget(hoursPerWeek) {
    if (hoursPerWeek <= 4) return 200;
    if (hoursPerWeek <= 5) return 250;
    if (hoursPerWeek <= 6) return 310;
    return 360;
}
