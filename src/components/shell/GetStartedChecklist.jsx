import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, X, User, Activity, Download } from 'lucide-react';
import { Button, Card } from '../ui';
import { safeLocalStorageSet } from '../../utils/safeStorage';

const DISMISS_KEY = 'cpl.getstarted.dismissed.v1';

function readDismissed() {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * First-run checklist: profile → Intervals Athlete ID → first sync.
 */
export default function GetStartedChecklist({
    userSettings,
    intervalsConfig,
    activityCount,
    onOpenSettings,
    onGoToActivities,
}) {
    const [dismissed, setDismissed] = useState(readDismissed);

    const steps = useMemo(() => {
        const profileDone = Number(userSettings?.weight) > 0 && Number(userSettings?.ftp) > 0;
        const athleteIdDone = Boolean(String(intervalsConfig?.athleteId || '').trim());
        const syncDone = activityCount > 0;

        return [
            {
                id: 'profile',
                label: 'Set weight & FTP',
                detail: 'Needed for power zones, IF, and climb calculations.',
                done: profileDone,
                actionLabel: 'Open settings',
                onAction: onOpenSettings,
            },
            {
                id: 'athlete-id',
                label: 'Add Intervals.icu Athlete ID',
                detail: 'Find it in Intervals under Settings → Athlete. Example: i12345.',
                done: athleteIdDone,
                actionLabel: 'Open settings',
                onAction: onOpenSettings,
            },
            {
                id: 'sync',
                label: 'Import your first activities',
                detail: 'Go to Activities → Fetch & merge (or import CSV).',
                done: syncDone,
                actionLabel: 'Go to Activities',
                onAction: onGoToActivities,
            },
        ];
    }, [userSettings, intervalsConfig, activityCount, onOpenSettings, onGoToActivities]);

    const completedCount = steps.filter((s) => s.done).length;
    const allDone = completedCount === steps.length;

    if (dismissed || allDone) return null;

    const handleDismiss = () => {
        safeLocalStorageSet(DISMISS_KEY, '1');
        setDismissed(true);
    };

    const icons = { profile: User, 'athlete-id': Activity, sync: Download };

    return (
        <Card variant="outlined" padding="md" className="border-cdprimary/30 bg-cdprimarycontainer/10">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h2 className="text-sm font-head font-bold text-cdtext">Get started with Climb Lab Pro</h2>
                    <p className="text-xs text-cdmuted mt-0.5">
                        {completedCount} of {steps.length} steps complete
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-cdmuted hover:text-cdtext p-1 rounded cd-focus-ring"
                    aria-label="Dismiss get started checklist"
                >
                    <X size={16} aria-hidden />
                </button>
            </div>

            <ol className="space-y-2">
                {steps.map((step) => {
                    const Icon = icons[step.id] || Circle;
                    const StatusIcon = step.done ? CheckCircle2 : Circle;
                    return (
                        <li
                            key={step.id}
                            className={`flex items-start gap-3 rounded-cdmd border px-3 py-2.5 ${
                                step.done ? 'border-cdgreen/30 bg-cdgreen/5' : 'border-cdborder bg-cdsurface/50'
                            }`}
                        >
                            <StatusIcon
                                size={18}
                                className={`shrink-0 mt-0.5 ${step.done ? 'text-cdgreen' : 'text-cdmuted'}`}
                                aria-hidden
                            />
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-cdtext flex items-center gap-1.5">
                                    <Icon size={14} className="text-cdmuted shrink-0" aria-hidden />
                                    {step.label}
                                </p>
                                <p className="text-xs text-cdmuted mt-0.5 leading-snug">{step.detail}</p>
                                {!step.done && step.onAction && (
                                    <Button
                                        type="button"
                                        variant="text"
                                        size="sm"
                                        className="!h-8 !px-0 mt-1"
                                        onClick={step.onAction}
                                    >
                                        {step.actionLabel}
                                    </Button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </Card>
    );
}
