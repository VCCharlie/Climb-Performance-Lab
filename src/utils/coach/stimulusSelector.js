/**
 * Deterministic stimulus selection from coach features.
 */

/**
 * @param {object} features — coachContext subset
 * @returns {'recovery'|'endurance'|'sweetspot'|'threshold'|'vo2'}
 */
export function selectStimulus(features) {
    const { fitness, intensityProfile, powerCeiling, athlete } = features;
    const { tsb, atl, ctl } = fitness;

    if (tsb < -25) return 'recovery';
    if (tsb < -15 && atl > ctl * 1.1) return 'recovery';
    if (intensityProfile.hardSessionCount >= 3) return 'endurance';
    if (intensityProfile.daysSinceHard != null && intensityProfile.daysSinceHard < 2) {
        return 'endurance';
    }

    if (tsb >= -5 && tsb <= 15 && intensityProfile.sweetspotPct < 15) return 'sweetspot';
    if (tsb > 10 && intensityProfile.thresholdPct < 10) return 'threshold';
    if (powerCeiling.sustainedWeakness && tsb > 0) return 'sweetspot';
    if (
        intensityProfile.vo2Pct < 5
        && athlete.ftp > 0
        && powerCeiling.best5min < athlete.ftp * 1.05
    ) {
        return 'vo2';
    }
    if (intensityProfile.z1z2Pct < 65) return 'endurance';

    return 'sweetspot';
}

/**
 * Human-readable rationale for the selected stimulus.
 * @param {string} stimulus
 * @param {object} features
 */
export function stimulusRationale(stimulus, features) {
    const { fitness, intensityProfile, weeklyLoad } = features;
    const { tsb } = fitness;

    switch (stimulus) {
        case 'recovery':
            if (tsb < -25) {
                return 'Form is very low (TSB below -25). Recovery takes priority over any quality work.';
            }
            return 'Recent fatigue is high. An easy day protects adaptation and prevents overreach.';
        case 'endurance':
            if (intensityProfile.hardSessionCount >= 3) {
                return 'You already banked multiple hard sessions this fortnight — base endurance consolidates fitness.';
            }
            if (intensityProfile.z1z2Pct < 65) {
                return 'Easy volume has been low relative to intensity. Rebuild your aerobic base before adding more quality.';
            }
            return 'A steady endurance ride fits your current load profile and keeps momentum without extra stress.';
        case 'threshold':
            return 'You are relatively fresh with limited threshold work recently — a controlled FTP stimulus can raise your ceiling.';
        case 'vo2':
            return 'Short power above FTP looks under-trained. Light VO2 work can raise your aerobic ceiling.';
        case 'sweetspot':
        default:
            if (weeklyLoad.compliancePct < 80) {
                return 'Sweetspot is the most efficient FTP builder for limited hours — high return without digging a deep fatigue hole.';
            }
            return 'Sweetspot bridges endurance and threshold: sustained sub-maximal work that grows FTP on flat polder roads.';
    }
}
