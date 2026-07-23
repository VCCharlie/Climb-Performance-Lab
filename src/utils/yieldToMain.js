/**
 * Yield to the browser so paint/input handlers can run between heavy loops.
 * @returns {Promise<void>}
 */
export function yieldToMain() {
    if (typeof globalThis.scheduler !== 'undefined' && typeof globalThis.scheduler.yield === 'function') {
        return globalThis.scheduler.yield();
    }
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}
