import React, { useId } from 'react';
import { cn } from './cn';

const SIZE_CLASSES = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

/**
 * MD3 segmented control — single-select pill group in a tonal track.
 *
 * @param {{ value: string, label: React.ReactNode, icon?: React.ComponentType<{ size?: number, className?: string }> }[]} options
 */
export default function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  caps = true,
  dense = false,
  className,
  'aria-label': ariaLabel,
}) {
  const groupId = useId();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 bg-cdsurfacelow rounded-cdmd p-1 border border-cdborder/60',
        dense && 'p-0.5 gap-0',
        fullWidth && 'w-full',
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        const optionId = `${groupId}-${option.value}`;

        return (
          <button
            key={option.value}
            id={optionId}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center font-semibold whitespace-nowrap',
              caps && 'uppercase tracking-wide',
              'rounded-cdsm cd-transition cd-focus-ring',
              dense ? 'px-2 py-0.5 min-h-8' : 'px-2.5 py-1.5 cd-min-touch-y',
              'active:scale-[0.98]',
              SIZE_CLASSES[size],
              fullWidth && 'flex-1',
              isSelected
                ? 'bg-cdsurface text-cdtext shadow-sm border border-cdborder/40'
                : 'text-cdmuted hover:text-cdtext border border-transparent',
            )}
          >
            {Icon && (
              <Icon
                size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14}
                className={cn('shrink-0', option.label ? 'mr-1' : '')}
                aria-hidden
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
