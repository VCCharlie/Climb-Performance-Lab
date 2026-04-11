import React, { useState, useEffect, useCallback } from 'react';
import { formatIsoToNlDmy, parseNlDmyToIso } from '../utils/formatters';

/**
 * Text input showing dd/mm/jjjj while storing ISO YYYY-MM-DD in parent state.
 */
export default function NlDateInput({
    value,
    onChange,
    className = '',
    id,
    name,
    disabled,
    placeholder = 'dd/mm/jjjj',
    'aria-label': ariaLabel,
}) {
    const iso = value && String(value).length >= 10 ? String(value).slice(0, 10) : '';
    const [text, setText] = useState(() => formatIsoToNlDmy(iso));

    useEffect(() => {
        setText(formatIsoToNlDmy(iso));
    }, [iso]);

    const commit = useCallback(
        (raw) => {
            const parsed = parseNlDmyToIso(raw);
            if (parsed) {
                onChange(parsed);
                setText(formatIsoToNlDmy(parsed));
            } else if (!String(raw).trim()) {
                onChange('');
                setText('');
            } else {
                setText(raw);
            }
        },
        [onChange]
    );

    return (
        <input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={ariaLabel}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => commit(text)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit(text);
                    e.target.blur();
                }
            }}
            className={className}
        />
    );
}
