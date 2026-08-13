import React, { useMemo, useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Activity, Download, Target, ListChecks, GitCompareArrows, Mountain } from 'lucide-react';
import { buildCoachPlan, COACH_GOAL_OPTIONS, COACH_WORKOUT_LIBRARY } from '../utils/swotCoachPlan';
import { buildPeriodComparison } from '../utils/swotPeriodCompare';
import { normalizeDate, formatDateDDMMYYYY } from '../utils/formatters';
import { useActivitiesList } from '../hooks/useActivities';
import { buildCoachContext } from '../utils/coach/coachPayloadBuilder';
import TodaysFocusCard from './coach/TodaysFocusCard';
import CoachAskPanel from './coach/CoachAskPanel';
import CoachDataPlayground from './coach/CoachDataPlayground';
import CoachPeriodReview from './coach/CoachPeriodReview';
import CoachFluidWeekPlan from './coach/CoachFluidWeekPlan';
import CoachFitnessForecast from './coach/CoachFitnessForecast';
import CollapsibleSection from './ui/CollapsibleSection';
import EmptyStateCard from './ui/EmptyStateCard';
import { useToast } from '../context/ToastContext';
import { buildFluidWeekPlan, buildProjectedWeek2Plan } from '../utils/coach/coachWeekPlan';
import { todayYmd } from '../utils/coach/coachHelpers';
import { COACH_WEEK_UPDATED_EVENT, readCoachWeek2Enabled, writeCoachWeek2Enabled } from '../utils/coach/coachWeekState';
import {
    TRAINING_PLAN_UPDATED_EVENT,
} from '../utils/trainingPlanSnapshot';
import { useProfileFtp } from '../context/ProfileFtpContext';

/** moving_time: seconden (number) of "H:MM:SS" uit CSV */
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

function formatVsPrimaryPct(pct) {
    if (pct == null || Number.isNaN(pct)) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${Math.round(pct)}% vs. selected period`;
}

const AICoach = ({ activities: activitiesProp, userSettings, setUserSettings, startDate, endDate, isSignedIn = false, intervalsConfig, onGoToActivities, onOpenSettings }) => {
    const activitiesFromContext = useActivitiesList();
    const activities = activitiesProp ?? activitiesFromContext;
    const { showToast } = useToast();
    const profileFtp = useProfileFtp();
    const effectiveFtp = profileFtp.ftp || Number(userSettings?.ftp) || 0;

    const [coachGoalId, setCoachGoalId] = useState('auto');
    const weeklyHoursTarget = Number(userSettings?.weeklyHoursTarget) || 5;
    const [planRevision, setPlanRevision] = useState(0);
    const [showNextWeek, setShowNextWeek] = useState(() => readCoachWeek2Enabled());
    const [coachWeekRevision, setCoachWeekRevision] = useState(0);

    const updateWeeklyHours = (hours) => {
        if (setUserSettings) {
            setUserSettings((prev) => ({ ...prev, weeklyHoursTarget: hours }));
        }
    };

    useEffect(() => {
        const onPlanUpdate = () => setPlanRevision((n) => n + 1);
        window.addEventListener(TRAINING_PLAN_UPDATED_EVENT, onPlanUpdate);
        return () => window.removeEventListener(TRAINING_PLAN_UPDATED_EVENT, onPlanUpdate);
    }, []);

    // --- 1. SWOT ENGINE (Expanded Context) ---
    const swot = useMemo(() => {
        const endD = endDate ? new Date(endDate) : new Date();
        const startD = startDate ? new Date(startDate) : (() => {
            const d = new Date(endD);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const toLocalYmd = (d) => {
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        };
        const startYmd = startDate ? normalizeDate(startDate) : toLocalYmd(startD);
        const endYmd = endDate ? normalizeDate(endDate) : toLocalYmd(endD);

        const periodActivities = activities.filter((a) => {
            const dStr = normalizeDate(a.date);
            if (!dStr || dStr.length < 10) return false;
            return dStr >= startYmd && dStr <= endYmd;
        });

        const periodDays = Math.max(1, (endD - startD) / (1000 * 60 * 60 * 24));
        const weeksInPeriod = Math.max(1, periodDays / 7);
        const ftp = effectiveFtp;

        // Drempelwaarden schalen naar de periodelengte (basisreferentie = 30 dagen)
        const consistencyHigh = Math.round(12 * periodDays / 30);  // >3x/week
        const consistencyLow  = Math.round(4  * periodDays / 30);  // <2x/week
        const intensityHigh   = Math.round(8  * periodDays / 30);  // te veel intensiteit
        const intensityLow    = Math.round(2  * periodDays / 30);  // te weinig intensiteit

        const periodLabel = (startDate || endDate)
            ? `${formatDateDDMMYYYY(startD)} – ${formatDateDDMMYYYY(endD)}`
            : 'last 30 days';

        const periodScope =
            periodDays < 45 ? 'short' : periodDays < 400 ? 'medium' : 'long';

        const periodComparison = buildPeriodComparison(activities, startD, endD, ftp);

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];

        const recentLoad = periodActivities.reduce((acc, curr) => acc + (curr.load || 0), 0);
        const avgWeeklyLoad = recentLoad / weeksInPeriod;
        const ridesPerWeek = periodActivities.length / weeksInPeriod;

        const totalKm = periodActivities.reduce((acc, a) => acc + (Number(a.distance) || 0), 0);
        const totalElev = periodActivities.reduce((acc, a) => acc + (Number(a.climbing) || 0), 0);
        const totalSeconds = periodActivities.reduce((acc, a) => acc + movingTimeToSeconds(a.moving_time), 0);
        const avgKmPerWeek = totalKm / weeksInPeriod;
        const avgHoursPerWeek = totalSeconds / weeksInPeriod / 3600;
        const avgElevPerWeek = totalElev / weeksInPeriod;

        const virtualCount = periodActivities.filter((a) =>
            String(a.type || '').toLowerCase().includes('virtual')
        ).length;

        const LONG_RIDE_SEC = 2 * 3600;
        const longRideCount = periodActivities.filter(
            (a) => movingTimeToSeconds(a.moving_time) >= LONG_RIDE_SEC
        ).length;
        const expectedLongRidesLo = Math.max(1, Math.floor(weeksInPeriod * 0.2));

        // Consistency Check
        if (periodActivities.length >= consistencyHigh) {
            strengths.push({
                label: "High consistency",
                context: `You trained ${periodActivities.length} times in the ${periodLabel} (>3x/week). Consistency is the most important factor for mitochondrial adaptation and aerobic base.`
            });
        } else if (periodActivities.length < consistencyLow) {
            weaknesses.push({
                label: "Low frequency",
                context: `Only ${periodActivities.length} rides in the ${periodLabel}. Without regular stimulus (at least 2–3x per week), your fitness will stagnate or decline.`
            });
        }

        // Load Trend (TSB proxy)
        if (avgWeeklyLoad > 400) {
            strengths.push({
                label: "Strong base fitness (CTL)",
                context: `Your average weekly load is ${Math.round(avgWeeklyLoad)} TSS. This indicates a solid Chronic Training Load (CTL), meaning your body can handle heavier training blocks.`
            });
        } else if (avgWeeklyLoad < 100) {
            opportunities.push({
                label: "Room to increase volume",
                context: `With a load of only ${Math.round(avgWeeklyLoad)} TSS/week, you still have plenty of room to progress by simply adding more volume or frequency.`
            });
        }

        // Intensity Distribution
        const highIntensity = ftp > 0
            ? periodActivities.filter((a) => (a.norm_power || 0) > ftp * 0.9).length
            : 0;
        if (ftp > 0 && highIntensity > intensityHigh) {
            threats.push({
                label: "Monotony & burnout risk",
                context: `You completed ${highIntensity} hard sessions (>90% FTP) in the ${periodLabel}. Too much intensity without easy endurance rides leads to a plateau and increases overtraining risk.`
            });
        }
        if (ftp > 0 && highIntensity < intensityLow) {
            weaknesses.push({
                label: "Lack of intensity",
                context: `In the ${periodLabel}, only a few sessions were above ~90% FTP (${highIntensity}×, while we'd expect at least ~${intensityLow} for this period for a complete profile). For a higher ceiling (VO2), you need targeted interval stimulus.`
            });
        }

        // Power Profile (Best 5m)
        // ⚡ Bolt Optimization: Calculate max without spread operator on .map() result
        const best5m = periodActivities.reduce((max, a) => Math.max(max, a.best_5min || 0), 0);
        if (ftp > 0 && best5m > ftp * 1.15) {
            strengths.push({
                label: "Strong VO2 Max engine",
                context: `Your 5-minute power is ${best5m}W, which is very strong relative to your FTP. This points to well-developed aerobic capacity. You could exploit this on short, steep climbs.`
            });
        } else if (ftp > 0 && best5m > 0 && best5m < ftp * 0.92 && periodActivities.length >= 3) {
            weaknesses.push({
                label: "Limited short power",
                context: `Your best 5 min in this period is ${best5m}W vs FTP ${ftp}W. That suggests little training around VO2/threshold and above. Short blocks above FTP can help raise your ceiling.`
            });
        }

        // Volume / duur (periode-afhankelijk)
        if (periodActivities.length >= 3 && avgKmPerWeek < 35 && avgWeeklyLoad >= 80) {
            opportunities.push({
                label: "More endurance kilometers",
                context: `You ride ~${Math.round(avgKmPerWeek)} km/week over ${periodLabel} while TSS is already reasonable — often that means short or virtual rides. More continuous endurance can strengthen your aerobic efficiency.`
            });
        }

        if (weeksInPeriod >= 3 && longRideCount < expectedLongRidesLo && periodActivities.length >= 4) {
            weaknesses.push({
                label: "Few long rides",
                context: `In ~${Math.round(weeksInPeriod)} weeks you rode ${longRideCount}× ≥2h (expected at least ~${expectedLongRidesLo} for a balanced endurance profile). Plan an occasional longer Z2 ride.`
            });
        }

        if (periodActivities.length >= 5 && virtualCount / periodActivities.length > 0.65) {
            threats.push({
                label: "Heavy on virtual",
                context: `${virtualCount} of ${periodActivities.length} sessions are virtual. That can be fine, but too little outdoor riding (variety, skills, wind) limits transfer to real climbs.`
            });
        }

        if (periodActivities.length >= 4 && avgElevPerWeek < 200 && avgKmPerWeek > 50) {
            opportunities.push({
                label: "More elevation gain",
                context: `Average ~${Math.round(avgElevPerWeek)} m/week in this period at ${Math.round(avgKmPerWeek)} km/week — relatively flat. Hills and repeated climbs train climbing-specific muscular endurance.`
            });
        }

        let loadTrendUp = false;
        let loadTrendDown = false;
        let tssFirstHalf = null;
        let tssSecondHalf = null;

        // Trend eerste vs tweede helft (alleen zinvol bij langere periodes)
        if (periodDays >= 56 && periodActivities.length >= 8) {
            const midMs = (startD.getTime() + endD.getTime()) / 2;
            let firstLoad = 0;
            let secondLoad = 0;
            const firstWeeks = Math.max(1, (midMs - startD.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const secondWeeks = Math.max(1, (endD.getTime() - midMs) / (7 * 24 * 60 * 60 * 1000));
            periodActivities.forEach((a) => {
                const t = new Date(a.date).getTime();
                const L = a.load || 0;
                if (t < midMs) firstLoad += L;
                else secondLoad += L;
            });
            const tssW1 = firstLoad / firstWeeks;
            const tssW2 = secondLoad / secondWeeks;
            tssFirstHalf = tssW1;
            tssSecondHalf = tssW2;
            if (tssW2 > tssW1 * 1.15) {
                loadTrendUp = true;
                opportunities.push({
                    label: "Rising weekly load",
                    context: `In the second half of ${periodLabel}, your average TSS/week (~${Math.round(tssW2)}) is clearly higher than in the first (~${Math.round(tssW1)}). You're in a build phase — plan recovery once performance or motivation drops.`
                });
            } else if (tssW1 > tssW2 * 1.15) {
                loadTrendDown = true;
                threats.push({
                    label: "Declining load",
                    context: `Your TSS/week was higher in the first half (~${Math.round(tssW1)}) than in the second (~${Math.round(tssW2)}) of ${periodLabel}. If that's not a deliberate rest phase, detraining or underlying fatigue may be a risk.`
                });
            }
        }

        // Tweede tijdssnede: trend vs direct vorig blok + vs rollend jaar (zonder huidige periode)
        if (periodActivities.length > 0) {
            for (const x of periodComparison.swotExtras) {
                if (x.quadrant === 'strengths') strengths.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'weaknesses') weaknesses.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'opportunities') opportunities.push({ label: x.label, context: x.context });
                else if (x.quadrant === 'threats') threats.push({ label: x.label, context: x.context });
            }
        }

        // Lege dataset: eigen SWOT i.p.v. generieke fillers met nul-cijfers
        if (periodActivities.length === 0) {
            return {
                strengths: [{
                    label: "No data to assess",
                    context: `There are no activities in ${periodLabel}. Choose a different date range or import/sync your training — then the coach can spot patterns.`
                }],
                weaknesses: [{
                    label: "Analysis not possible",
                    context: "Without rides in this window we can't derive weaknesses from your logs. Check whether your filter (1M, 3M, …) matches your import."
                }],
                opportunities: [{
                    label: "Start logging",
                    context: "Once activities appear in this period, concrete opportunities (volume, intensity, duration) tailored to your selected range will show up here."
                }],
                threats: [{
                    label: "Flying blind",
                    context: "Without data in the selected window you miss signals (too little rest, too many hard days). Use a period in which you actually trained."
                }],
                avgWeeklyLoad: 0,
                periodLabel,
                coachMetrics: {
                    periodLabel,
                    periodDays,
                    weeksInPeriod,
                    avgWeeklyLoad: 0,
                    ridesPerWeek: 0,
                    avgKmPerWeek: 0,
                    avgHoursPerWeek: 0,
                    avgElevPerWeek: 0,
                    rideCount: 0,
                    tssFirstHalf,
                    tssSecondHalf,
                },
                coachFlags: { noData: true },
                periodComparison,
            };
        }

        // Fillers: periodespecifiek i.p.v. identieke boilerplate
        if (strengths.length === 0) {
            strengths.push({
                label: "No standout strengths",
                context: `Over ${periodLabel} (${periodScope} window) no clear strengths stand out under the current rules. That mainly means no extreme patterns — compare with a shorter period for recent trends.`
            });
        }
        if (weaknesses.length === 0) {
            weaknesses.push({
                label: "No clear weakness",
                context: `In ${periodLabel}: ${periodActivities.length} rides, ~${ridesPerWeek.toFixed(1)}×/week, ~${Math.round(avgWeeklyLoad)} TSS/week, ~${Math.round(avgKmPerWeek)} km/week, ~${avgHoursPerWeek.toFixed(1)} h/week. No red flags on frequency, intensity, or short power — you're in the middle of the profile.`
            });
        }
        if (opportunities.length === 0) {
            opportunities.push({
                label: "Refine your focus",
                context: `With ~${Math.round(avgWeeklyLoad)} TSS/week over ${periodLabel} there is no simple lever (too little volume or too little intensity). Deliberately pick one goal: more structure, specific climb training, or a rest week — depending on how you feel beyond these numbers.`
            });
        }
        if (threats.length === 0) {
            threats.push({
                label: "No hard risks in data",
                context: `We don't see overload from hard sessions (${highIntensity}× >90% FTP, threshold ~${intensityHigh} for this period). For ${periodDays < 60 ? 'short' : 'longer'} periods: keep watching for stacking heavy weeks and sleep/stress off the bike.`
            });
        }

        const coachMetrics = {
            periodLabel,
            periodDays,
            weeksInPeriod,
            avgWeeklyLoad,
            ridesPerWeek,
            avgKmPerWeek,
            avgHoursPerWeek,
            avgElevPerWeek,
            rideCount: periodActivities.length,
            tssFirstHalf,
            tssSecondHalf,
        };

        const coachFlags = {
            noData: false,
            lowFrequency: periodActivities.length < consistencyLow,
            intensityOverload: ftp > 0 && highIntensity > intensityHigh,
            intensityGap: ftp > 0 && highIntensity < intensityLow,
            weakShortPower: ftp > 0 && best5m > 0 && best5m < ftp * 0.92 && periodActivities.length >= 3,
            fewLongRides: weeksInPeriod >= 3 && longRideCount < expectedLongRidesLo && periodActivities.length >= 4,
            mostlyVirtual: periodActivities.length >= 5 && virtualCount / periodActivities.length > 0.65,
            lowElevationOpportunity: periodActivities.length >= 4 && avgElevPerWeek < 200 && avgKmPerWeek > 50,
            lowWeeklyLoad: avgWeeklyLoad < 100,
            highWeeklyLoad: avgWeeklyLoad > 400,
            loadTrendUp,
            loadTrendDown,
        };

        return {
            strengths,
            weaknesses,
            opportunities,
            threats,
            avgWeeklyLoad,
            periodLabel,
            coachMetrics,
            coachFlags,
            periodComparison,
        };
    }, [activities, userSettings, startDate, endDate, effectiveFtp]);

    const coachPlan = useMemo(
        () =>
            buildCoachPlan({
                metrics: swot.coachMetrics,
                flags: swot.coachFlags,
                goalId: coachGoalId,
            }),
        [swot.coachMetrics, swot.coachFlags, coachGoalId]
    );

    const coachContext = useMemo(
        () => buildCoachContext(activities, userSettings, {
            weeklyHoursTarget,
            includeWeek2: showNextWeek,
        }),
        [activities, userSettings, weeklyHoursTarget, showNextWeek, coachWeekRevision],
    );

    useEffect(() => {
        const onUpdate = () => setCoachWeekRevision((n) => n + 1);
        window.addEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
    }, []);

    const referenceYmd = todayYmd();
    const fluidWeekPlan = useMemo(
        () => buildFluidWeekPlan({
            activities,
            userSettings,
            coachContext,
            referenceYmd,
        }),
        [activities, userSettings, coachContext, referenceYmd, coachWeekRevision, planRevision],
    );

    const linkedEventGoal = fluidWeekPlan?.targetTssSource === 'event-goal'
        ? fluidWeekPlan.trainingGoal
        : null;

    const week2Plan = useMemo(() => {
        if (!showNextWeek) return null;
        return buildProjectedWeek2Plan({
            activities,
            userSettings,
            week1Plan: fluidWeekPlan,
            coachContext,
            referenceYmd,
        });
    }, [showNextWeek, fluidWeekPlan, activities, userSettings, coachContext, referenceYmd, coachWeekRevision]);

    const opportunitiesForDisplay = useMemo(() => {
        return swot.opportunities.map((o) =>
            o.label === 'Refine your focus'
                ? { ...o, extraActions: coachPlan.actions }
                : o
        );
    }, [swot.opportunities, coachPlan.actions]);

    // --- 2. ZWO DOWNLOAD HANDLER ---
    const handleDownloadZwo = (workout) => {
        if (!workout.zwoSteps || workout.zwoSteps.length === 0) {
            showToast('No workout file needed for this rest day. Enjoy the rest!', { variant: 'info' });
            return;
        }

        const xml = `
<workout_file>
    <author>Climb Lab Pro</author>
    <name>${workout.title}</name>
    <description>${workout.description}</description>
    <sportType>bike</sportType>
    <tags><tag name="Intervals"/></tags>
    <workout>
${workout.zwoSteps.map(step => {
            if (step.type === 'IntervalsT') {
                return `        <IntervalsT Repeat="${step.repeat}" OnDuration="${step.onDuration}" OffDuration="${step.offDuration}" OnPower="${step.onPower}" OffPower="${step.offPower}"/>`;
            }
            if (step.type === 'Warmup' || step.type === 'Cooldown') {
                return `        <${step.type} Duration="${step.duration}" PowerLow="${step.powerLow}" PowerHigh="${step.powerHigh}"/>`;
            }
            return `        <SteadyState Duration="${step.duration}" Power="${step.power}"/>`;
        }).join('\n')}
    </workout>
</workout_file>`.trim();

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CPL_${workout.title.replace(/\s+/g, '_')}.zwo`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCardStyles = (t) => {
        if (t === 'recovery') return {
            container: 'border-green-200 bg-green-50',
            text: 'text-green-700',
            badge: 'bg-green-100 text-green-800'
        };
        if (t === 'endurance') return {
            container: 'border-blue-200 bg-blue-50',
            text: 'text-blue-700',
            badge: 'bg-blue-100 text-blue-800'
        };
        return {
            container: 'border-yellow-200 bg-yellow-50',
            text: 'text-yellow-700',
            badge: 'bg-yellow-100 text-yellow-800'
        };
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in min-w-0 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="bg-cdsurface p-3 md:p-6 rounded-xl border border-cdborder shadow-md flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-cdtext flex items-center gap-2">
                        <Brain className="text-purple-400 shrink-0" />
                        <span className="truncate">AI Performance Coach</span>
                    </h2>
                    <p className="text-sm text-cdmuted">Based on your data from {swot.periodLabel}.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold text-cdtext">{Math.round(swot.avgWeeklyLoad)} TSS</div>
                    <div className="text-xs text-cdmuted uppercase">Avg Weekly Load</div>
                </div>
            </div>

            {swot.coachFlags?.noData && (
                <EmptyStateCard
                    icon={Activity}
                    title="No activities in this period"
                    message="Import or sync your training data, or widen the time range in the header toolbar, so the coach can analyze your rides."
                    primaryLabel="Go to Activities"
                    onPrimary={onGoToActivities}
                    secondaryLabel="Open settings"
                    onSecondary={onOpenSettings}
                />
            )}

            {linkedEventGoal?.currentWeekTargetTss != null && (
                <div className="bg-cdsurface p-4 rounded-xl border border-cdborder border-l-4 border-l-cdaccent flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                            <Mountain size={14} className="text-cdaccent" aria-hidden />
                            Event goal drives this week
                        </p>
                        <p className="text-sm text-cdtext mt-1">
                            <strong>{linkedEventGoal.eventName}</strong>
                            {' '}on {formatDateDDMMYYYY(linkedEventGoal.goalDate)}
                            {linkedEventGoal.weeksToEvent > 0
                                ? ` — ${linkedEventGoal.weeksToEvent} week(s) out`
                                : ''}
                        </p>
                        <p className="text-xs text-cdmuted mt-1">
                            Week {linkedEventGoal.currentWeekNum}: {linkedEventGoal.currentPhaseLabel}
                            {linkedEventGoal.isTaperPhase ? ' (taper)' : ''}
                            {' · '}
                            Sessions and weekly TSS follow this phase.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-cdaccent tabular-nums">
                            {fluidWeekPlan.targetTss}
                        </div>
                        <div className="text-[10px] text-cdmuted uppercase">Target TSS this week</div>
                    </div>
                </div>
            )}

            <div className="bg-cdsurface p-4 rounded-xl border border-cdborder flex flex-wrap items-center gap-4">
                <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-cdmuted">
                    <span className="font-semibold text-cdtext whitespace-nowrap">Weekly hours budget</span>
                    <select
                        value={weeklyHoursTarget}
                        onChange={(e) => updateWeeklyHours(Number(e.target.value))}
                        className="bg-cdborder border border-cdborder rounded-lg px-3 py-2 text-cdtext text-sm min-w-[140px]"
                    >
                        <option value={4}>4 h / week</option>
                        <option value={5}>5 h / week</option>
                        <option value={6}>6 h / week</option>
                        <option value={7}>7 h / week</option>
                    </select>
                </label>
                <p className="text-xs text-cdmuted flex-1 min-w-0">
                    {linkedEventGoal
                        ? `Shapes which days you train. Weekly TSS (${fluidWeekPlan.targetTss}) comes from your event goal in Goals & Planning — not the hours table (~${fluidWeekPlan.hoursBudgetTss} TSS at ${weeklyHoursTarget} h/wk). Yearly km/elevation goals on the Dashboard stay separate.`
                        : 'Saved in Settings. Drives TSS targets, fluid workouts, and week rebalancing when no event goal is set.'}
                </p>
            </div>

            <CoachFluidWeekPlan
                activities={activities}
                userSettings={userSettings}
                coachContext={coachContext}
                isSignedIn={isSignedIn}
                weekPlan={fluidWeekPlan}
                showNextWeek={showNextWeek}
                onToggleNextWeek={() => {
                    setShowNextWeek((current) => {
                        const next = !current;
                        writeCoachWeek2Enabled(next);
                        return next;
                    });
                }}
                week2Plan={week2Plan}
            />

            <CoachFitnessForecast
                activities={activities}
                userSettings={userSettings}
                week1Sessions={fluidWeekPlan.sessions}
                week2Sessions={week2Plan?.sessions || []}
            />

            <CollapsibleSection
                title="Today's focus & SWOT"
                subtitle="Session guidance plus strengths, weaknesses, opportunities, and threats from your selected period."
                icon={Brain}
                iconClassName="text-purple-400"
                defaultExpanded={false}
            >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-1">

                {/* --- Fluid workout (data-driven) --- */}
                <div className="lg:col-span-1">
                    <TodaysFocusCard coachContext={coachContext} />
                </div>

                {/* --- 2. SWOT MATRIX (Right Col, 2 span) --- */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                    <SwotCard title="Strengths" items={swot.strengths} icon={CheckCircle} color="text-green-500" border="border-green-500" />
                    <SwotCard title="Weaknesses" items={swot.weaknesses} icon={AlertTriangle} color="text-red-500" border="border-red-500" />
                    <SwotCard title="Opportunities" items={opportunitiesForDisplay} icon={TrendingUp} color="text-blue-500" border="border-blue-500" />
                    <SwotCard title="Threats" items={swot.threats} icon={Activity} color="text-yellow-500" border="border-yellow-500" />
                </div>
            </div>
            </CollapsibleSection>

            {/* --- Period review (4/8/12 weeks) + Ask the Coach --- */}
            <CoachPeriodReview
                activities={activities}
                userSettings={userSettings}
                weeklyHoursTarget={weeklyHoursTarget}
            />

            <CoachAskPanel
                activities={activities}
                userSettings={userSettings}
                weeklyHoursTarget={weeklyHoursTarget}
                intervalsConfig={intervalsConfig}
            />

            <CoachDataPlayground
                activities={activities}
                userSettings={userSettings}
            />

            {/* --- Tweede tijdssnede: recent vs vorig blok / jaar-context --- */}
            <CollapsibleSection
                title="Period comparison (trend)"
                subtitle="Compare your selected window with the prior stretch and longer year context."
                icon={GitCompareArrows}
                defaultExpanded={false}
            >
                <div className="overflow-x-auto rounded-lg border border-cdborder">
                    <table className="w-full text-left text-sm min-w-[640px]">
                        <thead>
                            <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                <th className="px-3 py-2 font-semibold">Window</th>
                                <th className="px-3 py-2 font-semibold">Dates</th>
                                <th className="px-3 py-2 font-semibold text-right">Rides</th>
                                <th className="px-3 py-2 font-semibold text-right">TSS/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">km/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">h/wk</th>
                                <th className="px-3 py-2 font-semibold text-right">&gt;90% FTP</th>
                                <th className="px-3 py-2 font-semibold text-right">Δ TSS</th>
                            </tr>
                        </thead>
                        <tbody className="text-cdtext">
                            {swot.periodComparison.comparisonRows.map((row) => (
                                <tr key={row.key} className="border-t border-cdborder">
                                    <td className="px-3 py-2 font-medium text-cdtext">{row.label}</td>
                                    <td className="px-3 py-2 text-cdmuted text-xs max-w-[200px]">{row.rangeLabel}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.rides}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.tssWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.kmWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.hoursWeek}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.hardSessions}</td>
                                    <td className="px-3 py-2 text-right text-xs text-cdmuted tabular-nums">
                                        {row.key === 'primary'
                                            ? '—'
                                            : formatVsPrimaryPct(row.vsPrimaryTssPct)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!swot.periodComparison.prior && swot.coachMetrics?.rideCount > 0 && (
                    <p className="text-xs text-cdmuted">
                        No direct predecessor: your selected period goes too far back or there isn't enough margin before the start date in your activity list.
                    </p>
                )}
                {!swot.periodComparison.yearRest && swot.coachMetrics?.rideCount > 0 && (
                    <p className="text-xs text-cdmuted">
                        Year context is only shown for periods from about 2 weeks to under 10 months; for &quot;all&quot; or very long ranges, use the first comparison row mainly.
                    </p>
                )}
            </CollapsibleSection>

            {/* --- Coachplan: acties + week + .zwo gekoppeld aan SWOT/data --- */}
            <CollapsibleSection
                title={coachPlan.headline}
                subtitle="Weekly proposal from your SWOT signals — adjust for schedule, weather, and recovery."
                icon={Target}
                iconClassName="text-purple-400"
                defaultExpanded={false}
                headerExtra={(
                    <label
                        className="hidden sm:flex items-center gap-2 text-xs text-cdmuted"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="font-semibold text-cdtext whitespace-nowrap">Goal</span>
                        <select
                            value={coachGoalId}
                            onChange={(e) => setCoachGoalId(e.target.value)}
                            className="bg-cdborder border border-cdborder rounded-lg px-2 py-1 text-cdtext text-xs min-w-[160px]"
                        >
                            {COACH_GOAL_OPTIONS.map((g) => (
                                <option key={g.id} value={g.id}>{g.label}</option>
                            ))}
                        </select>
                    </label>
                )}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-2 flex items-center gap-2">
                            <ListChecks size={16} className="text-cdaccent" /> Concrete actions
                        </h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-cdtext leading-relaxed">
                            {coachPlan.actions.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-2">Example week (Mon–Sun)</h4>
                        <div className="rounded-lg border border-cdborder overflow-hidden text-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                        <th className="px-3 py-2 font-semibold">Day</th>
                                        <th className="px-3 py-2 font-semibold">Focus</th>
                                        <th className="px-3 py-2 font-semibold w-24 text-right">.zwo</th>
                                    </tr>
                                </thead>
                                <tbody className="text-cdtext">
                                    {coachPlan.weekPlan.map((row, i) => (
                                        <tr key={i} className="border-t border-cdborder">
                                            <td className="px-3 py-2 font-medium whitespace-nowrap">{row.day}</td>
                                            <td className="px-3 py-2 text-cdmuted">
                                                <span className="text-cdtext font-medium">{row.session}</span>
                                                {row.detail ? (
                                                    <span className="block text-xs mt-0.5">{row.detail}</span>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-right align-top">
                                                {row.workoutId && COACH_WORKOUT_LIBRARY[row.workoutId] ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadZwo(COACH_WORKOUT_LIBRARY[row.workoutId])}
                                                        className="text-xs font-bold text-cdaccent hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Download size={12} />
                                                        Download
                                                    </button>
                                                ) : (
                                                    <span className="text-cdmuted text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {coachPlan.workouts.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-cdtext uppercase tracking-wide mb-3">Workouts from this plan (all .zwo)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {coachPlan.workouts.map((w) => {
                                const styles = getCardStyles(w.type);
                                return (
                                    <div
                                        key={w.id}
                                        className={`p-4 rounded-lg border ${styles.container} flex flex-col gap-2`}
                                    >
                                        <div className={`font-bold text-sm ${styles.text}`}>{w.title}</div>
                                        <div className="text-xs text-cdmuted">{w.duration} · {w.focus}</div>
                                        <p className="text-xs text-cdtext leading-relaxed flex-1">{w.description}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadZwo(w)}
                                            className="w-full bg-cdsurface hover:bg-cdborder text-cdtext text-xs font-bold py-2 px-3 rounded border border-cdborder flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} /> Download .zwo
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CollapsibleSection>
        </div>
    );
};

// Sub-component for cleaner SWOT rendering
const SwotCard = ({ title, items, icon, color, border }) => {
    const Icon = icon;
    return (
        <div className={`bg-cdsurface/80 p-4 rounded-lg border-l-4 ${border} h-full`}>
            <h4 className={`font-bold text-cdtext mb-3 flex items-center gap-2`}>
                <Icon size={16} className={color} /> {title}
            </h4>
            <ul className="space-y-4">
                {items.map((item, i) => (
                    <li key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-cdtext font-bold">
                            <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}></span>
                            {item.label}
                        </div>
                        <div className="text-xs text-cdmuted pl-3.5 leading-relaxed">
                            {item.context}
                        </div>
                        {item.extraActions?.length ? (
                            <ul className="mt-2 pl-3.5 space-y-1 text-xs text-cdtext list-disc list-inside border-l-2 border-cdborder ml-1">
                                {item.extraActions.map((line, j) => (
                                    <li key={j}>{line}</li>
                                ))}
                            </ul>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AICoach;
