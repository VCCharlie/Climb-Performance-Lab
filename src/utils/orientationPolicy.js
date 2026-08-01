/**
 * Orientation policy: portrait on mobile/touch form factors, landscape on desktop.
 * Uses viewport aspect ratio + device cues — not physical gyro lock alone.
 */

/** Phones, small tablets, and touch-first devices (aligns with Activity Log card breakpoint). */
export const MOBILE_FORM_FACTOR_QUERY =
    '(max-width: 1023px), ((hover: none) and (pointer: coarse) and (max-width: 1279px))';

export const PORTRAIT_ORIENTATION_QUERY = '(orientation: portrait)';

function getMatchMedia(query) {
    if (typeof window === 'undefined') return null;
    return window.matchMedia(query);
}

export function prefersMobileFormFactor() {
    return getMatchMedia(MOBILE_FORM_FACTOR_QUERY)?.matches ?? false;
}

export function prefersPortraitOrientation() {
    return getMatchMedia(PORTRAIT_ORIENTATION_QUERY)?.matches ?? false;
}

/**
 * @param {{ mobile?: boolean, portrait?: boolean }} state
 * @returns {'portrait' | 'landscape' | null} null when already compliant
 */
export function getOrientationMismatch(state) {
    const mobile = state.mobile ?? prefersMobileFormFactor();
    const portrait = state.portrait ?? prefersPortraitOrientation();

    if (mobile && !portrait) return 'portrait';
    if (!mobile && portrait) return 'landscape';
    return null;
}

export function isOrientationCompliant(state = {}) {
    return getOrientationMismatch(state) === null;
}

export function subscribeOrientationPolicy(callback) {
    if (typeof window === 'undefined') return () => {};

    const mobileMq = getMatchMedia(MOBILE_FORM_FACTOR_QUERY);
    const portraitMq = getMatchMedia(PORTRAIT_ORIENTATION_QUERY);

    const notify = () => callback();
    mobileMq?.addEventListener('change', notify);
    portraitMq?.addEventListener('change', notify);
    window.addEventListener('resize', notify);
    window.addEventListener('orientationchange', notify);

    return () => {
        mobileMq?.removeEventListener('change', notify);
        portraitMq?.removeEventListener('change', notify);
        window.removeEventListener('resize', notify);
        window.removeEventListener('orientationchange', notify);
    };
}

export function getOrientationPolicySnapshot() {
    const mobile = prefersMobileFormFactor();
    const portrait = prefersPortraitOrientation();
    return getOrientationMismatch({ mobile, portrait });
}

/**
 * Best-effort lock for installed PWAs. Browsers may reject outside fullscreen/standalone.
 * @param {'portrait' | 'landscape'} mode
 */
export async function tryLockScreenOrientation(mode) {
    if (typeof window === 'undefined') return false;
    const lock = window.screen?.orientation?.lock;
    if (typeof lock !== 'function') return false;

    try {
        await lock.call(window.screen.orientation, mode);
        return true;
    } catch {
        return false;
    }
}
