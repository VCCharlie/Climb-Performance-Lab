import React, { useState } from 'react';
import { Download, Upload, ArrowUpRight } from 'lucide-react';
import { smartParseCSV, smartParseJSON } from '../../utils';

const ImportSection = ({ intervalsConfig = { athleteId: '' }, onDataDetected }) => {
    const [importText, setImportText] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setImportText(text);
        };
        reader.readAsText(file);
    };

    const handleProcessInfo = () => {
        const text = importText.trim();
        if (!text) { alert("Plak eerst data in het veld."); return; }

        const parsedData = text.startsWith('[') || text.startsWith('{') ? smartParseJSON(text) : smartParseCSV(text);

        if (parsedData.length > 0) {
            onDataDetected(parsedData);
            setImportText(""); // Clear after success?
        } else {
            alert("Kon geen geldige activiteiten vinden.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-cdbg/50 p-4 rounded border border-cdborder">
                <h4 className="text-cdtext font-bold text-sm mb-2 flex items-center gap-2"><Download size={16} className="text-blue-400" /> Stap 1: Download Data</h4>
                <p className="text-xs text-cdmuted mb-3">Ga naar de Intervals Activities pagina, klik op "List View", selecteer je ritten en kies <strong>Edit &gt; Export CSV</strong>.</p>
                <a href={`https://intervals.icu/athlete/${intervalsConfig.athleteId}/activities`} target="_blank" rel="noreferrer" className="text-xs bg-cdborder hover:bg-slate-600 text-cdtext px-3 py-2 rounded inline-flex items-center gap-2 transition-colors">Open Intervals.icu Activities <ArrowUpRight size={12} /></a>
            </div>

            <div>
                <h4 className="text-cdtext font-bold text-sm mb-2 flex items-center gap-2"><Upload size={16} className="text-green-400" /> Stap 2: Importeer Bestand</h4>

                {/* DRAG & DROP ZONE */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileUpload(e.dataTransfer.files[0]);
                        }
                    }}
                    onClick={() => document.getElementById('fileInput').click()}
                    className={`
                                    border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all
                                    ${isDragging ? 'border-yellow-400 bg-yellow-400/10' : 'border-cdborder hover:border-slate-400 bg-cdsurface'}
                                `}
                >
                    <input
                        id="fileInput"
                        type="file"
                        accept=".csv,.json"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                    />
                    <Upload className={`mx-auto mb-2 ${isDragging ? 'text-yellow-400' : 'text-cdmuted'}`} size={32} />
                    <p className="text-sm font-bold text-cdtext">Klik om te openen / Sleep bestand hierheen</p>
                    <p className="text-xs text-cdmuted mt-1">Ondersteunt .csv en .json export van Intervals.icu</p>
                </div>

                <div className="relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cdbg px-2 text-[10px] text-cdmuted uppercase font-bold">Of plak tekst</span>
                    <textarea
                        className="w-full h-32 bg-cdsurface border border-cdborder rounded p-3 text-xs font-mono text-cdtext focus:border-yellow-400 outline-none transition-colors"
                        placeholder="Plak de CSV tekst hier..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                    />
                </div>

                <button onClick={handleProcessInfo} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-3 rounded shadow-lg shadow-yellow-400/20 transition-all">Verwerk Data (CSV of JSON)</button>
            </div>
        </div>
    );
};

export default ImportSection;
