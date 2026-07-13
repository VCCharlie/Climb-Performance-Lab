import React from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  tonal: 'bg-cdsurfacelow text-cdtext hover:bg-cdsurfacehigh active:bg-cdsurfacehigh',
  outlined: 'border border-cdborder text-cdtext bg-cdsurface hover:bg-cdsurfacelow',
  text: 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow',
  filled: 'bg-cdprimary text-cdonprimary hover:brightness-105',
};

const SIZE_CLASSES = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

/**
 * Circular icon button — settings, auth, close actions in the shell.
 */
const IconButton = React.forwardRef(function IconButton({
  variant = 'tonal',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}, ref) {
  return (
    <button
      ref={ref}
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
});

export default IconButton;
