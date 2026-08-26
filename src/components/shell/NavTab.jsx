import React from 'react';
import { cn } from '../ui';

/**
 * MD3 primary navigation tab with bottom pill indicator.
 */
export default function NavTab({ id, ariaControls, icon, label, isActive, onClick, onPrefetch, variant = 'default' }) {
  const isHeader = variant === 'header';

  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={isActive}
      aria-controls={ariaControls}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onPointerDown={onPrefetch}
      className={cn(
        'relative flex items-center whitespace-nowrap rounded-t-cdmd cd-transition cd-focus-ring',
        isHeader
          ? 'gap-1 px-2 py-1.5 lg:px-2.5 text-[11px] lg:text-xs font-semibold'
          : 'gap-1.5 px-3 py-2.5 text-xs font-semibold',
        isActive
          ? 'text-cdtext'
          : 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow/80',
      )}
    >
      {icon
        ? React.createElement(icon, {
            className: cn(
              'shrink-0',
              isHeader ? 'w-3.5 h-3.5 lg:w-4 lg:h-4' : 'w-4 h-4',
              isActive && 'text-cdprimary',
            ),
            'aria-hidden': true,
          })
        : null}
      {label}
      {isActive && (
        <span
          className={cn(
            'absolute bottom-0 h-0.5 rounded-full bg-cdprimary',
            isHeader ? 'left-2 right-2 lg:left-2.5 lg:right-2.5' : 'left-3 right-3',
          )}
          aria-hidden
        />
      )}
    </button>
  );
}
