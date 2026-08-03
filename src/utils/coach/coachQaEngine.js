/**
 * Rule-based coach Q&A — answers training questions from live data (no external LLM).
 */

import { analyzeTrainingPeriod } from './coachPeriodAnalysis';
import { buildCoachContext } from './coachPayloadBuilder';
import {
    compareFtpYearsAgo,
    parseYearsAgoFromQuestion,
} from './coachPowerHistory';
import { rateTodayRideAnswer } from './coachTodayFocus';

export const COACH_QUICK_QUESTIONS = [
    { id: 'form', label: 'How is my form today?', prompt: 'How is my form today?' },
    { id: 'intervals_today', label: 'Should I do intervals today?', prompt: 'Should I do intervals today?' },
    { id: 'tss', label: 'Am I training enough?', prompt: 'Am I training enough this week?' },
    { id: 'ftp', label: 'Is my FTP improving?', prompt: 'Is my FTP improving based on my recent rides?' },
    { id: 'recovery', label: 'Do I need recovery?', prompt: 'Do I need a recovery week?' },
    { id: 'sweetspot', label: 'Why sweetspot?', prompt: 'Why do you recommend sweetspot for me?' },
    { id: 'period_4w', label: 'Analyze last 4 weeks', prompt: 'Analyze my training over the last 4 weeks' },
    { id: 'period_8w', label: 'Analyze last 8 weeks', prompt: 'Analyze my training over the last 8 weeks' },
];

/**
 * @param {string} question
 * @param {object[]} activities
 * @param {object} userSettings
 * @param {object} [options]
 * @returns {{ answer: string, title: string, related?: object }}
 */
export function answerCoachQuestion(question, activities, userSettings, options = {}) {
    const q = String(question || '').toLowerCase().trim();
    const weeklyHours = Number(options.weeklyHoursTarget)
        || Number(userSettings?.weeklyHoursTarget)
        || 5;
    const ctx = buildCoachContext(activities, userSettings, { weeklyHoursTarget: weeklyHours });
    const ftp = ctx.athlete.ftp;

    if (matchesTodayRideQuestion(q)) {
        return formatAnswer(
            'Today\'s ride review',
            rateTodayRideAnswer(ctx.todayFocus, ctx.weekPlanSummary, ctx.fitness),
        );
    }

    if (matches(q, ['form', 'tsb', 'fresh', 'fris', 'vorm'])) {
        return formatAnswer(
            'Your current form',
            formAnswer(ctx)
        );
    }

    if (matches(q, ['interval', 'hard', 'quality', 'vo2', 'threshold', 'sweetspot today', 'intens'])) {
        return formatAnswer(
            'Intervals today?',
            intervalsAnswer(ctx)
        );
    }

    if (matches(q, ['enough', 'volume', 'tss', 'training load', 'genoeg', 'uren'])) {
        return formatAnswer(
            'Training volume check',
            volumeAnswer(ctx)
        );
    }

    if (matches(q, ['ftp', 'improv', 'progress', 'ceiling', 'power curve', 'twintig', '20 min'])) {
        const yearsAgo = parseYearsAgoFromQuestion(q);
        if (yearsAgo != null || matches(q, ['years ago', 'year ago', 'compared to', 'long term', 'long-term', 'histor'])) {
            return formatAnswer(
                'FTP over time',
                historicalFtpAnswer(ctx, yearsAgo ?? 5, ftp),
            );
        }
        return formatAnswer(
            'FTP progression signals',
            ftpAnswer(ctx, ftp),
        );
    }

    if (matches(q, ['recovery', 'rest', 'overreach', 'burnout', 'rust', 'herstel', 'overtraining'])) {
        return formatAnswer(
            'Recovery assessment',
            recoveryAnswer(ctx)
        );
    }

    if (matches(q, ['why sweetspot', 'sweetspot', 'polder'])) {
        return formatAnswer(
            'Why sweetspot?',
            `Sweetspot (88–94% FTP) gives the best FTP return per minute for athletes with ${weeklyHours}h/week. `
            + `Your recent sweetspot volume is ${ctx.intensityProfile.sweetspotPct}% of ride time (target: 10–20%). `
            + `${ctx.stimulusRationale}`
        );
    }

    if (matches(q, ['4 week', 'vier week', 'last month', 'maand'])) {
        const review = analyzeTrainingPeriod(activities, userSettings, 4);
        return formatAnswer(
            '4-week training review',
            periodAnswer(review)
        );
    }

    if (matches(q, ['8 week', 'acht week', '2 month'])) {
        const review = analyzeTrainingPeriod(activities, userSettings, 8);
        return formatAnswer(
            '8-week training review',
            periodAnswer(review)
        );
    }

    if (matches(q, ['12 week', 'twaalf', '3 month', 'kwartaal'])) {
        const review = analyzeTrainingPeriod(activities, userSettings, 12);
        return formatAnswer(
            '12-week training review',
            periodAnswer(review)
        );
    }

    if (matches(q, ['analyze', 'analyse', 'review', 'swot', 'period', 'weeks', 'weken'])) {
        const weeks = q.includes('8') ? 8 : q.includes('12') ? 12 : 4;
        const review = analyzeTrainingPeriod(activities, userSettings, weeks);
        return formatAnswer(
            `${weeks}-week training review`,
            periodAnswer(review)
        );
    }

    if (matches(q, ['climb', 'klim', 'elevation', 'hoogte'])) {
        return formatAnswer(
            'Climbing on flat terrain',
            `You train on flat polder roads — climbing-specific work comes from sustained power (sweetspot/threshold) `
            + `and occasional bridge repeats at tempo. Your 28-day elevation is embedded in your activity data; `
            + `for FTP gains, prioritize sweetspot over seeking hills.`
        );
    }

    return formatAnswer(
        'Coach response',
        `I can help with form (TSB), intervals, volume, FTP trends, recovery, and period reviews (4/8/12 weeks). `
        + `Try a quick question above, or ask something like "How is my form?" or "Analyze my last 8 weeks".\n\n`
        + `Today's snapshot: TSB ${ctx.fitness.tsb}, `
        + `${ctx.weeklyLoad.actualTss}/${ctx.weeklyLoad.targetTss} TSS this week, `
        + `recommended focus: ${ctx.fluidWorkout.stimulusLabel}.`
    );
}

function matches(q, keywords) {
    return keywords.some((k) => q.includes(k));
}

function matchesTodayRideQuestion(q) {
    const hasToday = matches(q, ['today', "today's", 'todays', 'vandaag', 'this morning', 'this afternoon']);
    const hasRide = matches(q, ['ride', 'rit', 'session', 'training', 'workout', 'easy', 'rate', 'review', 'how was', 'hoe was']);
    const explicit = matches(q, ['rate my', 'review my', 'easy ride']);
    return (hasToday && hasRide) || explicit;
}

function formatAnswer(title, answer) {
    return { title, answer };
}

function formAnswer(ctx) {
    const { tsb, ctl, atl, tsbTrend } = ctx.fitness;
    let tone;
    if (tsb < -20) tone = 'Very fatigued — prioritize rest.';
    else if (tsb < -5) tone = 'Carrying fatigue — keep today easy.';
    else if (tsb <= 15) tone = 'Good training form — quality work is appropriate.';
    else tone = 'Very fresh — you may be under-loading; sweetspot or threshold fits.';

    return `CTL (fitness): ${ctl} | ATL (fatigue): ${atl} | TSB (form): ${tsb} (${tsbTrend}).\n\n`
        + `${tone}\n\n`
        + `Recommended today: ${ctx.fluidWorkout.name} (${ctx.fluidWorkout.stimulusLabel}).`;
}

function intervalsAnswer(ctx) {
    const s = ctx.selectedStimulus;
    const hard = ['sweetspot', 'threshold', 'vo2'].includes(s);

    if (s === 'recovery') {
        return `No — recovery is the priority. TSB is ${ctx.fitness.tsb} and your body needs easy riding or rest.\n\n`
            + `If you must ride: ${ctx.fluidWorkout.name} only.`;
    }

    if (s === 'endurance' && ctx.intensityProfile.hardSessionCount >= 2) {
        return `Not hard intervals today. You already have ${ctx.intensityProfile.hardSessionCount} hard sessions `
            + `in the last 14 days. Stick to Z2 endurance.\n\n`
            + `${ctx.stimulusRationale}`;
    }

    if (hard) {
        return `Yes — ${ctx.fluidWorkout.stimulusLabel} fits today. ${ctx.stimulusRationale}\n\n`
            + `Suggested: ${ctx.fluidWorkout.name}. `
            + `Main set: ${describeMainSet(ctx.fluidWorkout)}`;
    }

    return `Keep it aerobic today (Z2 endurance). ${ctx.stimulusRationale}`;
}

function volumeAnswer(ctx) {
    const { actualTss, targetTss, compliancePct } = ctx.weeklyLoad;
    const hours = ctx.periodSummary.hours28d / 4;

    let assessment;
    if (compliancePct < 70) {
        assessment = 'Below target — add an easy ride or extend one session by 20–30 min.';
    } else if (compliancePct > 120) {
        assessment = 'Above target — watch fatigue; do not add more intensity.';
    } else {
        assessment = 'On target — maintain this rhythm.';
    }

    return `This week: ${actualTss} / ${targetTss} TSS (${compliancePct}%). `
        + `28-day average: ~${Math.round(hours * 10) / 10} h/week.\n\n${assessment}`;
}

function historicalFtpAnswer(ctx, yearsAgo, ftp) {
    const comparison = compareFtpYearsAgo(ctx.powerHistory, yearsAgo, ftp);

    if (!comparison.ok) {
        const lines = [comparison.message];
        if (ctx.powerHistory?.longevity?.peakEftp20) {
            lines.push(
                `\nYour all-time peak in this log: ~${ctx.powerHistory.longevity.peakEftp20}W (${ctx.powerHistory.longevity.peakYear}).`,
            );
        }
        if (ftp > 0) {
            lines.push(`Current FTP setting: ${ftp}W.`);
        }
        return lines.join('');
    }

    const direction = comparison.delta >= 0 ? 'higher' : 'lower';
    const lines = [
        `Compared to ~${yearsAgo} years ago (${comparison.targetYear}):`,
        `• Then (est. eFTP from best 20-min peaks): ${comparison.eftpThen}W (${comparison.thenRideCount} rides logged)`,
        `• Now (${comparison.currentYear}): ${comparison.eftpNow}W`,
        `• Change: ${comparison.delta >= 0 ? '+' : ''}${comparison.delta}W (${comparison.pct >= 0 ? '+' : ''}${comparison.pct}%) — ${Math.abs(comparison.pct)}% ${direction}`,
    ];

    if (ctx.powerHistory?.longevity?.peakEftp20) {
        lines.push(
            `\nAll-time peak in your log: ~${ctx.powerHistory.longevity.peakEftp20}W (${ctx.powerHistory.longevity.peakYear}).`,
        );
    }

    if (ctx.fitness.tsb < -10) {
        lines.push(
            `\nNote: TSB is ${ctx.fitness.tsb} right now — focus on absorbing recent training before chasing FTP tests.`,
        );
    }

    return lines.join('\n');
}

function ftpAnswer(ctx, ftp) {
    const { best20min, best60min, ftpGap20min } = ctx.powerCeiling;
    if (!ftp || ftp <= 0) {
        return 'Set your FTP in Settings first — I need it to assess power trends.';
    }

    const lines = [`Current FTP setting: ${ftp}W.`];
    if (best20min > 0) {
        lines.push(`Best 20-min in last 28 days: ${best20min}W (${Math.round(best20min / ftp * 100)}% of FTP).`);
        if (best20min >= ftp * 0.98) {
            lines.push('Signal: FTP may be ready for an increase — consider a formal test or eFTP update.');
        } else {
            lines.push('Signal: Sweetspot blocks will help push 20-min power closer to FTP.');
        }
    }
    if (best60min > 0) {
        lines.push(`Best 60-min: ${best60min}W — sustained power ${ctx.powerCeiling.sustainedWeakness ? 'needs work' : 'looks solid'}.`);
    }
    if (ftpGap20min != null) {
        lines.push(`Gap to retest threshold: ${Math.round(ftpGap20min * 100)}%.`);
    }
    return lines.join('\n');
}

function recoveryAnswer(ctx) {
    const { tsb } = ctx.fitness;
    const hard = ctx.intensityProfile.hardSessionCount;

    if (tsb < -20 || hard >= 4) {
        return `Yes — recovery week recommended. TSB: ${tsb}, hard sessions (14d): ${hard}.\n\n`
            + 'Drop all intensity above 75% FTP for 5–7 days. Sleep and nutrition first.';
    }
    if (tsb < -10) {
        return `Partial recovery needed. TSB ${tsb} is negative — swap the next quality day for Z2.`;
    }
    return `No full recovery week needed. TSB ${tsb} is manageable. `
        + `Keep at least 48h between hard sessions.`;
}

function periodAnswer(review) {
    const { verdict, metrics, swot } = review;
    const swotLine = (items) => items.slice(0, 2).map((i) => `• ${i.label}: ${i.context}`).join('\n');

    return `${verdict.headline}\n\n`
        + verdict.paragraphs.join('\n\n')
        + '\n\n**Strengths**\n' + swotLine(swot.strengths)
        + '\n\n**Watch**\n' + swotLine(swot.weaknesses.concat(swot.threats))
        + '\n\n**Next steps**\n' + verdict.nextSteps.map((s) => `• ${s}`).join('\n');
}

function describeMainSet(workout) {
    const blocks = workout.mainSet?.blocks || [];
    if (blocks.length === 0) return workout.mainSet?.description || 'steady ride';
    return blocks.map((b) =>
        `${b.reps}× ${b.workMin} min ${b.zone}${b.wattRange ? ` (${b.wattRange})` : ''}`
    ).join(', ');
}
