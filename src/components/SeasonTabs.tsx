'use client';

import { Phase, SubTab } from '@/hooks/useTrades';

interface SeasonTabsProps {
  phase: Phase;
  subTab: SubTab;
  onPhaseChange: (phase: Phase) => void;
  onSubTabChange: (subTab: SubTab) => void;
}

const PHASES: { key: Phase; label: string }[] = [
  { key: 'regular', label: 'Regular Season' },
  { key: 'playoffs', label: 'Playoffs' },
];

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'threes', label: '3PM' },
  { key: 'assists', label: 'Assists' },
];

export function SeasonTabs({ phase, subTab, onPhaseChange, onSubTabChange }: SeasonTabsProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2">
        {PHASES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPhaseChange(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              phase === key
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {phase === 'playoffs' && (
        <div className="flex items-center gap-2 pl-1">
          {SUB_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSubTabChange(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                subTab === key
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
