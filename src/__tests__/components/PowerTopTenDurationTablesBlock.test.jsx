import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PowerTopTenDurationTablesBlock from '../../components/dashboard/PowerTopTenDurationTablesBlock';

const compareBounds = { start: new Date('2026-01-01'), end: new Date('2026-03-01') };

const tablesByDuration = [
    {
        label: '1 min',
        primary: [{ watts: 400, rank: 1 }],
        secondary: [{ watts: 465, rank: 1 }],
        footnote: null,
    },
    {
        label: '5 min',
        primary: [{ watts: 300, rank: 1 }],
        secondary: [{ watts: 337, rank: 1 }],
        footnote: null,
    },
];

describe('PowerTopTenDurationTablesBlock', () => {
    it('keeps all duration rows collapsed by default', () => {
        render(
            <PowerTopTenDurationTablesBlock
                tablesByDuration={tablesByDuration}
                compareBounds={compareBounds}
                mobileCompareColumn={1}
            />,
        );

        const toggles = screen.getAllByRole('button', { expanded: false });
        expect(toggles.length).toBeGreaterThanOrEqual(2);
        toggles.forEach((btn) => expect(btn).toHaveAttribute('aria-expanded', 'false'));
    });

    it('shows column 1 top watts in collapsed headers by default', () => {
        render(
            <PowerTopTenDurationTablesBlock
                tablesByDuration={tablesByDuration}
                compareBounds={compareBounds}
                mobileCompareColumn={1}
            />,
        );

        expect(screen.getByText('400 W')).toBeInTheDocument();
        expect(screen.queryByText('465 W')).not.toBeInTheDocument();
    });

    it('shows column 2 top watts in collapsed headers when column 2 is active', () => {
        render(
            <PowerTopTenDurationTablesBlock
                tablesByDuration={tablesByDuration}
                compareBounds={compareBounds}
                mobileCompareColumn={2}
            />,
        );

        expect(screen.getByText('465 W')).toBeInTheDocument();
        expect(screen.queryByText('400 W')).not.toBeInTheDocument();
    });
});
