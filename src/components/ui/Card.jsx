import React from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  elevated: 'bg-cdsurface',
  filled: 'bg-cdsurfacelow',
  outlined: 'bg-cdsurface border border-cdborder',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

/**
 * MD3 surface card — tonal elevation instead of heavy shadows.
 */
export default function Card({
  as,
  variant = 'elevated',
  padding = 'md',
  className,
  children,
  ...rest
}) {
  const Tag = as || 'div';
  return (
    <Tag
      className={cn(
        'rounded-cdlg',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.elevated,
        PADDING_CLASSES[padding] ?? PADDING_CLASSES.md,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
