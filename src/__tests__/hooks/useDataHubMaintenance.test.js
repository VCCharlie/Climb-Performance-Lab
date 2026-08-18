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
    const onImport = vi.fn();
    const onClear = vi.fn();
    const setIsDeleting = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        confirmMock.mockResolvedValue(false);
    });

    it('opens no-power modal when rides without power exist', () => {
        const { result } = renderHook(() => useDataHubMaintenance({
            activities: [
                { id: 'pwr', avg_power: 180 },
                { id: 'nopwr', avg_power: 0 },
            ],
            onImport,
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
            onImport,
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
            onImport,
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
