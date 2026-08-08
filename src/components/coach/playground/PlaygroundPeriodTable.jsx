import React from 'react';
import { cn } from '../../ui';
import { playgroundTableClass } from '../../../utils/playgroundTableStyles';

/**
 * Full-height period breakdown table — no inner scroll; page scrolls instead.
 */
export default function PlaygroundPeriodTable({ children, className }) {
    return (
        <div className={cn('w-full min-w-0 rounded-lg border border-cdborder overflow-hidden', className)}>
            <table className={playgroundTableClass}>
                {children}
            </table>
        </div>
    );
}
