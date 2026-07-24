import React, { useMemo, useState } from 'react';
import { X, Save, Bike, Layers } from 'lucide-react';
import { SPORT_TYPES } from '../../config';
import { buildUnifiedBikesList } from '../../utils/unifiedBikesList';
import ModalPortal from '../ui/ModalPortal';

/**
 * Bulk-edit selected activities: type (indoor/outdoor), gear, optional load (TSS).
 * Only checked sections apply; unchecked sections leave each activity unchanged.
 */
const BulkEditActivitiesModal = ({
    count,
    allActivities = [],
    onClose,
    onApply,
}) => {
    const unifiedBikesList = useMemo(() => buildUnifiedBikesList(allActivities), [allActivities]);

    const [applyType, setApplyType] = useState(false);
    const [typeValue, setTypeValue] = useState('Ride');

    const [applyGear, setApplyGear] = useState(false);
    const [isCustomGear, setIsCustomGear] = useState(false);
    const [customGearName, setCustomGearName] = useState('');

    const [applyLoad, setApplyLoad] = useState(false);
    const [loadValue, setLoadValue] = useState('');

    const [applyRpe, setApplyRpe] = useState(false);
    const [rpeValue, setRpeValue] = useState('');

    const [applyFtp, setApplyFtp] = useState(false);
    const [ftpValue, setFtpValue] = useState('');

    const [gearSelectValue, setGearSelectValue] = useState('');

    const buildGearPatch = () => {
        if (!applyGear) return {};
        if (isCustomGear) {
            const name = String(customGearName || '').trim();
            if (!name) return { gear_id: null, gear_name: null };
            return { gear_id: null, gear_name: name };
        }
        if (!gearSelectValue) {
            return { gear_id: null, gear_name: null };
        }
        if (gearSelectValue.startsWith('hist_')) {
            const name = gearSelectValue.replace(/^hist_/, '');
            return { gear_id: null, gear_name: name };
        }
        const map = unifiedBikesList.reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {});
        return {
            gear_id: gearSelectValue,
            gear_name: map[gearSelectValue] || null,
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const patch = {};
        if (applyType && typeValue) {
            patch.type = typeValue;
        }
        if (applyGear) {
            Object.assign(patch, buildGearPatch());
        }
        if (applyLoad) {
            const n = Number(loadValue);
            if (loadValue !== '' && !Number.isNaN(n)) patch.load = n;
        }
        if (applyRpe) {
            const n = Number(rpeValue);
            if (rpeValue !== '' && !Number.isNaN(n)) patch.rpe = n;
        }
        if (applyFtp) {
            const n = Number(ftpValue);
            if (ftpValue !== '' && !Number.isNaN(n)) patch.ftp = n;
        }
        const hasAny =
            applyType
            || applyGear
            || (applyLoad && loadValue !== '' && !Number.isNaN(Number(loadValue)))
            || (applyRpe && rpeValue !== '' && !Number.isNaN(Number(rpeValue)))
            || (applyFtp && ftpValue !== '' && !Number.isNaN(Number(ftpValue)));
        if (!hasAny) {
            window.alert('Select at least one field to update and enter a value where needed.');
            return;
        }
        onApply(patch);
    };

    return (
        <ModalPortal>
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-cdborder bg-cdbg rounded-t-xl">
                    <h3 className="text-cdtext font-bold flex items-center gap-2 text-base">
                        <Layers size={18} className="text-yellow-400" />
                        Bulk edit ({count} activities)
                    </h3>
                    <button type="button" onClick={onClose} className="text-cdmuted hover:text-cdtext" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    <p className="text-xs text-cdmuted leading-relaxed">
                        Only sections you enable below are written to every selected activity. Other fields stay unchanged.
                    </p>

                    <fieldset className="space-y-2 rounded-lg border border-cdborder p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-cdtext cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyType}
                                onChange={(e) => setApplyType(e.target.checked)}
                                className="accent-yellow-400"
                            />
                            Activity type
                        </label>
                        {applyType && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setApplyType(true);
                                            setTypeValue('GravelRide');
                                        }}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${typeValue === 'GravelRide' ? 'bg-amber-600/25 border-amber-500/50 text-amber-200' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                    >
                                        Gravel ride
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setApplyType(true);
                                            setTypeValue('MountainBikeRide');
                                        }}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${typeValue === 'MountainBikeRide' ? 'bg-lime-600/25 border-lime-500/50 text-lime-200' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                    >
                                        MTB ride
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setApplyType(true);
                                            setTypeValue('Ride');
                                        }}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${typeValue === 'Ride' ? 'bg-cdborder text-cdtext' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                                    >
                                        Road ride
                                    </button>
                                </div>
                                <select
                                    value={typeValue}
                                    onChange={(e) => setTypeValue(e.target.value)}
                                    className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                >
                                    {SPORT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="space-y-2 rounded-lg border border-cdborder p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-cdtext cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyGear}
                                onChange={(e) => setApplyGear(e.target.checked)}
                                className="accent-yellow-400"
                            />
                            <span className="flex items-center gap-1.5"><Bike size={14} /> Bike / gear</span>
                        </label>
                        {applyGear && (
                            <div className="space-y-2">
                                {isCustomGear ? (
                                    <>
                                        <input
                                            type="text"
                                            value={customGearName}
                                            onChange={(e) => setCustomGearName(e.target.value)}
                                            placeholder="Bike name…"
                                            className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomGear(false);
                                                setCustomGearName('');
                                                setGearSelectValue('');
                                            }}
                                            className="text-[10px] text-yellow-500 hover:text-yellow-400 font-bold"
                                        >
                                            Back to list
                                        </button>
                                    </>
                                ) : (
                                    <select
                                        value={gearSelectValue}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v === '___custom___') {
                                                setIsCustomGear(true);
                                                setCustomGearName('');
                                                setGearSelectValue('');
                                                return;
                                            }
                                            setGearSelectValue(v);
                                        }}
                                        className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                    >
                                        <option value="">— Clear bike —</option>
                                        {unifiedBikesList.map(({ id, name }) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                        <option value="___custom___">+ Custom name…</option>
                                    </select>
                                )}
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="space-y-2 rounded-lg border border-cdborder p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-cdtext cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyLoad}
                                onChange={(e) => setApplyLoad(e.target.checked)}
                                className="accent-yellow-400"
                            />
                            Load (TSS)
                        </label>
                        {applyLoad && (
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={loadValue}
                                onChange={(e) => setLoadValue(e.target.value)}
                                className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                placeholder="e.g. 85"
                            />
                        )}
                    </fieldset>

                    <fieldset className="space-y-2 rounded-lg border border-cdborder p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-cdtext cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyRpe}
                                onChange={(e) => setApplyRpe(e.target.checked)}
                                className="accent-yellow-400"
                            />
                            RPE (1–10)
                        </label>
                        {applyRpe && (
                            <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={rpeValue}
                                onChange={(e) => setRpeValue(e.target.value)}
                                className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                placeholder="e.g. 7"
                            />
                        )}
                    </fieldset>

                    <fieldset className="space-y-2 rounded-lg border border-cdborder p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-cdtext cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyFtp}
                                onChange={(e) => setApplyFtp(e.target.checked)}
                                className="accent-yellow-400"
                            />
                            FTP (W) stored on activity
                        </label>
                        {applyFtp && (
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={ftpValue}
                                onChange={(e) => setFtpValue(e.target.value)}
                                className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext text-sm"
                                placeholder="e.g. 250"
                            />
                        )}
                    </fieldset>

                    <div className="flex justify-end gap-3 pt-2 border-t border-cdborder">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded shadow-lg shadow-yellow-500/20 flex items-center gap-2"
                        >
                            <Save size={16} /> Apply to {count}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </ModalPortal>
    );
};

export default BulkEditActivitiesModal;
