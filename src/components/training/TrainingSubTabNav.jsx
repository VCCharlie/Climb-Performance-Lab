import React from 'react';
import { Brain, Flag, Heart } from 'lucide-react';
import { useTabListKeyboard } from '../../hooks/useTabListKeyboard';
import SubTabNav from '../ui/SubTabNav';

const TRAINING_TAB_IDS = ['coach', 'goal', 'recovery'];

const TRAINING_TABS = [
    { id: 'coach', label: 'AI Coach', mobileLabel: 'Coach', icon: Brain },
    { id: 'goal', label: 'Goals & Planning', mobileLabel: 'Goals', icon: Flag },
    { id: 'recovery', label: 'Recovery', icon: Heart },
];

/**
 * Training sub-tab strip — matches Dashboard mobile scroll pattern; equal-width row on desktop.
 */
export default function TrainingSubTabNav({ activeTab, onChange }) {
    const onKeyDown = useTabListKeyboard(TRAINING_TAB_IDS, activeTab, onChange);

    return (
        <SubTabNav
            tabs={TRAINING_TABS}
            activeTab={activeTab}
            onTabChange={onChange}
            onKeyDown={onKeyDown}
            ariaLabel="Training section"
            idPrefix="tab-training"
        />
    );
}
