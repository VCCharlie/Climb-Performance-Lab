import React, { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_EDGE_THRESHOLD = 4;

/**
 * Horizontally scrollable table wrapper with edge fades and a mobile swipe hint.
 */
export default function DashboardTableScrollShell({ children, className = '' }) {
    const scrollRef = useRef(null);
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

    const showHint = edges.right;

    return (
        <div className={`relative ${className}`.trim()}>
            {showHint && (
                <p className="sm:hidden text-[10px] text-cdmuted mb-1.5 flex items-center gap-1">
                    <span aria-hidden>↔</span>
                    Swipe sideways for links and full ride names
                </p>
            )}
            <div
                ref={scrollRef}
                className="overflow-x-auto rounded-lg border border-cdborder scroll-smooth -mx-0.5 px-0.5"
            >
                {children}
            </div>
            {edges.left && (
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-6 z-10 dashboard-table-scroll-fade-left"
                    aria-hidden
                />
            )}
            {edges.right && (
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-6 z-10 dashboard-table-scroll-fade-right"
                    aria-hidden
                />
            )}
        </div>
    );
}
