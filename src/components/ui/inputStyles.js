import { cn } from './cn';

/** Shared input surface styles — use on NlDateInput and native inputs. */
export const inputBaseClass = cn(
  'w-full bg-cdsurfacelow text-cdtext text-sm',
  'border border-cdtext/10 rounded-cdmd px-3 py-2',
  'placeholder:text-cdmuted/70',
  'cd-transition',
  'focus:outline-none focus:border-cdprimary/50 focus:ring-4 focus:ring-cdprimary/10',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);
