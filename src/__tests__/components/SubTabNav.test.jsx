import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubTabNav, { SUB_TAB_ACTIVE_TEXT_CLASS, subTabButtonClass } from '../../components/ui/SubTabNav';

describe('SubTabNav', () => {
    it('renders tabs and marks active tab with theme accent class', () => {
        const onChange = vi.fn();
        render(
            <SubTabNav
                tabs={[
                    { id: 'a', label: 'Tab A', ariaControls: 'panel-a' },
                    { id: 'b', label: 'Tab B', ariaControls: 'panel-b' },
                ]}
                activeTab="a"
                onTabChange={onChange}
                ariaLabel="Test tabs"
                idPrefix="test-tab"
            />,
        );

        const active = screen.getByRole('tab', { name: 'Tab A' });
        expect(active.className).toContain(SUB_TAB_ACTIVE_TEXT_CLASS);
        expect(active.getAttribute('aria-selected')).toBe('true');
    });

    it('calls onTabChange when another tab is clicked', () => {
        const onChange = vi.fn();
        render(
            <SubTabNav
                tabs={[
                    { id: 'a', label: 'Tab A' },
                    { id: 'b', label: 'Tab B' },
                ]}
                activeTab="a"
                onTabChange={onChange}
                ariaLabel="Test tabs"
            />,
        );

        fireEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('subTabButtonClass uses cdprimary for active state', () => {
        expect(subTabButtonClass(true)).toContain('text-cdprimary');
        expect(subTabButtonClass(false)).not.toContain('text-yellow-400');
    });
});
