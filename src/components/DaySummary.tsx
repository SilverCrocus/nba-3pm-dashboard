import { EnrichedSignal, SignalStatus } from '@/types/database';

interface DaySummaryProps {
  signals: EnrichedSignal[];
}

const chipConfig: Record<string, { label: string; bg: string; text: string }> = {
  hit: { label: 'HIT', bg: 'bg-green-500/20', text: 'text-green-400' },
  miss: { label: 'MISS', bg: 'bg-red-500/20', text: 'text-red-400' },
  tracking: { label: 'TRACKING', bg: 'bg-green-500/20', text: 'text-green-400' },
  scheduled: { label: 'SCHED', bg: 'bg-orange-500/20', text: 'text-orange-400' },
};

export function DaySummary({ signals }: DaySummaryProps) {
  // Count by live-derived signalStatus
  const counts: Record<string, number> = { hit: 0, miss: 0, tracking: 0, scheduled: 0 };
  for (const s of signals) {
    if (s.signalStatus in counts) {
      counts[s.signalStatus]++;
    }
  }

  // P&L from Supabase-confirmed outcomes only
  const confirmedPnL = signals.reduce((sum, s) => {
    if (s.outcome && s.outcome !== 'voided' && s.profit !== null) {
      return sum + s.profit;
    }
    return sum;
  }, 0);
  const hasConfirmedResults = signals.some(s => s.outcome && s.outcome !== 'voided');

  // Only show if there are signals
  if (signals.length === 0) return null;

  const visibleChips = (Object.keys(chipConfig) as string[]).filter(key => counts[key] > 0);

  return (
    <div className="mb-4 md:mb-6">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {visibleChips.map(key => {
          const { label, bg, text } = chipConfig[key];
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}
            >
              <span className="font-mono">{counts[key]}</span>
              {label}
            </span>
          );
        })}

        {hasConfirmedResults && (
          <>
            <span className="text-white/20 hidden md:inline">|</span>
            <span
              className={`text-sm font-semibold font-mono ${
                confirmedPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {confirmedPnL >= 0 ? '+' : ''}{confirmedPnL.toFixed(2)}u
            </span>
          </>
        )}
      </div>
    </div>
  );
}
