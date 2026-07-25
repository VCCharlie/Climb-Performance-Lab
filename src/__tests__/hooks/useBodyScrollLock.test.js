import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBodyScrollLock, resetBodyScrollLockForTests } from '../../hooks/useBodyScrollLock.js';

describe('useBodyScrollLock', () => {
    afterEach(() => {
        resetBodyScrollLockForTests();
    });

    it('locks body overflow when active', () => {
        const { rerender, unmount } = renderHook(({ active }) => useBodyScrollLock(active), {
            initialProps: { active: false },
        });
        expect(document.body.style.overflow).toBe('');
        rerender({ active: true });
        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe('');
    });

    it('supports nested locks with ref counting', () => {
        const first = renderHook(() => useBodyScrollLock(true));
        const second = renderHook(() => useBodyScrollLock(true));
        second.unmount();
        expect(document.body.style.overflow).toBe('hidden');
        first.unmount();
        expect(document.body.style.overflow).toBe('');
    });
});
