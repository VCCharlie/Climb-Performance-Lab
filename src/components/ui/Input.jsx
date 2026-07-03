import React from 'react';
import { cn } from './cn';
import { inputBaseClass } from './inputStyles';

const SIZE_CLASSES = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
};

/**
 * MD3 filled input with optional label, hint, and error text.
 */
export default function Input({
  id,
  label,
  hint,
  error,
  size = 'md',
  className,
  inputClassName,
  ...rest
}) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-cdmuted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(inputBaseClass, SIZE_CLASSES[size], error && 'border-cdred/60 focus:border-cdred/60 focus:ring-cdred/15', inputClassName)}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-cdmuted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[11px] text-cdred" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
