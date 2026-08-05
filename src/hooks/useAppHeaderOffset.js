import { useCallback, useEffect, useState } from 'react';

function readHeaderOffset() {
    if (typeof document === 'undefined') return 56;
    const header = document.querySelector('header');
    return header ? Math.ceil(header.getBoundingClientRect().height) : 56;
}

/**
 * Live height of the sticky site header — used to pin dashboard toolbars just below the banner.
 */
export default function useAppHeaderOffset() {
    const [offset, setOffset] = useState(readHeaderOffset);

    const measure = useCallback(() => {
        setOffset(readHeaderOffset());
    }, []);

    useEffect(() => {
        const header = document.querySelector('header');
        if (!header || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }

        const ro = new ResizeObserver(measure);
        ro.observe(header);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    return offset;
}
