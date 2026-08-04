import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
    DEFAULT_QUICK_LINKS,
    MAX_QUICK_LINKS,
    QUICK_LINK_ICON_OPTIONS,
    prepareQuickLinksForEditor,
} from '../../utils/quickLinks';
import { inputBaseClass } from '../ui';

export default function QuickLinksSettings({ quickLinks, onChange }) {
    const [links, setLinks] = useState(() => prepareQuickLinksForEditor(quickLinks));

    useEffect(() => {
        setLinks(prepareQuickLinksForEditor(quickLinks));
    }, [quickLinks]);

    const commitLinks = (nextLinks) => {
        setLinks(nextLinks);
        onChange(nextLinks);
    };

    const updateLink = (index, field, value) => {
        commitLinks(links.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
    };

    const addLink = () => {
        if (links.length >= MAX_QUICK_LINKS) return;
        commitLinks([
            ...links,
            {
                id: `custom-${Date.now()}`,
                label: 'New link',
                href: 'https://example.com',
                icon: 'link',
            },
        ]);
    };

    const removeLink = (index) => {
        commitLinks(links.filter((_, i) => i !== index));
    };

    const resetDefaults = () => {
        commitLinks(DEFAULT_QUICK_LINKS.map((l) => ({ ...l })));
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-cdmuted leading-relaxed">
                Up to {MAX_QUICK_LINKS} shortcuts shown in the site banner (with icons). Invalid URLs are hidden in the banner until fixed.
            </p>

            {links.map((link, index) => (
                <div key={link.id} className="rounded-lg border border-cdborder p-3 space-y-2 bg-cdborder/10">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-cdmuted uppercase">Link {index + 1}</span>
                        <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="text-cdmuted hover:text-red-400 transition-colors p-1"
                            aria-label={`Remove link ${index + 1}`}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(index, 'label', e.target.value)}
                        placeholder="Label"
                        maxLength={40}
                        className={inputBaseClass}
                    />
                    <input
                        type="url"
                        value={link.href}
                        onChange={(e) => updateLink(index, 'href', e.target.value)}
                        placeholder="https://..."
                        maxLength={300}
                        className={inputBaseClass}
                    />
                    <select
                        value={link.icon}
                        onChange={(e) => updateLink(index, 'icon', e.target.value)}
                        className={inputBaseClass}
                    >
                        {QUICK_LINK_ICON_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            ))}

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={addLink}
                    disabled={links.length >= MAX_QUICK_LINKS}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-cdborder text-cdtext hover:border-cdaccent disabled:opacity-40"
                >
                    <Plus size={14} />
                    Add link
                </button>
                <button
                    type="button"
                    onClick={resetDefaults}
                    className="text-xs text-cdmuted hover:text-cdtext underline px-2 py-2"
                >
                    Reset to defaults
                </button>
            </div>
        </div>
    );
}
