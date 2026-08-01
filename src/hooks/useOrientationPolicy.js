import { useSyncExternalStore, useEffect } from 'react';
import {
    getOrientationPolicySnapshot,
    subscribeOrientationPolicy,
    tryLockScreenOrientation,
} from '../utils/orientationPolicy';
import { isStandaloneDisplayMode } from '../utils/pwa';

function subscribe(callback) {
    return subscribeOrientationPolicy(callback);
}

function getSnapshot() {
    return getOrientationPolicySnapshot();
}

function getServerSnapshot() {
    return null;
}

/**
 * Tracks mobile vs desktop form factor and whether the current orientation matches policy.
 */
export default function useOrientationPolicy() {
    const mismatch = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    useEffect(() => {
        if (!mismatch || !isStandaloneDisplayMode()) return undefined;

        let cancelled = false;
        tryLockScreenOrientation(mismatch).then(() => {
            if (cancelled) return;
        });

        return () => {
            cancelled = true;
        };
    }, [mismatch]);

    return { mismatch };
}
