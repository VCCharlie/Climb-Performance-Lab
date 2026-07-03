import React from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  tonal: 'bg-cdsurfacelow text-cdtext hover:bg-cdsurfacehigh active:bg-cdsurfacehigh',
  outlined: 'border border-cdborder text-cdtext bg-cdsurface hover:bg-cdsurfacelow',
  text: 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow',
};

const SIZE_CLASSES = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
};

export default function IconButton({
  variant = 'tonal',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'cd-transition cd-focus-ring active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.tonal,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
