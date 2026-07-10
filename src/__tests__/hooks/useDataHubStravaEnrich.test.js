import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubStravaEnrich } from '../../hooks/useDataHubStravaEnrich';

vi.mock('../../firebase', () => ({
    db: null,
}));

vi.mock('../../utils/stravaSelectedEnrich', () => ({
    enrichSelectedActivitiesFromStrava: vi.fn(),
}));

describe('useDataHubStravaEnrich', () => {
    const onImport = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses dashboard date range by default', () => {
        const { result } = renderHook(() => useDataHubStravaEnrich({
            stravaGetToken: null,
            activities: [],
            startDate: '2026-01-01',
            endDate: '2026-06-30',
            onImport,
        }));

        expect(result.current.stravaSearchDates).toEqual({
            startDate: '2026-01-01',
            endDate: '2026-06-30',
        });
    });

    it('overrides search dates when opening Find on Strava for an activity', () => {
        const onBeforeOpenPanel = vi.fn();
        const { result } = renderHook(() => useDataHubStravaEnrich({
            stravaGetToken: async () => 'token',
            activities: [],
            startDate: '2026-01-01',
            endDate: '2026-06-30',
            onImport,
            onBeforeOpenPanel,
        }));

        act(() => {
            result.current.handleFindOnStrava({
                id: '1',
                date: '2026-03-15T10:00:00',
                title: 'Ride',
            });
        });

        expect(onBeforeOpenPanel).toHaveBeenCalled();
        expect(result.current.showStravaEnrichPanel).toBe(true);
        expect(result.current.stravaSearchDates).toEqual({
            startDate: '2026-03-15',
            endDate: '2026-03-15',
        });
        expect(result.current.enrichmentTarget?.id).toBe('1');
    });
});
