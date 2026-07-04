import { useState, useEffect } from 'react';

/**
 * Subscribe to a CSS media query. Uses matchMedia with a change listener.
 * @param {string} query
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = (e) => setMatches(e.matches);
        mq.addEventListener('change', onChange);
        setMatches(mq.matches);
        return () => mq.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

/** Tailwind `md` breakpoint — card layout below this width. */
export const MOBILE_CARD_LAYOUT_MQ = '(max-width: 767px)';
