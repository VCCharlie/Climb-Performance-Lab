/**
 * Recovery load (TSS) for Activity Log bulk "Mark recovery" action.
 */

import { DEFAULT_RECOVERY_TSS } from '../config';

/**
 * @param {object | null | undefined} userSettings
 * @returns {number}
 */
export function resolveRecoveryTss(userSettings) {
    const n = Number(userSettings?.recoveryTss);
    if (Number.isFinite(n) && n >= 0 && n <= 999) return Math.round(n);
    return DEFAULT_RECOVERY_TSS;
}

/**
 * @param {number} count
 * @param {number} tss
 * @returns {string}
 */
export function buildMarkRecoveryConfirmMessage(count, tss) {
    const n = Math.max(0, Number(count) || 0);
    const load = resolveRecoveryTss({ recoveryTss: tss });
    const noun = n === 1 ? 'activity' : 'activities';
    return (
        `Mark ${n} selected ${noun} as recovery?\n\n`
        + `This sets Load (TSS) to ${load} on each selected row. Power, distance, and other fields stay unchanged.\n\n`
        + 'Change this default in Settings → Activity Log.'
    );
}

/**
 * @param {number} tss
 * @returns {string}
 */
export function buildMarkRecoveryTooltip(tss) {
    const load = resolveRecoveryTss({ recoveryTss: tss });
    return (
        `Set Load (TSS) to ${load} on all selected rows. `
        + 'Use for easy recovery rides when the imported training stress is too high. '
        + 'Only the load column changes; you will be asked to confirm first. '
        + 'Adjust this value in Settings → Activity Log.'
    );
}
