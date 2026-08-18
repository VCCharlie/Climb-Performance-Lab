/**
 * Zwift .zwo workout file generation and browser download.
 * Shared by AI Coach and Bucket List prep exports.
 */

const ZWO_AUTHOR = 'Climb Lab Pro';

/**
 * @param {{ type: string, duration?: number, power?: number, powerLow?: number, powerHigh?: number, repeat?: number, onDuration?: number, offDuration?: number, onPower?: number, offPower?: number }} step
 */
function zwoStepToXml(step) {
    if (step.type === 'IntervalsT') {
        return `        <IntervalsT Repeat="${step.repeat}" OnDuration="${step.onDuration}" OffDuration="${step.offDuration}" OnPower="${step.onPower}" OffPower="${step.offPower}"/>`;
    }
    if (step.type === 'Warmup' || step.type === 'Cooldown') {
        return `        <${step.type} Duration="${step.duration}" PowerLow="${step.powerLow}" PowerHigh="${step.powerHigh}"/>`;
    }
    return `        <SteadyState Duration="${step.duration}" Power="${step.power}"/>`;
}

/**
 * @param {{ title: string, description?: string, zwoSteps?: object[] }} workout
 */
export function buildZwoXml(workout) {
    const title = workout.title || 'Workout';
    const description = workout.description || '';
    const steps = workout.zwoSteps || [];

    return `
<workout_file>
    <author>${ZWO_AUTHOR}</author>
    <name>${title}</name>
    <description>${description}</description>
    <sportType>bike</sportType>
    <tags><tag name="Intervals"/></tags>
    <workout>
${steps.map(zwoStepToXml).join('\n')}
    </workout>
</workout_file>`.trim();
}

/**
 * Sanitize workout title for use as a download filename.
 * @param {string} title
 */
export function zwoFilenameFromTitle(title) {
    const base = String(title || 'workout').replace(/\s+/g, '_').replace(/[^\w.-]+/g, '_');
    return `CPL_${base}.zwo`;
}

/**
 * @param {{ title: string, description?: string, zwoSteps?: object[] }} workout
 * @returns {boolean} false when workout has no steps (rest day)
 */
export function downloadZwoWorkout(workout) {
    if (!workout?.zwoSteps?.length) return false;

    const xml = buildZwoXml(workout);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zwoFilenameFromTitle(workout.title);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
}

/**
 * Download multiple .zwo files with a short stagger so the browser accepts each save.
 * @param {object[]} workouts
 * @param {number} [staggerMs]
 */
export function downloadZwoWorkouts(workouts, staggerMs = 350) {
    const list = workouts || [];
    list.forEach((workout, index) => {
        window.setTimeout(() => downloadZwoWorkout(workout), index * staggerMs);
    });
    return list.filter((w) => w?.zwoSteps?.length).length;
}
