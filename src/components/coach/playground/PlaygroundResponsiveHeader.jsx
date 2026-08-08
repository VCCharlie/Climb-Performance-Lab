import React from 'react';
import { shortPlaygroundHeader } from '../../../utils/playgroundTableStyles';
import { playgroundThClass } from '../../../utils/playgroundTableStyles';

/**
 * Table header cell with a shorter label on mobile.
 */
export default function PlaygroundResponsiveHeader({ label, className }) {
    const short = shortPlaygroundHeader(label);
    const useShort = short !== label;

    return (
        <th className={className ?? playgroundThClass}>
            {useShort ? (
                <>
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                </>
            ) : (
                label
            )}
        </th>
    );
}
