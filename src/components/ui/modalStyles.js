/** Shared modal shell classes (MD3 sheet + scrim). */
export const modalScrimClass =
  'fixed inset-0 z-50 flex items-center justify-center p-4 bg-cdscrim backdrop-blur-sm overflow-y-auto';

export const modalPanelClass =
  'w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg';

export const modalPanelWideClass =
  'w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg';

export const modalHeaderClass =
  'flex-shrink-0 p-4 border-b border-cdborder/50 bg-cdsurface/95 backdrop-blur flex justify-between items-center gap-3';

export const modalToolbarClass =
  'flex-shrink-0 px-4 py-2 border-b border-cdborder/40 bg-cdsurfacelow flex flex-wrap gap-2 items-center';

export const modalBodyScrollClass = 'overflow-auto flex-1 min-h-0 custom-scrollbar';

export const modalFooterClass =
  'flex-shrink-0 p-4 border-t border-cdborder/50 bg-cdsurfacelow flex justify-between items-center gap-3';
