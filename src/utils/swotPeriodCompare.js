/**
 * Tweede tijdssnede: gekozen periode vergelijken met (1) directe voorganger zelfde lengte,
 * (2) het deel van het rollende jaar vóór de huidige periode (bv. laatste maand vs ~11 maanden ervoor).
 */

const MS_DAY = 86400000;

function movingTimeToSeconds(val) {
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

function formatRangeNl(start, end, fmtOpts) {
    return `${start.toLocaleDateString('nl-NL', fmtOpts)} – ${end.toLocaleDateString('nl-NL', fmtOpts)}`;
}

/**
 * @param {Array} activities
 * @param {Date} rangeStart
 * @param {Date} rangeEnd  — inclusief (zelfde semantiek als AICoach: activity.date tussen start en end)
 * @param {number} ftp
 */
export function summarizeActivityWindow(activities, rangeStart, rangeEnd, ftp) {
    const list = activities.filter((a) => {
        const d = new Date(a.date);
        return d >= rangeStart && d <= rangeEnd;
    });

    const spanMs = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
    const periodDays = Math.max(1, spanMs / MS_DAY);
    const weeksInPeriod = Math.max(1, periodDays / 7);

    const totalLoad = list.reduce((acc, a) => acc + (a.load || 0), 0);
    const avgWeeklyLoad = totalLoad / weeksInPeriod;
    const ridesPerWeek = list.length / weeksInPeriod;

    const totalKm = list.reduce((acc, a) => acc + (Number(a.distance) || 0), 0);
    const totalElev = list.reduce((acc, a) => acc + (Number(a.climbing) || 0), 0);
    const totalSeconds = list.reduce((acc, a) => acc + movingTimeToSeconds(a.moving_time), 0);

    const highIntensity =
        ftp > 0
            ? list.filter((a) => (a.norm_power || 0) > ftp * 0.9).length
            : 0;

    const fmtOpts = { day: 'numeric', month: 'short', year: 'numeric' };

    return {
        rangeStart,
        rangeEnd,
        periodLabel: formatRangeNl(rangeStart, rangeEnd, fmtOpts),
        periodDays,
        weeksInPeriod,
        rideCount: list.length,
        avgWeeklyLoad,
        ridesPerWeek,
        avgKmPerWeek: totalKm / weeksInPeriod,
        avgHoursPerWeek: totalSeconds / weeksInPeriod / 3600,
        avgElevPerWeek: totalElev / weeksInPeriod,
        highIntensityCount: highIntensity,
        best5m: list.length ? Math.max(...list.map((a) => a.best_5min || 0)) : 0,
    };
}

function pctDiff(primary, baseline, getter) {
    const p = getter(primary);
    const b = getter(baseline);
    if (b <= 0 && p <= 0) return null;
    if (b <= 0) return p > 0 ? 100 : null;
    return ((p - b) / b) * 100;
}

/**
 * Genereert vergelijking + optionele SWOT-regels (trend vs voorganger / jaar-context).
 */
export function buildPeriodComparison(activities, primaryStart, primaryEnd, ftp) {
    const primary = summarizeActivityWindow(activities, primaryStart, primaryEnd, ftp);
    const primarySpanMs = Math.max(1, primaryEnd.getTime() - primaryStart.getTime());
    const periodDays = primary.periodDays;

    const swotExtras = [];
    const rows = [];

    rows.push({
        key: 'primary',
        label: 'Gekozen periode',
        rangeLabel: primary.periodLabel,
        ...pickRowMetrics(primary),
    });

    // --- Direct voorgaande venster (zelfde lengte) ---
    const priorEnd = new Date(primaryStart.getTime() - 1);
    const priorStart = new Date(primaryStart.getTime() - primarySpanMs);
    const prior =
        periodDays >= 7 && priorStart.getTime() < primaryStart.getTime()
            ? summarizeActivityWindow(activities, priorStart, priorEnd, ftp)
            : null;

    if (prior && prior.rideCount >= 0) {
        const tssPct = pctDiff(primary, prior, (s) => s.avgWeeklyLoad);
        const kmPct = pctDiff(primary, prior, (s) => s.avgKmPerWeek);
        const ridesPct = pctDiff(primary, prior, (s) => s.ridesPerWeek);

        rows.push({
            key: 'prior',
            label: 'Ervoor (zelfde lengte)',
            rangeLabel: prior.periodLabel,
            ...pickRowMetrics(prior),
            vsPrimaryTssPct: tssPct,
            vsPrimaryKmPct: kmPct,
            vsPrimaryRidesPct: ridesPct,
        });

        if (prior.rideCount >= 2 && primary.rideCount >= 2) {
            if (tssPct != null && tssPct > 15) {
                swotExtras.push({
                    quadrant: 'strengths',
                    label: 'Meer volume dan het vorige blok',
                    context: `TSS/week is ~${Math.round(tssPct)}% hoger dan in het even lange venster ervoor (${prior.periodLabel}: ~${Math.round(prior.avgWeeklyLoad)} → nu ~${Math.round(primary.avgWeeklyLoad)}). Je zit in opbouw — let op herstel.`,
                });
            } else if (tssPct != null && tssPct < -15) {
                swotExtras.push({
                    quadrant: 'weaknesses',
                    label: 'Minder volume dan het vorige blok',
                    context: `TSS/week ligt ~${Math.round(Math.abs(tssPct))}% lager dan in ${prior.periodLabel} (~${Math.round(prior.avgWeeklyLoad)} → ~${Math.round(primary.avgWeeklyLoad)}). Als dat geen bewuste rust is, verlies je snel trainingsprikkels.`,
                });
            }

            if (ridesPct != null && ridesPct > 20 && (tssPct == null || tssPct < 10)) {
                swotExtras.push({
                    quadrant: 'opportunities',
                    label: 'Meer ritten, vergelijkbare TSS',
                    context: `Je fietst vaker per week (+~${Math.round(ridesPct)}% vs ${prior.periodLabel}) maar TSS/week stijgt beperkt. Kijk of je structuur (kortere ritten) past bij je doel — of voeg duur toe.`,
                });
            }
        }
    }

    // --- Rollend jaar vóór huidige periode: "jaar-trend" vs recent ---
    const rollingYearStart = new Date(primaryEnd.getTime() - 365 * MS_DAY);
    const yearContextEnd = new Date(primaryStart.getTime() - 1);
    let yearRest = null;

    const canYearSlice =
        periodDays >= 14 &&
        periodDays < 300 &&
        yearContextEnd.getTime() >= rollingYearStart.getTime() &&
        primaryStart.getTime() > rollingYearStart.getTime();

    if (canYearSlice) {
        yearRest = summarizeActivityWindow(activities, rollingYearStart, yearContextEnd, ftp);

        const tssYPct = pctDiff(primary, yearRest, (s) => s.avgWeeklyLoad);
        const kmYPct = pctDiff(primary, yearRest, (s) => s.avgKmPerWeek);
        const ridesYPct = pctDiff(primary, yearRest, (s) => s.ridesPerWeek);

        rows.push({
            key: 'yearRest',
            label: 'Jaar ervoor (zonder je huidige periode)',
            rangeLabel: yearRest.periodLabel,
            ...pickRowMetrics(yearRest),
            vsPrimaryTssPct: tssYPct,
            vsPrimaryKmPct: kmYPct,
            vsPrimaryRidesPct: ridesYPct,
        });

        if (yearRest.rideCount >= 3 && primary.rideCount >= 3) {
            if (tssYPct != null && tssYPct > 12) {
                swotExtras.push({
                    quadrant: 'opportunities',
                    label: 'Recenter zwaarder dan je jaargemiddelde ervoor',
                    context: `Je huidige periode (${primary.periodLabel}) zit ~${Math.round(tssYPct)}% boven je gemiddelde TSS/week in het deel van het afgelopen jaar vóór dit venster (~${Math.round(yearRest.avgWeeklyLoad)} → ~${Math.round(primary.avgWeeklyLoad)}). Goed voor progressie als je herstel goed is.`,
                });
            } else if (tssYPct != null && tssYPct < -12) {
                swotExtras.push({
                    quadrant: 'threats',
                    label: 'Recenter lichter dan je jaargemiddelde ervoor',
                    context: `TSS/week ligt ~${Math.round(Math.abs(tssYPct))}% onder je gemiddelde in ${yearRest.periodLabel}. Controleer of dit bewust is (rust/peiling) — anders schuift je chronic load terug.`,
                });
            }

            if (
                ftp > 0 &&
                yearRest.highIntensityCount >= 2 &&
                primary.highIntensityCount < yearRest.highIntensityCount * 0.6 &&
                primary.periodDays <= 45
            ) {
                swotExtras.push({
                    quadrant: 'weaknesses',
                    label: 'Minder harde sessies dan eerder dit jaar',
                    context: `In je huidige venster zitten ${primary.highIntensityCount}× sessies >90% FTP; in het jaardeel ervoor ${yearRest.highIntensityCount}× (over langere tijd gespreid). Als je plafond wilt vasthouden, plan weer 1–2 kwaliteitsdagen per week.`,
                });
            }
        }
    }

    return {
        primary,
        prior,
        yearRest,
        comparisonRows: rows,
        swotExtras,
    };
}

function pickRowMetrics(s) {
    return {
        rides: s.rideCount,
        tssWeek: Math.round(s.avgWeeklyLoad),
        kmWeek: Math.round(s.avgKmPerWeek),
        hoursWeek: Number(s.avgHoursPerWeek.toFixed(1)),
        hardSessions: s.highIntensityCount,
    };
}
