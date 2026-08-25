import { cn } from './cn';

/** Shared input surface styles — use on NlDateInput and native inputs. */
export const inputBaseClass = cn(
  'w-full bg-cdsurfacelow text-cdtext text-sm',
  'border border-cdtext/10 rounded-cdmd px-3 py-2',
  'placeholder:text-cdmuted/70',
  'cd-transition',
  'outline-none focus-visible:border-cdprimary/50 focus-visible:ring-4 focus-visible:ring-cdprimary/10',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

/** Number inputs: native steppers visible on hover/focus only (WebKit). */
export const inputNumberClass = cn(
  inputBaseClass,
  '[appearance:textfield]',
  '[&::-webkit-outer-spin-button]:opacity-0 [&::-webkit-inner-spin-button]:opacity-0',
  'hover:[&::-webkit-outer-spin-button]:opacity-100 hover:[&::-webkit-inner-spin-button]:opacity-100',
  'focus-visible:[&::-webkit-outer-spin-button]:opacity-100 focus-visible:[&::-webkit-inner-spin-button]:opacity-100',
);
