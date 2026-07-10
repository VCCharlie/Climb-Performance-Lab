import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubImport } from '../../hooks/useDataHubImport';

vi.mock('../../firebase', () => ({
    db: null,
}));

describe('useDataHubImport', () => {
    const onImport = vi.fn();
    const onDelete = vi.fn();
    const onImportComplete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('opens preview modal when data is detected', () => {
        const { result } = renderHook(() => useDataHubImport({
            activities: [],
            onImport,
            onDelete,
            onImportComplete,
            profileFtp: 250,
        }));

        const rows = [
            { id: 'a1', date: '2026-01-01', type: 'Ride', title: 'Test' },
            { id: 'a2', date: '2026-01-02', type: 'Ride', title: 'Test 2' },
        ];

        act(() => {
            result.current.handleDataDetected(rows);
        });

        expect(result.current.showModal).toBe(true);
        expect(result.current.fetchedActivities).toEqual(rows);
        expect(result.current.selectedActivities).toEqual(['a1', 'a2']);
        expect(result.current.rawData).toEqual(rows[0]);
    });

    it('toggles activity type in preview', () => {
        const { result } = renderHook(() => useDataHubImport({
            activities: [],
            onImport,
            onDelete,
            profileFtp: 250,
        }));

        act(() => {
            result.current.handleDataDetected([
                { id: 'x', date: '2026-01-01', type: 'Ride', title: 'X' },
            ]);
        });

        act(() => {
            result.current.toggleActivityTypeInPreview('x');
        });

        expect(result.current.fetchedActivities[0].type).toBe('VirtualRide');
    });

    it('sorts preview by date descending by default', () => {
        const { result } = renderHook(() => useDataHubImport({
            activities: [],
            onImport,
            onDelete,
            profileFtp: 250,
        }));

        act(() => {
            result.current.handleDataDetected([
                { id: '1', date: '2026-01-01', type: 'Ride' },
                { id: '2', date: '2026-02-01', type: 'Ride' },
            ]);
        });

        expect(result.current.sortedFetchedActivities[0].id).toBe('2');
    });
});
