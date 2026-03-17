'use client';

import { DateRange } from '@/hooks/useTrades';

type Preset = '7d' | '30d' | 'season' | 'all';

interface DateRangeFilterProps {
  selected: Preset;
  onSelect: (preset: Preset, range: DateRange | null) => void;
}

function getDateRange(preset: Preset): DateRange | null {
  if (preset === 'all') return null;

  const now = new Date();
  // Use ET timezone for NBA dates
  const etFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });

  if (preset === 'season') {
    return { start: '2024-10-22' }; // NBA season start
  }

  const days = preset === '7d' ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start: etFormatter.format(start) };
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: 'season', label: 'Season' },
  { key: 'all', label: 'All Time' },
];

export function DateRangeFilter({ selected, onSelect }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onSelect(key, getDateRange(key))}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
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
