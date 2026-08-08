import { useCallback, useEffect, useRef, useState } from 'react';
import {
    SCRUB_LONG_PRESS_MS,
    classifyTouchGesture,
    findNearestDataIndexByX,
    getScrubChartMargins,
} from '../utils/chartTouchScrubber';

/**
 * Touch-optimized scrubber for Recharts time-series charts.
 *
 * Gesture strategy:
 * - Default: touch-action pan-y — vertical page scroll stays fluid.
 * - Long-press or clear horizontal drag: enter scrub mode (touch-action none).
 * - Vertical-first movement releases the chart and lets the page scroll.
 *
 * @param {object} options
 * @param {Array<Record<string, unknown>>} options.data
 * @param {string} [options.xKey='dateNum']
 * @param {number} [options.defaultIndex] — initial / fallback index (e.g. last point)
 * @param {boolean} [options.enabled=true]
 * @param {boolean} [options.isCompact=false] — mobile layout (tighter margins)
 */
export default function useChartTouchScrubber({
    data,
    xKey = 'dateNum',
    defaultIndex = 0,
    enabled = true,
    isCompact = false,
}) {
    const wrapperRef = useRef(null);
    const pointerStartRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const scrubbingRef = useRef(false);
    const gestureLockedRef = useRef(false);

    const [activeIndex, setActiveIndex] = useState(defaultIndex);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [gestureMode, setGestureMode] = useState('idle');

    const margins = getScrubChartMargins(isCompact);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current != null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const resolveIndexFromClientX = useCallback(
        (clientX) => {
            const el = wrapperRef.current;
            if (!el || !data?.length) return defaultIndex;
            const rect = el.getBoundingClientRect();
            return findNearestDataIndexByX(
                data,
                clientX,
                {
                    left: rect.left,
                    width: rect.width,
                    marginLeft: margins.left,
                    marginRight: margins.right,
                },
                xKey,
            );
        },
        [data, defaultIndex, margins.left, margins.right, xKey],
    );

    const enterScrubMode = useCallback(() => {
        scrubbingRef.current = true;
        setIsScrubbing(true);
        setGestureMode('scrubbing');
    }, []);

    const exitScrubMode = useCallback(() => {
        scrubbingRef.current = false;
        setIsScrubbing(false);
        setGestureMode('idle');
        gestureLockedRef.current = false;
        pointerStartRef.current = null;
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const updateIndexFromEvent = useCallback(
        (clientX) => {
            const idx = resolveIndexFromClientX(clientX);
            setActiveIndex(idx);
            return idx;
        },
        [resolveIndexFromClientX],
    );

    const onPointerDown = useCallback(
        (event) => {
            if (!enabled || !data?.length) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;

            pointerStartRef.current = {
                x: event.clientX,
                y: event.clientY,
                pointerId: event.pointerId,
            };
            gestureLockedRef.current = false;

            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // setPointerCapture may fail on some browsers — scrub still works.
            }

            updateIndexFromEvent(event.clientX);

            if (event.pointerType === 'touch') {
                setGestureMode('pending');
                clearLongPressTimer();
                longPressTimerRef.current = setTimeout(() => {
                    if (!pointerStartRef.current) return;
                    gestureLockedRef.current = true;
                    enterScrubMode();
                }, SCRUB_LONG_PRESS_MS);
            } else {
                enterScrubMode();
            }
        },
        [clearLongPressTimer, data?.length, enabled, enterScrubMode, updateIndexFromEvent],
    );

    const onPointerMove = useCallback(
        (event) => {
            if (!enabled || !pointerStartRef.current) return;
            if (pointerStartRef.current.pointerId !== event.pointerId) return;

            const dx = event.clientX - pointerStartRef.current.x;
            const dy = event.clientY - pointerStartRef.current.y;

            if (!scrubbingRef.current && event.pointerType === 'touch' && !gestureLockedRef.current) {
                const direction = classifyTouchGesture(dx, dy);
                if (direction === 'vertical') {
                    exitScrubMode();
                    try {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    } catch {
                        // ignore
                    }
                    return;
                }
                if (direction === 'horizontal') {
                    gestureLockedRef.current = true;
                    clearLongPressTimer();
                    enterScrubMode();
                }
            }

            if (scrubbingRef.current) {
                event.preventDefault();
                updateIndexFromEvent(event.clientX);
            }
        },
        [clearLongPressTimer, enabled, enterScrubMode, exitScrubMode, updateIndexFromEvent],
    );

    const onPointerUp = useCallback(
        (event) => {
            if (!pointerStartRef.current) return;
            if (pointerStartRef.current.pointerId !== event.pointerId) return;

            clearLongPressTimer();

            if (scrubbingRef.current) {
                updateIndexFromEvent(event.clientX);
            }

            scrubbingRef.current = false;
            setIsScrubbing(false);
            setGestureMode('idle');
            gestureLockedRef.current = false;
            pointerStartRef.current = null;

            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        },
        [clearLongPressTimer, updateIndexFromEvent],
    );

    const onPointerCancel = useCallback(
        (event) => {
            exitScrubMode();
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        },
        [exitScrubMode],
    );

    const onMouseMove = useCallback(
        (event) => {
            if (!enabled || isScrubbing) return;
            if (event.pointerType === 'touch') return;
            updateIndexFromEvent(event.clientX);
        },
        [enabled, isScrubbing, updateIndexFromEvent],
    );

    const onMouseLeave = useCallback(() => {
        if (!isScrubbing) {
            setActiveIndex(defaultIndex);
        }
    }, [defaultIndex, isScrubbing]);

    useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

    const touchAction = isScrubbing ? 'none' : 'pan-y';

    return {
        wrapperRef,
        activeIndex,
        activeDatum: data?.[activeIndex] ?? null,
        isScrubbing,
        gestureMode,
        margins,
        touchAction,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            onMouseMove,
            onMouseLeave,
        },
    };
}
