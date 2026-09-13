import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubMaintenance } from '../../hooks/useDataHubMaintenance';

const confirmMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../firebase', () => ({
    db: null,
}));

vi.mock('../../context/ConfirmContext', () => ({
    useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

describe('useDataHubMaintenance', () => {
    const onUpsert = vi.fn();
    const onClear = vi.fn();
    const setIsDeleting = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        confirmMock.mockResolvedValue(false);
    });

    it('persists manual edits without enrichment protection', async () => {
        const existing = {
            id: '53534754',
            date: '2017-06-12',
            title: 'Morning Ride',
            type: 'Ride',
            strava_id: '12345678',
            climbing: 500,
        };
        const setEditingActivity = vi.fn();

        const { result } = renderHook(() => useDataHubMaintenance({
            activities: [existing],
            onUpsert,
            onClear,
            stravaGetToken: null,
            setIsDeleting,
        }));

        await act(async () => {
            await result.current.handleSaveEdit({
                ...existing,
                title: 'Alpine cols 2017',
                climbing: 820,
            }, setEditingActivity);
        });

        expect(onUpsert).toHaveBeenCalledWith([
            expect.objectContaining({
                id: '53534754',
                title: 'Alpine cols 2017',
                climbing: 820,
                climbing_user_corrected: true,
            }),
        ]);
        expect(setEditingActivity).toHaveBeenCalledWith(null);
    });

    it('opens no-power modal when rides without power exist', () => {
        const { result } = renderHook(() => useDataHubMaintenance({
            activities: [
                { id: 'pwr', avg_power: 180 },
                { id: 'nopwr', avg_power: 0 },
            ],
            onUpsert,
            onClear,
            stravaGetToken: null,
            setIsDeleting,
        }));

        act(() => result.current.openNoPowerFilter());

        expect(result.current.showNoPowerModal).toBe(true);
        expect(result.current.noPowerSelected).toEqual(['nopwr']);
    });

    it('shows info toast when all activities have power', () => {
        const { result } = renderHook(() => useDataHubMaintenance({
            activities: [{ id: 'pwr', avg_power: 200 }],
            onUpsert,
            onClear,
            stravaGetToken: null,
            setIsDeleting,
        }));

        act(() => result.current.openNoPowerFilter());

        expect(result.current.showNoPowerModal).toBe(false);
        expect(showToastMock).toHaveBeenCalledWith(
            'All activities have power data. Nothing to filter.',
            { variant: 'info' },
        );
    });

    it('requires double confirm before clearing database', async () => {
        const { result } = renderHook(() => useDataHubMaintenance({
            activities: [{ id: 'a1' }],
            onUpsert,
            onClear,
            stravaGetToken: null,
            setIsDeleting,
        }));

        await act(async () => {
            await result.current.handleClearDatabase();
        });

        expect(confirmMock).toHaveBeenCalledTimes(1);
        expect(onClear).not.toHaveBeenCalled();
    });
});
