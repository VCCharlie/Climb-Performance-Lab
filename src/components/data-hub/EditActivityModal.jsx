
import React, { useState } from 'react';
import {
    X, Edit2, Save
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { SPORT_TYPES } from '../../config';

const EditActivityModal = ({ activity, onClose, onSave }) => {
    // Lokale state voor het formulier
    const [formData, setFormData] = useState(activity);

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

    // Datum helper voor input type="date" (vereist YYYY-MM-DD)
    const dateValue = formData.date ? new Date(formData.date).toISOString().split('T')[0] : '';

    return (
        <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-cdborder bg-cdbg rounded-t-xl">
                    <h3 className="text-cdtext font-bold flex items-center gap-2"><Edit2 size={18} className="text-yellow-400" /> Activiteit Bewerken</h3>
                    <button onClick={onClose} className="text-cdmuted hover:text-cdtext"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BASIS GEGEVENS */}
                        <div className="col-span-2">
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Titel</label>
                            <input name="title" type="text" value={formData.title || ''} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Datum</label>
                            <input name="date" type="date" value={dateValue} onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value).toISOString().split('T')[0] }))} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Type</label>
                            <select name="type" value={formData.type || 'Ride'} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none">
                                {SPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* METRICS */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>

                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Afstand (km)</label>
                            <input name="distance" type="number" step="0.1" value={formData.distance || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Hoogtemeters (m)</label>
                            <input name="climbing" type="number" value={formData.climbing || 0} onChange={handleChange} className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase font-bold block mb-1">Tijd (sec)</label>
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

                        {/* BEST EFFORTS */}
                        <div className="col-span-2 h-px bg-cdborder my-2"></div>
                        <div className="col-span-2">
                            <p className="text-xs text-cdmuted uppercase font-bold mb-2">Best Efforts (W) — gebruikt voor MMP curve</p>
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
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cdborder">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Annuleren</button>
                        <button type="submit" className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded shadow-lg shadow-yellow-500/20 flex items-center gap-2">
                            <Save size={16} /> Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditActivityModal;
