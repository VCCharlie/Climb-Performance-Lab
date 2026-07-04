import { describe, it, expect } from 'vitest';
import { CARD_LAYOUT_MEDIA_QUERY } from '../../utils/activityLogLayout';

describe('activityLogLayout', () => {
    it('uses lg breakpoint and touch coarse fallback in media query', () => {
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('max-width: 1023px');
        expect(CARD_LAYOUT_MEDIA_QUERY).toContain('pointer: coarse');
    });
});
