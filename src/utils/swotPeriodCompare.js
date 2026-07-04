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

    // ⚡ Bolt Optimization: Use single-pass for...of loop to calculate all metrics
    // simultaneously, avoiding multiple consecutive iterations and allocations.
    let totalLoad = 0;
    let totalKm = 0;
    let totalElev = 0;
    let totalSeconds = 0;
    let highIntensity = 0;
    let best5m = 0;

    for (const a of list) {
        totalLoad += (a.load || 0);
        totalKm += (Number(a.distance) || 0);
        totalElev += (Number(a.climbing) || 0);
        totalSeconds += movingTimeToSeconds(a.moving_time);
        if (ftp > 0 && (a.norm_power || 0) > ftp * 0.9) {
            highIntensity++;
        }
        best5m = Math.max(best5m, a.best_5min || 0);
    }

    const avgWeeklyLoad = totalLoad / weeksInPeriod;
    const ridesPerWeek = list.length / weeksInPeriod;

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
        best5m,
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
        label: 'Selected period',
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
            label: 'Prior period (same length)',
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
                    label: 'Higher volume than the previous block',
                    context: `TSS/week is ~${Math.round(tssPct)}% higher than in the equally long window before (${prior.periodLabel}: ~${Math.round(prior.avgWeeklyLoad)} → now ~${Math.round(primary.avgWeeklyLoad)}). You're building — watch recovery.`,
                });
            } else if (tssPct != null && tssPct < -15) {
                swotExtras.push({
                    quadrant: 'weaknesses',
                    label: 'Lower volume than the previous block',
                    context: `TSS/week is ~${Math.round(Math.abs(tssPct))}% lower than in ${prior.periodLabel} (~${Math.round(prior.avgWeeklyLoad)} → ~${Math.round(primary.avgWeeklyLoad)}). If that isn't deliberate rest, you'll lose training stimulus quickly.`,
                });
            }

            if (ridesPct != null && ridesPct > 20 && (tssPct == null || tssPct < 10)) {
                swotExtras.push({
                    quadrant: 'opportunities',
                    label: 'More rides, similar TSS',
                    context: `You ride more often per week (+~${Math.round(ridesPct)}% vs ${prior.periodLabel}) but TSS/week rises only slightly. Check whether your structure (shorter rides) fits your goal — or add duration.`,
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
            label: 'Year before (excluding current period)',
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
                    label: 'Recent period heavier than your prior year average',
                    context: `Your current period (${primary.periodLabel}) is ~${Math.round(tssYPct)}% above your average TSS/week in the part of the past year before this window (~${Math.round(yearRest.avgWeeklyLoad)} → ~${Math.round(primary.avgWeeklyLoad)}). Good for progression if recovery is on track.`,
                });
            } else if (tssYPct != null && tssYPct < -12) {
                swotExtras.push({
                    quadrant: 'threats',
                    label: 'Recent period lighter than your prior year average',
                    context: `TSS/week is ~${Math.round(Math.abs(tssYPct))}% below your average in ${yearRest.periodLabel}. Check whether this is deliberate (rest/testing) — otherwise chronic load slips backward.`,
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
                    label: 'Fewer hard sessions than earlier this year',
                    context: `In your current window there are ${primary.highIntensityCount} sessions >90% FTP; in the year portion before ${yearRest.highIntensityCount} (spread over more time). If you want to hold your ceiling, schedule 1–2 quality days per week again.`,
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
