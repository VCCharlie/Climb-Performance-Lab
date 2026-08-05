import { describe, it, expect, afterEach } from 'vitest';
import {
    readPinnedTimeRangeHeight,
    setPinnedTimeRangeHeight,
    PINNED_TIME_RANGE_HEIGHT_VAR,
} from '../../utils/pinnedTimeRangeHeight';
import { TIME_RANGE_TAB_IDS } from '../../config/navTabs';

describe('pinnedTimeRangeHeight', () => {
    afterEach(() => {
        setPinnedTimeRangeHeight(0);
    });

    it('reads zero when CSS variable is unset', () => {
        document.documentElement.style.removeProperty(PINNED_TIME_RANGE_HEIGHT_VAR);
        expect(readPinnedTimeRangeHeight()).toBe(0);
    });

    it('stores and reads pinned toolbar height', () => {
        setPinnedTimeRangeHeight(48);
        expect(readPinnedTimeRangeHeight()).toBe(48);
    });
});

describe('TIME_RANGE_TAB_IDS', () => {
    it('includes data-driven tabs only', () => {
        expect(TIME_RANGE_TAB_IDS.has('dashboard')).toBe(true);
        expect(TIME_RANGE_TAB_IDS.has('activities')).toBe(true);
        expect(TIME_RANGE_TAB_IDS.has('training')).toBe(true);
        expect(TIME_RANGE_TAB_IDS.has('physics')).toBe(false);
        expect(TIME_RANGE_TAB_IDS.has('race')).toBe(false);
        expect(TIME_RANGE_TAB_IDS.has('weather')).toBe(false);
    });
});
