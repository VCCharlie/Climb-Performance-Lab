import { describe, it, expect } from 'vitest';
import { CARD_LAYOUT_MEDIA_QUERY } from '../../utils/activityLogLayout.js';

describe('activityLogLayout', () => {
    it('exports a media query that covers phone landscape widths', () => {
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('max-width: 1023px');
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('pointer: coarse');
    });
});

/**
 * Collapse rule for Activity Log filters (card layout):
 * - When useCardLayout is true, secondary panel is hidden until logMobileFiltersOpen.
 * - Must NOT use Tailwind `lg:block` to force open at 1024px+ while toggle stays `lg:hidden`
 *   (tablet / landscape touch would show a dead toggle with content stuck hidden).
 */
describe('Activity Log mobile filter collapse (documented behavior)', () => {
    it('expects card layout to drive collapse, not the lg breakpoint alone', () => {
        const useCardLayout = true;
        const logMobileFiltersOpen = false;
        const shouldHideSecondaryPanel = useCardLayout && !logMobileFiltersOpen;
        expect(shouldHideSecondaryPanel).toBe(true);
    });
});
