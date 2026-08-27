import React from 'react';
import { Target, Wind, Clock, AlertTriangle, Zap } from 'lucide-react';
import { getStimulusStyle } from './coachStimulusStyles';

const TodaysFocusCard = ({ coachContext }) => {
    if (!coachContext?.fluidWorkout) return null;

    const workout = coachContext.fluidWorkout;
    const styles = getStimulusStyle(workout.stimulus);
    const { fitness, weeklyLoad } = coachContext;

    return (
        <div className={`bg-cdsurface rounded-xl border-2 ${styles.border} shadow-xl overflow-hidden`}>
            <div className="p-5 border-b border-cdborder">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                            <Target size={14} className={styles.accent} />
                            Today&apos;s suggested focus
                        </p>
                        <h3 className="text-lg font-bold text-cdtext mt-1">{workout.name}</h3>
                        <p className="text-sm text-cdmuted mt-1 leading-relaxed">
                            {coachContext.stimulusRationale}
                        </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                        {workout.stimulusLabel}
                    </span>
                </div>

                <div className="flex flex-wrap gap-3 mt-4 text-xs">
                    <span className="flex items-center gap-1.5 text-cdmuted">
                        <Clock size={13} />
                        {workout.totalMinutes.min}–{workout.totalMinutes.max} min
                    </span>
                    <span className="flex items-center gap-1.5 text-cdmuted">
                        <Zap size={13} />
                        {workout.rpeTarget}
                    </span>
                    <span className="tabular-nums text-cdmuted">
                        TSB {fitness.tsb}
                        {weeklyLoad.targetTss > 0 ? (
                            <>
                                {' · Week TSS '}
                                {weeklyLoad.actualTss}/{weeklyLoad.targetTss}
                                {weeklyLoad.compliancePct != null ? ` (${weeklyLoad.compliancePct}%)` : ''}
                            </>
                        ) : null}
                    </span>
                </div>
            </div>

            {coachContext.warnings?.length > 0 && (
                <div className="px-5 py-3 bg-cdprimarycontainer/20 border-b border-cdborder">
                    {coachContext.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-cdprimary flex items-start gap-2">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            {w}
                        </p>
                    ))}
                </div>
            )}

            <div className="p-5 space-y-4">
                <Section title="Warm-up" content={workout.warmup} />
                <MainSetSection workout={workout} styles={styles} />
                <Section title="Cool-down" content={workout.cooldown} />

                {workout.shortOnTimeAlternative && (
                    <div className="rounded-lg border border-cdborder bg-cdborder/20 p-4">
                        <p className="text-xs font-bold uppercase text-cdmuted mb-1">Short on time?</p>
                        <p className="text-sm font-medium text-cdtext">
                            {workout.shortOnTimeAlternative.summary}
                            {' '}
                            <span className="text-cdmuted font-normal">
                                ({workout.shortOnTimeAlternative.totalMinutes} min)
                            </span>
                        </p>
                        <p className="text-xs text-cdmuted mt-1">
                            Keep: {workout.shortOnTimeAlternative.whatYouKeep}. Cut: {workout.shortOnTimeAlternative.whatYouCut}.
                        </p>
                    </div>
                )}

                <div>
                    <p className="text-xs font-bold uppercase text-cdmuted mb-2">Success check</p>
                    <ul className="space-y-1">
                        {workout.successCheck.map((item, i) => (
                            <li key={i} className="text-xs text-cdtext flex items-start gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${styles.accent.replace('text-', 'bg-')}`} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

function Section({ title, content }) {
    if (!content) return null;
    return (
        <div>
            <p className="text-xs font-bold uppercase text-cdmuted mb-1">{title}</p>
            <p className="text-sm text-cdtext">
                {content.minutes} min — {content.guidance}
            </p>
        </div>
    );
}

function MainSetSection({ workout, styles }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase text-cdmuted mb-2 flex items-center gap-1.5">
                <Wind size={13} className={styles.accent} />
                Key intervals to include
            </p>
            <p className="text-sm text-cdtext mb-2">{workout.mainSet.description}</p>

            {workout.mainSet.blocks?.length > 0 && (
                <ul className="space-y-2 mb-3">
                    {workout.mainSet.blocks.map((block, i) => (
                        <li
                            key={i}
                            className="text-sm text-cdtext bg-cdborder/25 rounded-lg px-3 py-2"
                        >
                            <span className="font-semibold">
                                {block.reps}× {block.workMin} min {block.zone}
                            </span>
                            {block.recoveryMin > 0 && (
                                <span className="text-cdmuted"> · {block.recoveryMin} min easy between</span>
                            )}
                            <span className="block text-xs text-cdmuted mt-0.5">
                                {block.powerHint}
                                {block.wattRange ? ` (${block.wattRange})` : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {workout.mainSet.outdoorTips?.length > 0 && (
                <ul className="space-y-1.5">
                    {workout.mainSet.outdoorTips.map((tip, i) => (
                        <li key={i} className="text-xs text-cdmuted flex items-start gap-2">
                            <Wind size={12} className="shrink-0 mt-0.5 text-cdaccent" />
                            {tip}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TodaysFocusCard;