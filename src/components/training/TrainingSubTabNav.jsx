import React, { useEffect, useRef } from 'react';
import { Brain, Flag, Heart } from 'lucide-react';
import { cn } from '../ui';
import { useTabListKeyboard } from '../../hooks/useTabListKeyboard';

const TRAINING_TAB_IDS = ['coach', 'goal', 'recovery'];

const TRAINING_TABS = [
    { id: 'coach', label: 'AI Coach', mobileLabel: 'Coach', icon: Brain },
    { id: 'goal', label: 'Goals & Planning', mobileLabel: 'Goals', icon: Flag },
    { id: 'recovery', label: 'Recovery', icon: Heart },
];

function tabButtonClass(isActive) {
    return cn(
        'shrink-0 md:flex-1 md:min-w-[5.5rem] px-3 md:px-2 py-2 md:py-3',
        'text-xs md:text-sm font-bold whitespace-nowrap cd-focus-ring cd-transition',
        isActive
            ? 'bg-cdborder text-yellow-400'
            : 'text-cdmuted hover:bg-cdborder/50',
    );
}

/**
 * Training sub-tab strip — matches Dashboard mobile scroll pattern; equal-width row on desktop.
 */
export default function TrainingSubTabNav({ activeTab, onChange }) {
    const scrollRef = useRef(null);
    const activeButtonRef = useRef(null);
    const onKeyDown = useTabListKeyboard(TRAINING_TAB_IDS, activeTab, onChange);

    useEffect(() => {
        const el = activeButtonRef.current;
        const container = scrollRef.current;
        if (!el || !container) return;

        const isMobile = typeof window.matchMedia === 'function'
            && window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        const targetLeft = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }, [activeTab]);

    return (
        <div
            ref={scrollRef}
            className={cn(
                'flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible',
                'border-b border-cdborder mb-4 -mx-1 px-1',
                'scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            )}
            role="tablist"
            aria-label="Training section"
            onKeyDown={onKeyDown}
        >
            {TRAINING_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        ref={isActive ? activeButtonRef : null}
                        type="button"
                        id={`tab-training-${tab.id}`}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.id)}
                        className={tabButtonClass(isActive)}
                    >
                        <span className="inline-flex items-center justify-center gap-1.5">
                            <Icon className="w-4 h-4 shrink-0" aria-hidden />
                            <span className="md:hidden">{tab.mobileLabel ?? tab.label}</span>
                            <span className="hidden md:inline">{tab.label}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
