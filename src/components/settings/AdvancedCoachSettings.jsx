import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { inputNumberClass } from '../ui';
import {
    DEFAULT_COACH_THRESHOLDS,
    DEFAULT_RECOVERY_THRESHOLDS,
    mergeCoachThresholds,
    mergeRecoveryThresholds,
} from '../../utils/coachThresholds';

const AdvancedCoachSettings = ({ userSettings, updateUserSettings }) => {
    const [expanded, setExpanded] = useState(false);
    const coach = mergeCoachThresholds(userSettings.coachThresholds);
    const recovery = mergeRecoveryThresholds(userSettings.recoveryThresholds);

    const updateCoach = (key, value) => {
        updateUserSettings('coachThresholds', { ...coach, [key]: Number(value) });
    };

    const updateRecovery = (key, value) => {
        updateUserSettings('recoveryThresholds', { ...recovery, [key]: Number(value) });
    };

    return (
        <div className="rounded-cdlg border border-cdborder bg-cdsurface p-6">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 pb-2 border-b border-cdborder/50 mb-4 text-left cd-focus-ring rounded"
                aria-expanded={expanded}
            >
                <span className="flex items-center gap-2">
                    <Brain className="text-purple-400" size={18} aria-hidden />
                    <span className="font-bold text-cdtext">Advanced coach & recovery</span>
                </span>
                {expanded ? <ChevronUp size={18} className="text-cdmuted" /> : <ChevronDown size={18} className="text-cdmuted" />}
            </button>

            <p className="text-xs text-cdmuted mb-4 leading-relaxed">
                Tune SWOT analysis and recovery recommendations. Values scale with your selected dashboard date range where noted.
            </p>

            {expanded && (
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-cdtext uppercase tracking-wide mb-3">Coach SWOT</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Strong weekly load (TSS)" value={coach.highWeeklyLoadTss} onChange={(v) => updateCoach('highWeeklyLoadTss', v)} />
                            <Field label="Low weekly load (TSS)" value={coach.lowWeeklyLoadTss} onChange={(v) => updateCoach('lowWeeklyLoadTss', v)} />
                            <Field label="High consistency / 30 days" value={coach.consistencyHighPer30Days} onChange={(v) => updateCoach('consistencyHighPer30Days', v)} />
                            <Field label="Low frequency / 30 days" value={coach.consistencyLowPer30Days} onChange={(v) => updateCoach('consistencyLowPer30Days', v)} />
                            <Field label="Intensity overload / 30 days" value={coach.intensityHighPer30Days} onChange={(v) => updateCoach('intensityHighPer30Days', v)} />
                            <Field label="Intensity gap / 30 days" value={coach.intensityLowPer30Days} onChange={(v) => updateCoach('intensityLowPer30Days', v)} />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-cdborder/40">
                        <h4 className="text-xs font-bold text-cdtext uppercase tracking-wide mb-3">Recovery advisor</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="TSB critical (overtraining)" value={recovery.tsbCritical} onChange={(v) => updateRecovery('tsbCritical', v)} />
                            <Field label="TSB fatigue warning" value={recovery.tsbFatigue} onChange={(v) => updateRecovery('tsbFatigue', v)} />
                            <Field label="Race form TSB min" value={recovery.tsbRaceMin} onChange={(v) => updateRecovery('tsbRaceMin', v)} />
                            <Field label="Race form TSB max" value={recovery.tsbRaceMax} onChange={(v) => updateRecovery('tsbRaceMax', v)} />
                            <Field label="TSB over-recovered" value={recovery.tsbOverRecovered} onChange={(v) => updateRecovery('tsbOverRecovered', v)} />
                            <Field label="Monotony caution" value={recovery.monotonyHigh} step="0.1" onChange={(v) => updateRecovery('monotonyHigh', v)} />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="text-xs text-cdaccent hover:underline"
                        onClick={() => {
                            updateUserSettings('coachThresholds', { ...DEFAULT_COACH_THRESHOLDS });
                            updateUserSettings('recoveryThresholds', { ...DEFAULT_RECOVERY_THRESHOLDS });
                        }}
                    >
                        Reset thresholds to defaults
                    </button>
                </div>
            )}
        </div>
    );
};

function Field({ label, value, onChange, step = '1' }) {
    return (
        <div>
            <label className="block text-[10px] font-semibold mb-1 text-cdmuted">{label}</label>
            <input
                type="number"
                step={step}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className={inputNumberClass}
            />
        </div>
    );
}

export default AdvancedCoachSettings;
