/**
 * CTL / ATL / TSB forecast from actual load + planned fluid week sessions.
 */

import { normalizeDate } from '../formatters';
import { addDaysToYmd } from '../dashboardVolumeTotals';
import { calculateFitnessMetrics } from '../formTabMetrics';
import { todayYmd } from './coachHelpers';
import { resolveSessionTssForForecast } from './coachSessionTss';

const CTL_DAYS = 42;
const ATL_DAYS = 7;

function round1(n) {
    return Math.round(n * 10) / 10;
}

function ymdToLocalTime(ymd) {
    if (!ymd || ymd.length < 10) return 0;
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
}

/**
 * @param {object[]} activities
 * @returns {Record<string, number>}
 */
function buildActualTssByDate(activities) {
    const map = {};
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        const load = Number(a?.load) || 0;
        if (!ymd || load <= 0) continue;
        map[ymd] = (map[ymd] || 0) + load;
    }
    return map;
}

/**
 * @param {number} ctl
 * @param {number} atl
 * @param {string} startYmd — first day to project (inclusive)
 * @param {string} endYmd
 * @param {Record<string, number>} dailyTss
 * @returns {object[]}
 */
function projectForward(ctl, atl, startYmd, endYmd, dailyTss) {
    const ctlFactor = 1 - Math.exp(-1 / CTL_DAYS);
    const atlFactor = 1 - Math.exp(-1 / ATL_DAYS);
    const rows = [];
    let current = startYmd;

    while (current <= endYmd) {
        const tss = dailyTss[current] || 0;
        ctl += ctlFactor * (tss - ctl);
        atl += atlFactor * (tss - atl);
        rows.push({
            date: current,
            dateNum: ymdToLocalTime(current),
            ctl: round1(ctl),
            atl: round1(atl),
            tsb: round1(ctl - atl),
            projected: true,
            plannedTss: tss,
        });
        const next = addDaysToYmd(current, 1);
        if (!next) break;
        current = next;
    }

    return rows;
}

/**
 * @param {object} params
 * @param {object[]} params.activities
 * @param {object[]} params.week1Sessions
 * @param {object[]} [params.week2Sessions]
 * @param {number} [params.weeklyHours]
 * @param {string} [params.referenceYmd]
 * @param {number} [params.historyDays=28]
 * @param {number} [params.forecastDays=14]
 * @returns {{ chartData: object[], summary: object }}
 */
export function buildFitnessForecast({
    activities,
    week1Sessions,
    week2Sessions = [],
    horizonSessions = null,
    weeklyHours = 5,
    referenceYmd = todayYmd(),
    historyDays = 28,
    forecastDays = 14,
}) {
    const historical = calculateFitnessMetrics(activities, { endYmd: referenceYmd });
    const actualTssByDate = buildActualTssByDate(activities);

    const historyStart = addDaysToYmd(referenceYmd, -(historyDays - 1));
    const actualHistory = historical
        .filter((row) => row.date >= historyStart && row.date <= referenceYmd)
        .map((row) => ({
            ...row,
            projected: false,
            plannedTss: actualTssByDate[row.date] || 0,
        }));

    const latest = actualHistory.length > 0
        ? actualHistory[actualHistory.length - 1]
        : historical[historical.length - 1] || { ctl: 0, atl: 0, tsb: 0 };

    const allSessions = horizonSessions?.length
        ? horizonSessions
        : [...(week1Sessions || []), ...(week2Sessions || [])];
    const forecastEnd = addDaysToYmd(referenceYmd, forecastDays);
    const plannedTssByDate = {};

    for (const session of allSessions) {
        if (!session?.date || session.date < referenceYmd) continue;
        if (session.date > forecastEnd) continue;
        const tss = resolveSessionTssForForecast(session, weeklyHours, actualTssByDate);
        if (session.completed && actualTssByDate[session.date]) {
            plannedTssByDate[session.date] = actualTssByDate[session.date];
        } else if (!session.completed) {
            plannedTssByDate[session.date] = tss;
        }
    }

    const projectionStart = addDaysToYmd(referenceYmd, 1);
    const projected = projectionStart <= forecastEnd
        ? projectForward(
            latest.ctl ?? 0,
            latest.atl ?? 0,
            projectionStart,
            forecastEnd,
            plannedTssByDate,
        )
        : [];

    const todayRow = {
        ...latest,
        date: referenceYmd,
        dateNum: ymdToLocalTime(referenceYmd),
        projected: false,
        plannedTss: actualTssByDate[referenceYmd] || 0,
    };

    const chartData = [
        ...actualHistory.filter((r) => r.date < referenceYmd),
        todayRow,
        ...projected,
    ];

    const endProjected = projected.length > 0 ? projected[projected.length - 1] : todayRow;
    const minTsb = projected.length
        ? Math.min(...projected.map((r) => r.tsb))
        : todayRow.tsb;
    const maxTsb = projected.length
        ? Math.max(...projected.map((r) => r.tsb))
        : todayRow.tsb;

    return {
        chartData,
        summary: {
            currentTsb: todayRow.tsb,
            projectedEndTsb: endProjected.tsb,
            projectedEndCtl: endProjected.ctl,
            projectedEndAtl: endProjected.atl,
            forecastDays,
            minTsb: round1(minTsb),
            maxTsb: round1(maxTsb),
            plannedSessions: allSessions.filter((s) => s.date >= referenceYmd && !s.completed).length,
        },
    };
}

/**
 * End-of-week TSB after applying planned sessions from today through Sunday.
 * @param {object} params
 * @returns {number}
 */
export function projectWeekEndTsb({ activities, sessions, weeklyHours, referenceYmd = todayYmd() }) {
    const mondayYmd = sessions?.[0]?.date;
    const sundayYmd = sessions?.[sessions.length - 1]?.date;
    if (!mondayYmd || !sundayYmd) return 0;

    const { chartData } = buildFitnessForecast({
        activities,
        week1Sessions: sessions,
        weeklyHours,
        referenceYmd,
        historyDays: 14,
        forecastDays: Math.max(1, Math.ceil(
            (new Date(`${sundayYmd}T12:00:00`).getTime() - new Date(`${referenceYmd}T12:00:00`).getTime())
            / (1000 * 60 * 60 * 24),
        )),
    });

    const sundayRow = chartData.find((r) => r.date === sundayYmd);
    return sundayRow?.tsb ?? chartData[chartData.length - 1]?.tsb ?? 0;
}
