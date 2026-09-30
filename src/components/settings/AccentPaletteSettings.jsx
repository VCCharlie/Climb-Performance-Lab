import React from 'react';
import { ACCENT_PALETTES, ACCENT_PALETTE_CUSTOM } from '../../theme/accentPalette';
import { getCustomPreviewSwatches, normalizeHexColor } from '../../utils/customAccentColor';

/**
 * @param {{
 *   value: string,
 *   onChange: (id: string) => void,
 *   customColors: { emphasis: string, fill: string },
 *   onCustomColorsChange: (colors: { emphasis: string, fill: string }) => void,
 * }} props
 */
export default function AccentPaletteSettings({
    value,
    onChange,
    customColors,
    onCustomColorsChange,
}) {
    const handleColorInput = (field, raw) => {
        const normalized = normalizeHexColor(raw);
        if (!normalized) return;
        if (value !== ACCENT_PALETTE_CUSTOM) {
            onChange(ACCENT_PALETTE_CUSTOM);
        }
        onCustomColorsChange({ ...customColors, [field]: normalized });
    };

    return (
        <div className="space-y-2 border-t border-cdborder/30 pt-4">
            <div>
                <p className="text-sm font-bold text-cdtext">Accent color</p>
                <p className="text-xs text-cdmuted">
                    Presets or your own pair: emphasis (text, icons) and fill (bars, chips). Logo yellow is unchanged.
                </p>
            </div>
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Accent color palette"
            >
                {ACCENT_PALETTES.map((palette) => {
                    const selected = value === palette.id;
                    const swatches =
                        palette.id === ACCENT_PALETTE_CUSTOM
                            ? getCustomPreviewSwatches(customColors)
                            : palette.swatches;
                    return (
                        <button
                            key={palette.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(palette.id)}
                            className={[
                                'text-left rounded-lg border p-3 cd-transition cd-focus-ring',
                                selected
                                    ? 'border-cdaccent bg-cdprimarycontainer/60 ring-1 ring-cdaccent/30'
                                    : 'border-cdborder bg-cdsurface hover:border-cdaccent/40',
                            ].join(' ')}
                        >
                            <div className="flex gap-1 mb-2" aria-hidden>
                                {swatches.map((hex, index) => (
                                    <span
                                        key={`${palette.id}-${index}-${hex}`}
                                        className="h-5 flex-1 rounded-sm border border-cdborder/40"
                                        style={{ backgroundColor: hex }}
                                        title={
                                            palette.id === ACCENT_PALETTE_CUSTOM
                                                ? index === 0
                                                    ? 'Emphasis'
                                                    : index === 1
                                                      ? 'Fill'
                                                      : 'Auto background (from Fill)'
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                            <p className="text-xs font-bold text-cdtext">{palette.label}</p>
                            <p className="text-[10px] text-cdmuted leading-snug mt-0.5">{palette.description}</p>
                        </button>
                    );
                })}
            </div>

            {value === ACCENT_PALETTE_CUSTOM && (
                <>
                <p className="text-[10px] text-cdmuted mt-2">
                    The third stripe on the Custom card is a light badge background — computed from Fill, not a separate picker.
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-cdborder bg-cdsurfacelow p-4">
                    <label className="flex items-center gap-3 text-sm text-cdtext">
                        <input
                            type="color"
                            value={customColors.emphasis}
                            onChange={(e) => handleColorInput('emphasis', e.target.value)}
                            className="h-10 w-14 rounded border border-cdborder bg-cdsurface cursor-pointer cd-focus-ring"
                            aria-label="Custom accent emphasis color"
                        />
                        <span>
                            <span className="font-bold block">Emphasis</span>
                            <span className="text-xs text-cdmuted">Nav, labels, icons</span>
                        </span>
                    </label>
                    <label className="flex items-center gap-3 text-sm text-cdtext">
                        <input
                            type="color"
                            value={customColors.fill}
                            onChange={(e) => handleColorInput('fill', e.target.value)}
                            className="h-10 w-14 rounded border border-cdborder bg-cdsurface cursor-pointer cd-focus-ring"
                            aria-label="Custom accent fill color"
                        />
                        <span>
                            <span className="font-bold block">Fill</span>
                            <span className="text-xs text-cdmuted">Progress bars, chips</span>
                        </span>
                    </label>
                </div>
                </>
            )}
        </div>
    );
}
