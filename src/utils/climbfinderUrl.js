/**
 * Climbfinder URL helpers — match database climbs, no scraping.
 */

/**
 * @param {string | null | undefined} url
 * @returns {string | null} slug from /en/climbs/{slug}
 */
export function parseClimbfinderSlug(url) {
    const raw = (url || '').trim();
    if (!raw) return null;
    try {
        const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
        const u = new URL(withProto);
        if (!u.hostname.toLowerCase().includes('climbfinder.com')) return null;
        const match = u.pathname.match(/\/climbs\/([^/?#]+)/i);
        return match ? decodeURIComponent(match[1]).toLowerCase() : null;
    } catch {
        return null;
    }
}

/**
 * @param {string | null | undefined} slug
 * @param {object[]} climbs
 * @returns {object | null}
 */
export function findClimbByClimbfinderSlug(slug, climbs) {
    const s = (slug || '').trim().toLowerCase();
    if (!s || !Array.isArray(climbs)) return null;

    return climbs.find((c) => {
        const url = (c.url || '').toLowerCase();
        if (url.includes(`/climbs/${s}`)) return true;
        return false;
    }) || null;
}

/**
 * @param {string | null | undefined} url
 * @param {object[]} climbs
 * @returns {{ slug: string | null, climb: object | null }}
 */
export function resolveClimbFromClimbfinderUrl(url, climbs) {
    const slug = parseClimbfinderSlug(url);
    const climb = findClimbByClimbfinderSlug(slug, climbs);
    return { slug, climb };
}

/**
 * @param {object | null | undefined} climb
 * @returns {string | null}
 */
export function climbfinderUrlForClimb(climb) {
    const url = climb?.url;
    if (typeof url === 'string' && url.includes('climbfinder.com')) return url;
    return null;
}
