import React, { useState } from 'react';
import { Download, Upload, ArrowUpRight } from 'lucide-react';
import { smartParseCSV, smartParseJSON } from '../../utils';

const ImportTab = ({ intervalsConfig, onImportResults }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [importText, setImportText] = useState("");

    const processFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (text) processText(text);
        };
        reader.readAsText(file);
    };

    const processText = (text) => {
        const trimmed = text.trim();
        if (!trimmed) { alert("Geen data gevonden."); return; }

        let parsedData = [];
        try {
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                parsedData = smartParseJSON(trimmed);
            } else {
                parsedData = smartParseCSV(trimmed);
            }

            if (parsedData.length > 0) {
                onImportResults(parsedData);
                setImportText("");
            } else {
                alert("Kon geen geldige activiteiten vinden. Controleer of het formaat CSV of JSON is.");
            }
        } catch (err) {
            console.error(err);
            alert("Fout bij verwerken data: " + err.message);
        }
    };

    const handleManualImport = () => {
        processText(importText);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
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

                <div
                    className={`relative w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all p-4
                        ${isDragging ? 'border-yellow-400 bg-yellow-400/10' : 'border-cdborder bg-cdsurface'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="text-center space-y-2 pointer-events-none">
                        <Upload size={32} className={`mx-auto ${isDragging ? 'text-yellow-400' : 'text-cdmuted'}`} />
                        <p className="text-sm font-medium text-cdtext">Sleep je CSV/JSON bestand hierheen</p>
                        <p className="text-xs text-cdmuted">of plak de tekst hieronder</p>
                    </div>

                    <textarea
                        className="mt-4 w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder="Plak tekst hier..." // Hidden but accessible for paste
                    />
                </div>

                {/* Fallback Text Area for Manual Paste if Drag & Drop fails or prefers text */}
                <div className="mt-4">
                    <p className="text-xs text-cdmuted mb-1">Of plak de tekst direct:</p>
                    <textarea
                        className="w-full h-24 bg-cdbg border border-cdborder rounded p-2 text-xs font-mono text-cdtext focus:border-yellow-400 outline-none transition-colors"
                        placeholder="Plak hier je CSV of JSON data..."
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                    />
                </div>

                <button onClick={handleManualImport} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-3 rounded shadow-lg shadow-yellow-400/20 transition-all">Verwerk Data</button>
            </div>
        </div>
    );
};

export default ImportTab;
