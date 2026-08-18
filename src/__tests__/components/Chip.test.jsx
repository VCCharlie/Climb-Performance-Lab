import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chip from '../../components/ui/Chip';

describe('Chip dense filter sizing', () => {
    it('xs filter chips use 10px text without 44px touch min', () => {
        render(<Chip size="xs" selected={false}>This week</Chip>);
        const chip = screen.getByRole('button', { name: 'This week' });
        expect(chip.className).toContain('text-[10px]');
        expect(chip.className).not.toContain('cd-min-touch-y');
    });

    it('md filter chips still use touch-friendly min height class', () => {
        render(<Chip size="md" selected={false}>Large</Chip>);
        const chip = screen.getByRole('button', { name: 'Large' });
        expect(chip.className).toContain('cd-min-touch-y');
    });
});
