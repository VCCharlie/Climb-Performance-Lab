import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { analyzeTrainingPeriod, PERIOD_REVIEW_OPTIONS } from '../../utils/coach/coachPeriodAnalysis';
import CollapsibleSection from '../ui/CollapsibleSection';

const GRADE_STYLES = {
    good: { border: 'border-green-500/50', badge: 'bg-green-500/15 text-green-400' },
    caution: { border: 'border-red-500/50', badge: 'bg-red-500/15 text-red-400' },
    building: { border: 'border-blue-500/50', badge: 'bg-blue-500/15 text-blue-400' },
    neutral: { border: 'border-cdaccent/50', badge: 'bg-cdaccent/15 text-cdaccent' },
};

const CoachPeriodReview = ({ activities, userSettings, weeklyHoursTarget }) => {
    const [weeks, setWeeks] = useState(4);

    const review = useMemo(
        () => analyzeTrainingPeriod(activities, { ...userSettings, weeklyHoursTarget }, weeks),
        [activities, userSettings, weeklyHoursTarget, weeks]
    );

    const gradeStyle = GRADE_STYLES[review.verdict.grade] || GRADE_STYLES.neutral;
    const { metrics, swot, verdict } = review;

    return (
        <CollapsibleSection
            title="Period review & verdict"
            subtitle={`Goal-aware SWOT — ${review.weeks} week window · grade: ${verdict.grade}`}
            icon={FileText}
            borderClassName={`border-2 ${gradeStyle.border}`}
            defaultExpanded={false}
            headerExtra={(
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()} role="presentation">
                    {PERIOD_REVIEW_OPTIONS.map((opt) => (
                        <button
                            key={opt.weeks}
                            type="button"
                            onClick={() => setWeeks(opt.weeks)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                                weeks === opt.weeks
                                    ? 'border-cdaccent bg-cdaccent/15 text-cdaccent'
                                    : 'border-cdborder text-cdmuted hover:text-cdtext'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        >
            <div className="space-y-5 -mt-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${gradeStyle.badge}`}>
                            {verdict.grade}
                        </span>
                        <h4 className="text-xl font-bold text-cdtext mt-2">{verdict.headline}</h4>
                    </div>
                    <div className="flex flex-wrap gap-4 text-center">
                        <MetricPill label="Rides/wk" value={metrics.ridesPerWeek} />
                        <MetricPill label="h/wk" value={metrics.hoursPerWeek} />
                        <MetricPill label="TSS/wk" value={metrics.tssPerWeek} />
                        <MetricPill label="TSB" value={metrics.endTsb ?? '—'} />
                    </div>
                </div>

                <div className="space-y-3">
                    {verdict.paragraphs.map((p, i) => (
                        <p key={i} className="text-sm text-cdtext leading-relaxed">{p}</p>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SwotMini title="Strengths" items={swot.strengths} icon={CheckCircle} color="text-green-500" />
                    <SwotMini title="Weaknesses" items={swot.weaknesses} icon={AlertTriangle} color="text-red-500" />
                    <SwotMini title="Opportunities" items={swot.opportunities} icon={TrendingUp} color="text-blue-500" />
                    <SwotMini title="Threats" items={swot.threats} icon={Activity} color="text-yellow-500" />
                </div>

                <div className="rounded-lg border border-cdborder p-4 bg-cdborder/10">
                    <p className="text-xs font-bold uppercase text-cdmuted mb-2">Recommended next steps</p>
                    <ul className="space-y-1.5">
                        {verdict.nextSteps.map((step, i) => (
                            <li key={i} className="text-sm text-cdtext flex items-start gap-2">
                                <span className="text-cdaccent font-bold">{i + 1}.</span>
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </CollapsibleSection>
    );
};

function MetricPill({ label, value }) {
    return (
        <div className="min-w-[72px]">
            <div className="text-lg font-bold text-cdtext tabular-nums">{value}</div>
            <div className="text-[10px] text-cdmuted uppercase">{label}</div>
        </div>
    );
}

function SwotMini({ title, items, icon: Icon, color }) {
    return (
        <div className="rounded-lg border border-cdborder p-3 h-full">
            <h5 className="text-sm font-bold text-cdtext flex items-center gap-1.5 mb-2">
                <Icon size={14} className={color} />
                {title}
            </h5>
            <ul className="space-y-2">
                {items.slice(0, 2).map((item, i) => (
                    <li key={i}>
                        <p className="text-xs font-semibold text-cdtext">{item.label}</p>
                        <p className="text-xs text-cdmuted leading-relaxed">{item.context}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CoachPeriodReview;
