import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles, Loader2, Brain, Cpu } from 'lucide-react';
import { COACH_QUICK_QUESTIONS } from '../../utils/coach/coachQaEngine';
import { askCoach, hasCoachLlmConfigured } from '../../utils/coach/coachAskService';
import { splitCoachAnswerLead, stripMarkdownBold } from '../../utils/coach/coachAnswerFormat';
import CollapsibleSection from '../ui/CollapsibleSection';

const CoachAskPanel = ({ activities, userSettings, weeklyHoursTarget, intervalsConfig }) => {
    const [question, setQuestion] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const llmEnabled = hasCoachLlmConfigured(userSettings);

    const ask = async (prompt) => {
        const q = String(prompt || question).trim();
        if (!q || loading) return;

        setLoading(true);
        setQuestion('');

        try {
            const recentHistory = history.slice(-3).map((h) => ({
                question: h.question,
                answer: h.answer,
            }));
            const result = await askCoach(q, activities, userSettings, {
                weeklyHoursTarget,
                recentHistory,
                intervalsConfig,
            });
            setHistory((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    question: q,
                    answer: result.answer,
                    source: result.source,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        ask(question);
    };

    return (
        <CollapsibleSection
            title="Ask the Coach"
            subtitle={llmEnabled
                ? 'Gemini AI — live training data plus intervals.icu CTL/ATL when connected.'
                : 'Local analysis from your activities. Add a Gemini API key in Settings for AI answers.'}
            icon={MessageCircle}
            iconClassName="text-purple-400"
            defaultExpanded={false}
            headerExtra={(
                <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        llmEnabled
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-cdborder/30 text-cdmuted border border-cdborder'
                    }`}
                >
                    {llmEnabled ? <Brain size={11} /> : <Cpu size={11} />}
                    {llmEnabled ? 'AI' : 'Local'}
                </span>
            )}
        >
            <div className="flex flex-wrap gap-2 -mt-1 pb-2 border-b border-cdborder">
                {COACH_QUICK_QUESTIONS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        disabled={loading}
                        onClick={() => ask(item.prompt)}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent transition-colors disabled:opacity-50"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar space-y-4 min-h-[140px] py-2">
                {history.length === 0 && !loading && (
                    <p className="text-sm text-cdmuted text-center py-6 flex flex-col items-center gap-2">
                        <Sparkles size={20} className="text-cdaccent opacity-60" />
                        Pick a quick question or type your own below.
                    </p>
                )}
                {history.map((entry) => (
                    <CoachAnswerBlock key={entry.id} entry={entry} />
                ))}
                {loading && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-cdmuted">
                        <Loader2 size={18} className="animate-spin text-cdaccent" />
                        {llmEnabled ? 'Coach is thinking…' : 'Analyzing your data…'}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="pt-3 border-t border-cdborder flex gap-2">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={loading}
                    placeholder="e.g. Should I ride hard tomorrow?"
                    className="flex-1 bg-cdborder/30 border border-cdborder rounded-lg px-3 py-2 text-sm text-cdtext placeholder:text-cdmuted focus:outline-none focus:border-cdaccent disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!question.trim() || loading}
                    className="shrink-0 px-4 py-2 rounded-lg bg-cdaccent text-cdonbrand font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Ask
                </button>
            </form>
        </CollapsibleSection>
    );
};

function CoachAnswerBlock({ entry }) {
    const [showFull, setShowFull] = useState(false);
    const cleanAnswer = stripMarkdownBold(entry.answer);
    const { lead, body } = splitCoachAnswerLead(cleanAnswer);
    const displayBody = body || (!lead ? cleanAnswer : '');
    const isLong = displayBody.length > 900;
    const visibleBody = isLong && !showFull ? `${displayBody.slice(0, 900).trim()}…` : displayBody;

    return (
        <div className="space-y-2">
            <p className="text-xs text-cdmuted text-right">{entry.question}</p>
            <div
                className={`rounded-lg p-3 border-l-4 ${
                    entry.source === 'llm'
                        ? 'bg-purple-500/10 border-l-purple-400'
                        : 'bg-cdborder/25 border-l-cdaccent'
                }`}
            >
                <div className="flex justify-end mb-1">
                    <span className="text-[9px] uppercase text-cdmuted font-bold">
                        {entry.source === 'llm' ? 'AI' : 'Local'}
                    </span>
                </div>
                {lead && (
                    <p className="text-sm font-bold text-cdtext leading-relaxed whitespace-pre-line">
                        {lead}
                    </p>
                )}
                {displayBody && (
                    <p className={`text-sm text-cdtext leading-relaxed whitespace-pre-line ${lead ? 'mt-2' : ''}`}>
                        {visibleBody}
                    </p>
                )}
                {isLong && (
                    <button
                        type="button"
                        onClick={() => setShowFull((v) => !v)}
                        className="mt-2 text-xs font-medium text-cdaccent hover:underline"
                    >
                        {showFull ? 'Show less' : 'Show full answer'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default CoachAskPanel;
