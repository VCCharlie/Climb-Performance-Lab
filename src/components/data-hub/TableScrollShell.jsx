import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tableShellClass } from '../ui/tableStyles';

const SCROLL_STEP_PX = 220;
const SCROLL_EDGE_THRESHOLD = 4;

/**
 * Horizontally scrollable table shell with edge fade hints and optional nudge buttons.
 */
const TableScrollShell = React.forwardRef(({ children, className = '' }, forwardedRef) => {
    const scrollRef = useRef(null);

    const setScrollRef = useCallback((node) => {
        scrollRef.current = node;
        if (typeof forwardedRef === 'function') {
            forwardedRef(node);
        } else if (forwardedRef) {
            forwardedRef.current = node;
        }
    }, [forwardedRef]);
    const [edges, setEdges] = useState({ left: false, right: false });

    const updateEdges = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setEdges({
            left: scrollLeft > SCROLL_EDGE_THRESHOLD,
            right: scrollLeft + clientWidth < scrollWidth - SCROLL_EDGE_THRESHOLD,
        });
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return undefined;

        updateEdges();
        el.addEventListener('scroll', updateEdges, { passive: true });
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null;
        ro?.observe(el);

        return () => {
            el.removeEventListener('scroll', updateEdges);
            ro?.disconnect();
        };
    }, [updateEdges, children]);

    const nudge = (direction) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: 'smooth' });
    };

    const showAffordances = edges.left || edges.right;

    return (
        <div className={`relative flex-1 min-h-0 ${className}`.trim()}>
            <div
                ref={setScrollRef}
                className={`${tableShellClass} scroll-smooth`}
            >
                {children}
            </div>

            {edges.left && (
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-8 z-[15] rounded-l-cdlg activity-table-scroll-fade-left"
                    aria-hidden
                />
            )}
            {edges.right && (
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-8 z-[15] rounded-r-cdlg activity-table-scroll-fade-right"
                    aria-hidden
                />
            )}

            {showAffordances && edges.left && (
                <button
                    type="button"
                    onClick={() => nudge(-1)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-[16] p-1.5 rounded-full border border-cdborder/70 bg-cdsurface/95 text-cdmuted hover:text-cdtext shadow-md cd-transition cd-focus-ring hidden sm:flex"
                    aria-label="Scroll table left"
                >
                    <ChevronLeft size={16} aria-hidden />
                </button>
            )}
            {showAffordances && edges.right && (
                <button
                    type="button"
                    onClick={() => nudge(1)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-[16] p-1.5 rounded-full border border-cdborder/70 bg-cdsurface/95 text-cdmuted hover:text-cdtext shadow-md cd-transition cd-focus-ring hidden sm:flex"
                    aria-label="Scroll table right"
                >
                    <ChevronRight size={16} aria-hidden />
                </button>
            )}
        </div>
    );
});

TableScrollShell.displayName = 'TableScrollShell';

export default TableScrollShell;
