/**
 * User-configurable banner quick links (max 5).
 */

export const MAX_QUICK_LINKS = 5;

export const QUICK_LINK_ICON_OPTIONS = [
    { id: 'package', label: 'Package' },
    { id: 'map', label: 'Map' },
    { id: 'globe', label: 'Globe' },
    { id: 'bike', label: 'Bike' },
    { id: 'mountain', label: 'Mountain' },
    { id: 'link', label: 'Link' },
    { id: 'github', label: 'GitHub' },
    { id: 'flag', label: 'Flag' },
    { id: 'compass', label: 'Compass' },
    { id: 'activity', label: 'Activity' },
];

export const DEFAULT_QUICK_LINKS = [
    {
        id: 'cycling-pack',
        label: 'Cycling Pack',
        href: 'https://github.com/VCCharlie/Bike-clothing-list',
        icon: 'package',
    },
    {
        id: 'squadrats',
        label: 'Squadrats',
        href: 'https://squadrats.com/expeditions',
        icon: 'map',
    },
    {
        id: 'wandrer',
        label: 'Wandrer',
        href: 'https://wandrer.earth/dashboard',
        icon: 'globe',
    },
];

function isValidHref(href) {
    if (!href || typeof href !== 'string') return false;
    try {
        const url = new URL(href);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

/**
 * @param {object[]} links — raw editor values (may include drafts)
 * @returns {object[]}
 */
export function prepareQuickLinksForEditor(links) {
    if (!Array.isArray(links) || links.length === 0) {
        return DEFAULT_QUICK_LINKS.map((l) => ({ ...l }));
    }

    const validIcons = new Set(QUICK_LINK_ICON_OPTIONS.map((o) => o.id));

    return links.slice(0, MAX_QUICK_LINKS).map((link, index) => ({
        id: String(link?.id || `link-${index}`).slice(0, 40),
        label: String(link?.label ?? '').slice(0, 40),
        href: String(link?.href ?? '').slice(0, 300),
        icon: validIcons.has(link?.icon) ? link.icon : 'link',
    }));
}

/**
 * @param {object[]} links
 * @returns {object[]}
 */
export function normalizeQuickLinks(links) {
    if (!Array.isArray(links) || links.length === 0) {
        return DEFAULT_QUICK_LINKS.map((l) => ({ ...l }));
    }

    const validIcons = new Set(QUICK_LINK_ICON_OPTIONS.map((o) => o.id));

    return links
        .slice(0, MAX_QUICK_LINKS)
        .map((link, index) => {
            const label = String(link?.label || '').trim().slice(0, 40);
            const href = String(link?.href || '').trim();
            if (!label || !isValidHref(href)) return null;
            const icon = validIcons.has(link?.icon) ? link.icon : 'link';
            return {
                id: String(link?.id || `link-${index}`).slice(0, 40),
                label,
                href,
                icon,
            };
        })
        .filter(Boolean);
}

/**
 * @param {object} userSettings
 * @returns {object[]}
 */
export function resolveQuickLinks(userSettings) {
    return normalizeQuickLinks(userSettings?.quickLinks);
}
