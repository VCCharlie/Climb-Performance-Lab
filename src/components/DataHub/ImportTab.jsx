import React, { useState } from 'react';
import { Download, Upload, ArrowUpRight } from 'lucide-react';
import { smartParseCSV, smartParseJSON } from '../../utils';

const ImportTab = ({ intervalsConfig, onImportResults }) => {
    const [importText, setImportText] = useState("");

    const handleManualImport = () => {
        const text = importText.trim();
        if (!text) { alert("Plak eerst data in het veld."); return; }

        let parsedData = [];
        if (text.startsWith('[') || text.startsWith('{')) {
            parsedData = smartParseJSON(text);
        } else {
            parsedData = smartParseCSV(text);
        }

        if (parsedData.length > 0) {
            onImportResults(parsedData);
            setImportText("");
        } else {
            alert("Kon geen geldige activiteiten vinden. Controleer of het formaat CSV of JSON is.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><Download size={16} className="text-blue-400" /> Stap 1: Download Data</h4>
                <p className="text-xs text-slate-400 mb-3">Ga naar de Intervals Activities pagina, klik op "List View", selecteer je ritten en kies <strong>Edit &gt; Export CSV</strong>.</p>
                <a href={`https://intervals.icu/athlete/${intervalsConfig.athleteId}/activities`} target="_blank" rel="noreferrer" className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded inline-flex items-center gap-2 transition-colors">Open Intervals.icu Activities <ArrowUpRight size={12} /></a>
            </div>
            <div>
                <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><Upload size={16} className="text-green-400" /> Stap 2: Importeer Bestand</h4>
                <textarea className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white focus:border-yellow-400 outline-none transition-colors" placeholder="Plak de CSV tekst hier..." value={importText} onChange={e => setImportText(e.target.value)} />
                <button onClick={handleManualImport} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-3 rounded shadow-lg shadow-yellow-400/20 transition-all">Verwerk Data (CSV of JSON)</button>
            </div>
        </div>
    );
};

export default ImportTab;
