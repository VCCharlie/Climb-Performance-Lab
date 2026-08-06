import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  filled: 'bg-cdprimary text-cdonprimary hover:brightness-105 active:brightness-95',
  tonal: 'bg-cdprimarycontainer text-cdonprimarycontainer hover:brightness-95 active:brightness-90',
  outlined: 'border border-cdtext/20 text-cdtext bg-transparent hover:bg-cdsurfacelow active:bg-cdsurfacehigh',
  text: 'text-cdprimary bg-transparent hover:bg-cdsurfacelow active:bg-cdsurfacehigh',
  danger: 'bg-cdred text-white hover:brightness-105 active:brightness-95',
  success: 'bg-cdgreen text-white hover:brightness-105 active:brightness-95',
};

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

const LOADER_SIZE = {
  sm: 14,
  md: 16,
  lg: 18,
};

/**
 * MD3-style button primitive.
 * Variants: filled | tonal | outlined | text | danger | success
 */
const Button = React.forwardRef(function Button({
  variant = 'filled',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  className,
  children,
  ...rest
}, ref) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-cdmd',
        'cd-transition cd-focus-ring',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.filled,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <Loader2
          size={LOADER_SIZE[size] ?? LOADER_SIZE.md}
          className="shrink-0 animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});

export default Button;
