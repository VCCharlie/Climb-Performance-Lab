import React from 'react';
import { Wind, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { getStimulusStyle } from './coachStimulusStyles';

/**
 * Compact or full fluid workout detail — used in week plan rows and focus card.
 */
const FluidWorkoutExpandable = ({ workout, compact = false, defaultOpen = false, embedded = false }) => {
    const [open, setOpen] = React.useState(defaultOpen);
    if (!workout) return null;

    const styles = getStimulusStyle(workout.stimulus);

    if (compact && !open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-2 text-xs font-medium text-cdaccent hover:underline flex items-center gap-1"
            >
                View workout details
                <ChevronDown size={12} />
            </button>
        );
    }

    const rootMarginClass = embedded ? 'mt-0' : 'mt-3';

    return (
        <div className={`${rootMarginClass} max-w-full min-w-0 rounded-lg border border-cdborder bg-cdborder/10 overflow-hidden`}>
            {compact && (
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-cdmuted hover:bg-cdborder/20"
                >
                    Workout details
                    <ChevronUp size={14} />
                </button>
            )}
            <div className="p-3 space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-cdmuted">
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {workout.totalMinutes.min}–{workout.totalMinutes.max} min
                    </span>
                    <span className="flex items-center gap-1">
                        <Zap size={12} className={styles.accent} />
                        {workout.rpeTarget}
                    </span>
                </div>

                {workout.warmup && (
                    <DetailBlock title="Warm-up" text={`${workout.warmup.minutes} min — ${workout.warmup.guidance}`} />
                )}

                {workout.mainSet && (
                    <div>
                        <p className="text-[10px] font-bold uppercase text-cdmuted mb-1 flex items-center gap-1">
                            <Wind size={11} className={styles.accent} />
                            Main set
                        </p>
                        <p className="text-xs text-cdtext mb-2">{workout.mainSet.description}</p>
                        {workout.mainSet.blocks?.length > 0 && (
                            <ul className="space-y-1.5 mb-2">
                                {workout.mainSet.blocks.map((block, i) => (
                                    <li key={i} className="text-xs bg-cdsurface/80 rounded-md px-2.5 py-2 border border-cdborder/50">
                                        <span className="font-semibold text-cdtext">
                                            {block.reps}× {block.workMin} min {block.zone}
                                        </span>
                                        {block.recoveryMin > 0 && (
                                            <span className="text-cdmuted"> · {block.recoveryMin} min easy</span>
                                        )}
                                        {(block.wattRange || block.powerHint) && (
                                            <span className="block text-cdmuted mt-0.5">
                                                {block.powerHint}{block.wattRange ? ` (${block.wattRange})` : ''}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {workout.mainSet.outdoorTips?.map((tip, i) => (
                            <p key={i} className="text-[11px] text-cdmuted flex gap-1.5 mb-1">
                                <Wind size={10} className="shrink-0 mt-0.5 text-cdaccent" />
                                {tip}
                            </p>
                        ))}
                    </div>
                )}

                {workout.cooldown && (
                    <DetailBlock title="Cool-down" text={`${workout.cooldown.minutes} min — ${workout.cooldown.guidance}`} />
                )}

                {workout.shortOnTimeAlternative && (
                    <div className="rounded-md border border-cdborder/60 bg-cdsurface/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-cdmuted">Short on time</p>
                        <p className="text-xs text-cdtext mt-0.5">{workout.shortOnTimeAlternative.summary}</p>
                    </div>
                )}

                {workout.successCheck?.length > 0 && (
                    <ul className="space-y-1">
                        {workout.successCheck.map((item, i) => (
                            <li key={i} className="text-[11px] text-cdtext flex gap-2">
                                <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

function DetailBlock({ title, text }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase text-cdmuted mb-0.5">{title}</p>
            <p className="text-xs text-cdtext">{text}</p>
        </div>
    );
}

export default FluidWorkoutExpandable;
