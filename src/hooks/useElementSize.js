import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks the content-box size of a DOM element via ResizeObserver.
 * Returns { width, height } — both 0 until the first measurement.
 */
export default function useElementSize() {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [node, setNode] = useState(null);

    const ref = useCallback((el) => {
        setNode(el);
    }, []);

    useEffect(() => {
        if (!node) return undefined;

        const update = () => {
            const { width, height } = node.getBoundingClientRect();
            setSize((prev) => {
                const w = Math.round(width);
                const h = Math.round(height);
                if (prev.width === w && prev.height === h) return prev;
                return { width: w, height: h };
            });
        };

        update();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }

        const ro = new ResizeObserver(update);
        ro.observe(node);
        return () => ro.disconnect();
    }, [node]);

    return [ref, size];
}
