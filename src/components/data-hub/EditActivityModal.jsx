
import React, { useState, useMemo } from 'react';
import { X, Edit2, Save, Bike, ArrowUpRight } from 'lucide-react';
import { formatTime } from '../../utils';
import NlDateInput from '../NlDateInput';
import { SPORT_TYPES } from '../../config';
import { buildUnifiedBikesList } from '../../utils/unifiedBikesList';
import ModalPortal from '../ui/ModalPortal';
import { useModalA11y } from '../../hooks/useModalA11y';

const EditActivityModal = ({ activity, allActivities = [], onClose, onSave, onFindOnStrava }) => {
    const panelRef = useModalA11y({ isOpen: true, onClose });
    // Lokale state voor het formulier
    const [formData, setFormData] = useState(activity);
    const [isCustomGear, setIsCustomGear] = useState(false);


    const unifiedBikesList = useMemo(() => buildUnifiedBikesList(allActivities), [allActivities]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let val = value;

        // Converteer numerieke inputs direct naar getallen
        if (type === 'number') {
            val = value === '' ? 0 : parseFloat(value);
        }

        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // Custom alleen als gear echt niet in de lijst valt (id noch naam)
    React.useEffect(() => {
        const gid = formData.gear_id != null ? String(formData.gear_id).trim() : '';
        const gn = formData.gear_name != null ? String(formData.gear_name).trim() : '';
        if (!gid && !gn) return;
        const inList = unifiedBikesList.some(
            (b) => (gid && b.id === gid) || (gn && b.name === gn)
        );
        if (!inList && gn) setIsCustomGear(true);
    }, [formData.gear_id, formData.gear_name, unifiedBikesList]);

    return (
        <ModalPortal>
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div
                ref={panelRef}
                className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-activity-modal-title"
                tabIndex={-1}
            >
                <div className="flex justify-between items-center p-4 border-b border-cdborder bg-cdbg rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <h3 id="edit-activity-modal-title" className="text-cdtext font-bold flex items-center gap-2 text-base"><Edit2 size={18} className="text-yellow-400" /> Edit activity</h3>
                        
                        {/* Externe Links */}
                        <div className="flex items-center gap-2">
                            {activity.id && (
                                <a
                                    href={`https://intervals.icu/activities/${activity.id}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30"
                                    title="Open this activity on Intervals.icu"
                                >
                                    <ArrowUpRight size={12} />
                                    <span>Intervals</span>
                                </a>
                            )}
                            {activity.strava_id && (
                                <a
                                    href={`https://www.strava.com/activities/${activity.strava_id}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30"
                                    title="Open this activity on Strava"
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                                    <span>Strava</span>
                                </a>
                            )}
                            {onFindOnStrava && activity.date && (
                                <button
                                    type="button"
                                    onClick={() => onFindOnStrava(activity)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-cdsurfacehigh/30 text-cdmuted hover:bg-cdsurfacehigh/50 border border-cdborder"
                                    title="Find or link this activity on Strava"
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                                    <span>Find / link</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close modal" className="text-cdmuted hover:text-cdtext focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BASIS GEGEVENS */}
                        <div className="col-span-2">
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Title</label>
                            <input name="title" type="text" value={formData.title || ''} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Date</label>
                            <NlDateInput
                                name="date"
                                value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                                onChange={(v) => v && setFormData((prev) => ({ ...prev, date: v }))}
                                className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none"
                                aria-label="Activity date (dd-mm-jjjj)"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Type</label>
                            <select name="type" value={formData.type || 'Ride'} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none">
                                {SPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* FIETS */}
                        <div className="col-span-2">
                            <label className="text-xs text-cdmuted uppercase font-bold flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5"><Bike size={12} /> Bike</span>
                                {isCustomGear && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomGear(false);
                                            setFormData(prev => ({ ...prev, gear_id: null, gear_name: '' }));
                                        }}
                                        className="text-[10px] text-yellow-500 hover:text-yellow-400 font-bold"
                                    >
                                        Back to list
                                    </button>
                                )}
                            </label>

                            {isCustomGear || unifiedBikesList.length === 0 ? (
                                <input
                                    name="gear_name"
                                    type="text"
                                    value={formData.gear_name || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, gear_id: null, gear_name: e.target.value }))}
                                    placeholder="Bike name…"
                                    className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none"
                                />
                            ) : (
                                <select
                                    value={
                                        formData.gear_id ? formData.gear_id :
                                            (formData.gear_name ?
                                                (unifiedBikesList.some(b => b.id === `hist_${formData.gear_name}`) ? `hist_${formData.gear_name}` : '')
                                                : '')
                                    }
                                    onChange={(e) => {
                                        const selectedVal = e.target.value;
                                        if (selectedVal === '___custom___') {
                                            setIsCustomGear(true);
                                            setFormData(prev => ({ ...prev, gear_id: null, gear_name: '' }));
                                            return;
                                        }
                                        if (!selectedVal) {
                                            setFormData(prev => ({ ...prev, gear_id: null, gear_name: null }));
                                            return;
                                        }

                                        if (selectedVal.startsWith('hist_')) {
                                            const name = selectedVal.replace('hist_', '');
                                            setFormData(prev => ({ ...prev, gear_id: null, gear_name: name }));
                                        } else {
                                            const map = unifiedBikesList.reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {});
                                            setFormData(prev => ({
                                                ...prev,
                                                gear_id: selectedVal,
                                                gear_name: map[selectedVal] || null
                                            }));
                                        }
                                    }}
                                    className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none"
                                >
                                    <option value="">— no bike selected —</option>
                                    {unifiedBikesList.map(({ id, name }) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                    <option value="___custom___">+ Add a bike not in the list…</option>
                                </select>
                            )}
                        </div>

                        {/* METRICS */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Distance (km)</label>
                            <input name="distance" type="number" step="0.1" value={formData.distance || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Elevation (m)</label>
                            <input name="climbing" type="number" value={formData.climbing || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Time (sec)</label>
                            <input name="moving_time" type="number" value={formData.moving_time || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                            <span className="text-xs text-cdmuted text-right block mt-1">{formatTime(formData.moving_time)}</span>
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Load (TSS)</label>
                            <input name="load" type="number" value={formData.load || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        {/* POWER & HR */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Avg Power (W)</label>
                            <input name="avg_power" type="number" value={formData.avg_power || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Max Power (W)</label>
                            <input name="max_power" type="number" value={formData.max_power || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Norm Power (NP)</label>
                            <input name="norm_power" type="number" value={formData.norm_power || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Work (kJ)</label>
                            <input name="work" type="number" value={formData.work || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Avg HR (bpm)</label>
                            <input name="avg_hr" type="number" value={formData.avg_hr || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Max HR (bpm)</label>
                            <input name="max_hr" type="number" value={formData.max_hr || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        {/* EXTRA METRICS */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">RPE (1-10)</label>
                            <input name="rpe" type="number" step="0.1" value={formData.rpe || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">FTP (W)</label>
                            <input name="ftp" type="number" value={formData.ftp || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Avg Speed (km/h)</label>
                            <input name="avg_speed" type="number" step="0.1" value={formData.avg_speed || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        {/* BEST EFFORTS — gebruikt voor MMP curve */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>
                        <div className="col-span-2">
                            <p className="text-xs text-cdmuted uppercase font-bold mb-2">Best efforts (W) — used for MMP curve</p>
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 1 min (W)</label>
                            <input name="best_1min" type="number" value={formData.best_1min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 5 min (W)</label>
                            <input name="best_5min" type="number" value={formData.best_5min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 10 min (W)</label>
                            <input name="best_10min" type="number" value={formData.best_10min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 20 min (W)</label>
                            <input name="best_20min" type="number" value={formData.best_20min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 60 min (W)</label>
                            <input name="best_60min" type="number" value={formData.best_60min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 90 min (W)</label>
                            <input name="best_90min" type="number" value={formData.best_90min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Best 120 min (W)</label>
                            <input name="best_120min" type="number" value={formData.best_120min || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cdborder">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-cdonbrand font-bold rounded shadow-lg shadow-yellow-500/20 flex items-center gap-2">
                            <Save size={16} /> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </ModalPortal>
    );
};

export default EditActivityModal;
