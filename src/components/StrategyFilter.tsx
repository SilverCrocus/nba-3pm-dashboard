'use client';

interface StrategyFilterProps {
  strategies: string[];
  selected: string | null; // null = "All"
  onSelect: (strategy: string | null) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  'unders_2.5+_5f': '5f',
  'unders_3.5+': '3.5+',
  'unders_2.5+': 'Legacy',
  'playoffs_multi_agent': 'Multi-Agent',
  'playoffs_llm_enhanced': 'Debate',
  'assists_multi_agent': 'Assists MA',
};

export function StrategyFilter({ strategies, selected, onSelect }: StrategyFilterProps) {
  const pills = [
    { key: null, label: 'All' },
    ...strategies.map(s => ({ key: s, label: STRATEGY_LABELS[s] || s })),
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-white/40 text-xs uppercase tracking-wider mr-1">Strategy</span>
      {pills.map(({ key, label }) => (
        <button
          key={label}
          onClick={() => onSelect(key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === key
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
