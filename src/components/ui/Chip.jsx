import React from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  filter: {
    base: 'border',
    selected: 'bg-cdprimarycontainer text-cdonprimarycontainer border-cdprimary/30',
    unselected: 'bg-cdsurfacelow text-cdmuted border-cdborder hover:text-cdtext hover:border-cdtext/20',
  },
  assist: {
    base: 'border border-cdborder',
    selected: 'bg-cdsurfacehigh text-cdtext border-cdtext/15',
    unselected: 'bg-cdsurfacelow text-cdmuted hover:text-cdtext hover:bg-cdsurfacehigh',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

/**
 * MD3 filter / assist chip.
 * Use variant="filter" with selected for toggle groups (sport types, tags).
 */
export default function Chip({
  variant = 'filter',
  size = 'md',
  selected = false,
  icon: Icon,
  className,
  children,
  type = 'button',
  ...rest
}) {
  const styles = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.filter;
  const stateClass = selected ? styles.selected : styles.unselected;

  return (
    <button
      type={type}
      aria-pressed={variant === 'filter' ? selected : undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full',
        'cd-transition cd-focus-ring',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        styles.base,
        stateClass,
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} className="shrink-0" aria-hidden />}
      {children}
    </button>
  );
}
