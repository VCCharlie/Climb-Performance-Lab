import React from 'react';
import { cn } from '../ui';

/**
 * MD3 primary navigation tab with bottom pill indicator.
 */
export default function NavTab({ icon, label, isActive, onClick, onPrefetch }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap',
        'rounded-t-cdmd cd-transition cd-focus-ring',
        isActive
          ? 'text-cdtext'
          : 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow/80',
      )}
    >
      {icon
        ? React.createElement(icon, {
            className: cn('w-4 h-4 shrink-0', isActive && 'text-cdprimary'),
            'aria-hidden': true,
          })
        : null}
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-cdprimary"
          aria-hidden
        />
      )}
    </button>
  );
}
