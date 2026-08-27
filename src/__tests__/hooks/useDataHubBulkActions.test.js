import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubBulkActions } from '../../hooks/useDataHubBulkActions';

const confirmMock = vi.fn();

vi.mock('../../firebase', () => ({
    db: null,
}));

vi.mock('../../context/ConfirmContext', () => ({
    useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));

describe('useDataHubBulkActions', () => {
    const onDelete = vi.fn();
    const onImport = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        confirmMock.mockResolvedValue(false);
    });

    it('toggles bulk selection for one activity', () => {
        const { result } = renderHook(() => useDataHubBulkActions({
            activities: [{ id: 'a1', title: 'Ride' }],
            onDelete,
            onImport,
            stravaGetToken: null,
            visibleActivityIdsFlat: ['a1'],
            setIsDeleting: vi.fn(),
            recoveryTss: 30,
            userSettings: {},
        }));

        act(() => result.current.toggleBulkSelectOne('a1'));
        expect(result.current.bulkSelectedIds.has('a1')).toBe(true);

        act(() => result.current.toggleBulkSelectOne('a1'));
        expect(result.current.bulkSelectedIds.has('a1')).toBe(false);
    });

    it('selects and clears all visible rows', () => {
        const { result } = renderHook(() => useDataHubBulkActions({
            activities: [
                { id: 'a1', title: 'Ride 1' },
                { id: 'a2', title: 'Ride 2' },
            ],
            onDelete,
            onImport,
            stravaGetToken: null,
            visibleActivityIdsFlat: ['a1', 'a2'],
            setIsDeleting: vi.fn(),
            recoveryTss: 30,
            userSettings: {},
        }));

        act(() => result.current.toggleSelectAllVisible());
        expect(result.current.allVisibleSelected).toBe(true);

        act(() => result.current.toggleSelectAllVisible());
        expect(result.current.bulkSelectedIds.size).toBe(0);
    });

    it('builds merge preview for Intervals + Strava pair', () => {
        const intervals = {
            id: 'i12345',
            title: 'Intervals ride',
            date: '2026-01-01',
            avg_power: 200,
        };
        const strava = {
            id: 'strava_999',
            title: 'Strava ride',
            date: '2026-01-01',
            strava_id: '999',
        };

        const { result } = renderHook(() => useDataHubBulkActions({
            activities: [intervals, strava],
            onDelete,
            onImport,
            stravaGetToken: null,
            visibleActivityIdsFlat: ['i12345', 'strava_999'],
            setIsDeleting: vi.fn(),
            recoveryTss: 30,
            userSettings: {},
        }));

        act(() => {
            result.current.toggleBulkSelectOne('i12345');
            result.current.toggleBulkSelectOne('strava_999');
        });

        expect(result.current.mergePairPreview?.error).toBeUndefined();
        expect(result.current.mergePairPreview?.intervals?.id).toBe('i12345');
        expect(result.current.mergePairPreview?.stravaSide?.id).toBe('strava_999');
        expect(result.current.mergePairPreview?.merged?.id).toBe('i12345');
    });

    it('reports merge error when selection is not a valid pair', () => {
        const { result } = renderHook(() => useDataHubBulkActions({
            activities: [
                { id: 'a1', title: 'One' },
                { id: 'a2', title: 'Two' },
            ],
            onDelete,
            onImport,
            stravaGetToken: null,
            visibleActivityIdsFlat: ['a1', 'a2'],
            setIsDeleting: vi.fn(),
            recoveryTss: 30,
            userSettings: {},
        }));

        act(() => {
            result.current.toggleBulkSelectOne('a1');
            result.current.toggleBulkSelectOne('a2');
        });

        expect(result.current.mergePairPreview?.error).toBeTruthy();
        expect(result.current.canMergePair).toBe(false);
    });

    it('builds merge preview for FulGaz-style Intervals duplicate pair', () => {
        const enriched = {
            id: 'i100',
            date: '2019-05-04',
            type: 'VirtualRide',
            title: 'FulGaz - Col du Chaussy',
            moving_time: '43:21',
            distance: 0,
            strava_id: '555',
            load: 53,
        };
        const sparse = {
            id: 'i200',
            date: '2019-05-04',
            type: 'VirtualRide',
            title: 'FulGaz - Col du Chaussy',
            moving_time: '43:21',
            distance: 10,
            gear_name: 'Gilbertson Allure',
            load: 0,
        };

        const { result } = renderHook(() => useDataHubBulkActions({
            activities: [enriched, sparse],
            onDelete,
            onImport,
            stravaGetToken: null,
            visibleActivityIdsFlat: ['i100', 'i200'],
            setIsDeleting: vi.fn(),
            recoveryTss: 30,
            userSettings: {},
        }));

        act(() => {
            result.current.toggleBulkSelectOne('i100');
            result.current.toggleBulkSelectOne('i200');
        });

        expect(result.current.canMergePair).toBe(true);
        expect(result.current.mergePairPreview?.intervals?.id).toBe('i100');
        expect(result.current.mergePairPreview?.merged?.strava_id).toBe('555');
        expect(result.current.mergePairPreview?.merged?.distance).toBe(10);
    });
});
