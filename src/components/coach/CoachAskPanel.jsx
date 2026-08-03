import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { COACH_QUICK_QUESTIONS, answerCoachQuestion } from '../../utils/coach/coachQaEngine';

const CoachAskPanel = ({ activities, userSettings, weeklyHoursTarget }) => {
    const [question, setQuestion] = useState('');
    const [history, setHistory] = useState([]);

    const ask = (prompt) => {
        const q = String(prompt || question).trim();
        if (!q) return;

        const result = answerCoachQuestion(q, activities, userSettings, { weeklyHoursTarget });
        setHistory((prev) => [
            ...prev,
            { id: Date.now(), question: q, title: result.title, answer: result.answer },
        ]);
        setQuestion('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        ask(question);
    };

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden">
            <div className="p-5 border-b border-cdborder">
                <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                    <MessageCircle size={20} className="text-purple-400" />
                    Ask the Coach
                </h3>
                <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                    Data-driven answers from your activities — form, load, FTP signals, and period reviews.
                    No account or API key needed; everything runs locally in your browser.
                </p>
            </div>

            <div className="p-4 flex flex-wrap gap-2 border-b border-cdborder bg-cdborder/10">
                {COACH_QUICK_QUESTIONS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => ask(item.prompt)}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent transition-colors"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar space-y-4 min-h-[120px]">
                {history.length === 0 && (
                    <p className="text-sm text-cdmuted text-center py-6 flex flex-col items-center gap-2">
                        <Sparkles size={20} className="text-cdaccent opacity-60" />
                        Pick a quick question or type your own below.
                    </p>
                )}
                {history.map((entry) => (
                    <div key={entry.id} className="space-y-2">
                        <p className="text-xs text-cdmuted text-right">{entry.question}</p>
                        <div className="bg-cdborder/25 rounded-lg p-3 border-l-4 border-l-purple-400">
                            <p className="text-sm font-bold text-cdtext mb-1">{entry.title}</p>
                            <p className="text-sm text-cdtext leading-relaxed whitespace-pre-line">
                                {entry.answer.replace(/\*\*/g, '')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-cdborder flex gap-2">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Should I ride hard tomorrow?"
                    className="flex-1 bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext placeholder:text-cdmuted focus:outline-none focus:border-cdaccent"
                />
                <button
                    type="submit"
                    disabled={!question.trim()}
                    className="shrink-0 px-4 py-2 rounded-lg bg-cdaccent text-slate-900 font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                    <Send size={14} />
                    Ask
                </button>
            </form>
        </div>
    );
};

export default CoachAskPanel;
