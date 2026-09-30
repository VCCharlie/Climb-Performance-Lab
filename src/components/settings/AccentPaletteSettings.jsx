import React from 'react';
import { ACCENT_PALETTES } from '../../theme/accentPalette';

/**
 * @param {{ value: string, onChange: (id: string) => void }} props
 */
export default function AccentPaletteSettings({ value, onChange }) {
    return (
        <div className="space-y-2 border-t border-cdborder/30 pt-4">
            <div>
                <p className="text-sm font-bold text-cdtext">Accent color</p>
                <p className="text-xs text-cdmuted">
                    Choose a palette for navigation, charts, and highlights. Light/dark mode stays separate.
                </p>
            </div>
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
                role="radiogroup"
                aria-label="Accent color palette"
            >
                {ACCENT_PALETTES.map((palette) => {
                    const selected = value === palette.id;
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
                                {palette.swatches.map((hex) => (
                                    <span
                                        key={hex}
                                        className="h-5 flex-1 rounded-sm border border-cdborder/40"
                                        style={{ backgroundColor: hex }}
                                    />
                                ))}
                            </div>
                            <p className="text-xs font-bold text-cdtext">{palette.label}</p>
                            <p className="text-[10px] text-cdmuted leading-snug mt-0.5">{palette.description}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
