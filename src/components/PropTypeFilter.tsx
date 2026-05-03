'use client';

interface PropTypeFilterProps {
  selected: string | null;
  onSelect: (propType: string | null) => void;
}

const OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'threes', label: '3PM' },
  { key: 'assists', label: 'Assists' },
];

export function PropTypeFilter({ selected, onSelect }: PropTypeFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-white/40 text-xs uppercase tracking-wider mr-1">Prop</span>
      {OPTIONS.map(({ key, label }) => (
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
