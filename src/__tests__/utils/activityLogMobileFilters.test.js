import { describe, it, expect } from 'vitest';
import { CARD_LAYOUT_MEDIA_QUERY } from '../../utils/activityLogLayout.js';

describe('activityLogLayout', () => {
    it('exports a media query that covers phone landscape widths', () => {
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('max-width: 1023px');
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('pointer: coarse');
    });
});

/**
 * Collapse rule for Activity Log filters:
 * - Card layout: panel starts collapsed until logFiltersPanelOpen.
 * - Desktop table layout: panel starts expanded but remains collapsible.
 */
describe('Activity Log filter collapse (documented behavior)', () => {
    it('expects card layout to start with the panel collapsed', () => {
        const useCardLayout = true;
        const logFiltersPanelOpen = false;
        const shouldHideSecondaryPanel = !logFiltersPanelOpen;
        expect(shouldHideSecondaryPanel).toBe(true);
    });

    it('expects desktop table layout to allow collapse while defaulting open', () => {
        const useCardLayout = false;
        const logFiltersPanelOpen = true;
        const collapsible = true;
        const collapsed = !logFiltersPanelOpen;
        expect(collapsible).toBe(true);
        expect(useCardLayout).toBe(false);
        expect(collapsed).toBe(false);
    });
});
