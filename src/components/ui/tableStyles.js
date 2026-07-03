import { cn } from './cn';

/** Outer scroll container for data tables (MD3 tonal surface, no header shadow). */
export const tableShellClass =
  'overflow-x-auto overflow-y-auto flex-1 rounded-cdlg border border-cdborder/60 bg-cdsurface custom-scrollbar relative max-h-[70vh]';

export const tableClass = 'w-full text-left text-sm leading-snug whitespace-nowrap';

export const tableHeadClass =
  'bg-cdsurfacelow text-cdmuted sticky top-0 z-10 text-xs font-semibold tracking-wide';

export const tableHeadCellClass =
  'px-3 py-2.5 cursor-pointer hover:bg-cdsurfacehigh cd-transition select-none';

export const tableBodyClass = 'divide-y divide-cdborder/40 bg-cdsurface';

export const tableRowClass =
  'group cd-transition hover:bg-cdsurfacelow/80 border-b border-cdborder/30';

export function tableRowStateClass({ isSelected = false, showBulkSelect = false } = {}) {
  return cn(
    tableRowClass,
    isSelected && showBulkSelect && 'bg-cdprimarycontainer/30 ring-1 ring-inset ring-cdprimary/20',
    isSelected && !showBulkSelect && 'bg-cdprimarycontainer/20',
  );
}

export const tableCellClass = 'px-3 py-2 text-sm leading-snug';

export const tableGroupYearClass = 'bg-cdsurfacehigh/80 scroll-mt-10';

export const tableGroupMonthClass = 'bg-cdsurfacelow/60 scroll-mt-12';
