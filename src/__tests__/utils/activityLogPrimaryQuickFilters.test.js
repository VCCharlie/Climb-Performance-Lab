import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getDefaultPrimaryQuickFilterIds,
    getDesktopExtraQuickFilterIds,
    normalizePrimaryQuickFilterIds,
    readPrimaryQuickFilterIds,
    resolveVisiblePrimaryQuickFilterIds,
    togglePrimaryQuickFilterId,
    writePrimaryQuickFilterIds,
    PRIMARY_QUICK_FILTER_STORAGE_KEY,
    MAX_PRIMARY_QUICK_FILTERS,
} from '../../utils/activityLogPrimaryQuickFilters';

describe('activityLogPrimaryQuickFilters', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns sensible defaults', () => {
        const defaults = getDefaultPrimaryQuickFilterIds();
        expect(defaults).toContain('last_30d');
        expect(defaults).toContain('long_ride');
        expect(defaults.length).toBeGreaterThan(0);
    });

    it('normalizes unknown ids and enforces max count', () => {
        const ids = normalizePrimaryQuickFilterIds([
            'last_30d',
            'not_real',
            'with_power',
            'high_load',
            'long_ride',
            'this_week',
            'no_hr',
            'has_tag',
            'strava_link',
            'last_7d',
        ]);
        expect(ids).not.toContain('not_real');
        expect(ids.length).toBeLessThanOrEqual(MAX_PRIMARY_QUICK_FILTERS);
    });

    it('persists selection to localStorage', () => {
        const saved = writePrimaryQuickFilterIds(['last_7d', 'has_tag', 'with_power']);
        expect(saved).toEqual(['last_7d', 'has_tag', 'with_power']);
        expect(JSON.parse(localStorage.getItem(PRIMARY_QUICK_FILTER_STORAGE_KEY))).toEqual(saved);
        expect(readPrimaryQuickFilterIds()).toEqual(saved);
    });

    it('merges desktop extras on wide layout without duplicating pinned ids', () => {
        const pinned = ['last_30d', 'with_power', 'long_ride', 'high_load'];
        const wide = resolveVisiblePrimaryQuickFilterIds(pinned, true);
        expect(wide.slice(0, pinned.length)).toEqual(pinned);
        for (const extra of getDesktopExtraQuickFilterIds()) {
            if (pinned.includes(extra)) continue;
            if (wide.length <= MAX_PRIMARY_QUICK_FILTERS) {
                expect(wide.includes(extra)).toBe(true);
            }
        }
    });

    it('does not add desktop extras on narrow layout', () => {
        const pinned = getDefaultPrimaryQuickFilterIds();
        expect(resolveVisiblePrimaryQuickFilterIds(pinned, false)).toEqual(pinned);
    });

    it('toggle respects min/max limits', () => {
        const base = ['with_power'];
        expect(togglePrimaryQuickFilterId(base, 'with_power', false)).toEqual(['with_power']);
        const added = togglePrimaryQuickFilterId(base, 'last_7d', true);
        expect(added).toEqual(['with_power', 'last_7d']);
    });
});

describe('resolveQuickFilterChip', () => {
    it('exports chip handlers for each catalog id', async () => {
        const { ACTIVITY_LOG_QUICK_FILTER_IDS, resolveQuickFilterChip } = await import('../../utils/activityLogQuickFilterDefinitions');
        const props = {
            onThisWeekOnlyChange: vi.fn(),
            onRollingDaysChange: vi.fn(),
            onWithPowerOnlyChange: vi.fn(),
            onNoPowerOnlyChange: vi.fn(),
            onHighLoadOnlyChange: vi.fn(),
            onLongRideOnlyChange: vi.fn(),
            onHasTagOnlyChange: vi.fn(),
            onMissingHrOnlyChange: vi.fn(),
            onStravaLinkedOnlyChange: vi.fn(),
            onNoStravaLinkOnlyChange: vi.fn(),
            onPossibleDuplicatesOnlyChange: vi.fn(),
        };
        for (const id of ACTIVITY_LOG_QUICK_FILTER_IDS) {
            expect(resolveQuickFilterChip(id, props)).toBeTruthy();
        }
    });
});
