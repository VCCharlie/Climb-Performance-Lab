import React, { useState } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';

/**
 * Bulk export control: CSV (Excel-compatible) or native .xlsx.
 */
const ActivityLogExportButtons = ({
    disabled = false,
    onExportCsv,
    onExportXlsx,
    isExportingXlsx = false,
    compact = false,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const buttonRef = React.useRef(null);

    if (compact) {
        return (
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    disabled={disabled || isExportingXlsx}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cdborder text-cdtext text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                    title="Export selected activities"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                >
                    {isExportingXlsx ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden />
                    ) : (
                        <Download size={13} aria-hidden />
                    )}
                    Export
                    <ChevronDown size={12} aria-hidden />
                </button>
                <AnchoredDropdownPortal
                    open={menuOpen}
                    anchorRef={buttonRef}
                    onClose={() => setMenuOpen(false)}
                    minWidth={160}
                    className="min-w-[10rem]"
                >
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm text-cdtext hover:bg-cdborder/40 cd-transition"
                        onClick={() => {
                            onExportCsv?.();
                            setMenuOpen(false);
                        }}
                    >
                        CSV (.csv)
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm text-cdtext hover:bg-cdborder/40 cd-transition"
                        onClick={() => {
                            onExportXlsx?.();
                            setMenuOpen(false);
                        }}
                        disabled={isExportingXlsx}
                    >
                        Excel (.xlsx)
                    </button>
                </AnchoredDropdownPortal>
            </div>
        );
    }

    return (
        <div className="inline-flex items-stretch rounded border border-cdborder overflow-hidden">
            <button
                type="button"
                onClick={onExportCsv}
                disabled={disabled}
                title="Export selected to CSV (opens in Excel)"
                className="inline-flex items-center gap-1 px-2 py-1 text-cdtext hover:border-green-500/50 hover:bg-cdborder/30 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
            >
                <Download size={12} aria-hidden="true" />
                CSV
            </button>
            <span className="w-px bg-cdborder self-stretch" aria-hidden />
            <button
                type="button"
                onClick={onExportXlsx}
                disabled={disabled || isExportingXlsx}
                title="Export selected to Excel workbook"
                className="inline-flex items-center gap-1 px-2 py-1 text-cdtext hover:border-green-500/50 hover:bg-cdborder/30 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
            >
                {isExportingXlsx ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                    <Download size={12} aria-hidden="true" />
                )}
                Excel
            </button>
        </div>
    );
};

export default ActivityLogExportButtons;
