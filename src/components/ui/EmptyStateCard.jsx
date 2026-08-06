import React from 'react';
import { Button, Card } from './index';

/**
 * Centered empty state with optional primary/secondary actions.
 */
export default function EmptyStateCard({
    icon: Icon,
    title,
    message,
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary,
    className = '',
}) {
    return (
        <Card
            variant="outlined"
            padding="lg"
            className={`flex flex-col items-center justify-center text-center gap-3 ${className}`}
        >
            {Icon && <Icon className="w-10 h-10 text-cdmuted" aria-hidden />}
            {title && <h3 className="text-base font-head font-bold text-cdtext">{title}</h3>}
            {message && <p className="text-sm text-cdmuted leading-relaxed max-w-md">{message}</p>}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-1">
                {primaryLabel && typeof onPrimary === 'function' && (
                    <Button type="button" onClick={onPrimary} className="w-full sm:w-auto">
                        {primaryLabel}
                    </Button>
                )}
                {secondaryLabel && typeof onSecondary === 'function' && (
                    <Button type="button" variant="outlined" onClick={onSecondary} className="w-full sm:w-auto">
                        {secondaryLabel}
                    </Button>
                )}
            </div>
        </Card>
    );
}
