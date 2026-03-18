import { PaperTrade } from '@/types/database';
import { americanToDecimal } from '@/lib/odds';

interface SignalsTableProps {
  signals: PaperTrade[];
  loading: boolean;
  noSignalsToday?: boolean;
  signalDate?: string | null;
}

const STRATEGY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  'unders_2.5+_5f': { label: '5f', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'unders_3.5+': { label: '3.5+', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'unders_2.5+': { label: 'legacy', bg: 'bg-white/10', text: 'text-white/50' },
};

function StrategyPill({ strategy }: { strategy: string }) {
  const style = STRATEGY_STYLES[strategy] ?? { label: strategy.slice(0, 6), bg: 'bg-white/10', text: 'text-white/50' };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function ClvDot({ odds, closingOdds }: { odds: number; closingOdds: number | null }) {
  if (closingOdds == null) {
    return <span className="text-white/20">&mdash;</span>;
  }
  const openDec = americanToDecimal(odds);
  const closeDec = americanToDecimal(closingOdds);
  const beatsClosing = openDec > closeDec;
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${beatsClosing ? 'bg-green-400' : 'bg-red-400'}`} />
  );
}

export function SignalsTable({ signals, loading, noSignalsToday, signalDate }: SignalsTableProps) {
  if (loading) {
    return <div className="text-white/50">Loading signals...</div>;
  }

  if (noSignalsToday) {
    const fallbackDateLabel = signalDate
      ? new Date(signalDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      : null;

    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
          <p className="text-white/70 text-sm font-medium">No signals today</p>
          <p className="text-white/40 text-xs mt-1">
            The model found no bets meeting the edge threshold.
          </p>
        </div>
        {signals.length > 0 && fallbackDateLabel && (
          <div className="mt-2">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">
              Last signals &mdash; {fallbackDateLabel}
            </p>
            <div className="space-y-2">
              {signals.slice(0, 5).map((signal) => (
                <div key={signal.signal_id} className="flex justify-between items-center text-xs text-white/60">
                  <span className="flex items-center gap-2">
                    {signal.player_name}
                    <StrategyPill strategy={signal.strategy} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{signal.side.toUpperCase()} {signal.line}</span>
                    <StatusBadge outcome={signal.outcome} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>
        <p className="text-white/50">No signals for today</p>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {signals.map((signal) => (
          <div key={signal.signal_id} className="bg-white/5 rounded-xl p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white text-sm">{signal.player_name}</p>
                  {signal.team && (
                    <span className="text-[10px] text-white/50 font-medium">{signal.team}</span>
                  )}
                  <StrategyPill strategy={signal.strategy} />
                </div>
                <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line} @ {americanToDecimal(signal.odds).toFixed(2)}</p>
              </div>
              <StatusBadge outcome={signal.outcome} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</span>
              <span className="flex items-center gap-2">
                <ClvDot odds={signal.odds} closingOdds={signal.closing_odds} />
                <span className="text-white/50">{signal.bookmaker}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
            <th className="text-left pb-3">Player</th>
            <th className="text-left pb-3">Line</th>
            <th className="text-left pb-3">Odds</th>
            <th className="text-left pb-3">Edge</th>
            <th className="text-left pb-3">Strat</th>
            <th className="text-center pb-3">CLV</th>
            <th className="text-right pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {signals.map((signal) => (
            <tr key={signal.signal_id} className="border-b border-white/5">
              <td className="py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{signal.player_name}</p>
                    {signal.team && (
                      <span className="text-xs text-white/40 font-medium">{signal.team}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line}</p>
                </div>
              </td>
              <td className="py-3 font-mono text-white/70">{signal.line}</td>
              <td className="py-3 font-mono text-white/70">{americanToDecimal(signal.odds).toFixed(2)}</td>
              <td className="py-3">
                <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</span>
              </td>
              <td className="py-3">
                <StrategyPill strategy={signal.strategy} />
              </td>
              <td className="py-3 text-center">
                <ClvDot odds={signal.odds} closingOdds={signal.closing_odds} />
              </td>
              <td className="py-3 text-right">
                <StatusBadge outcome={signal.outcome} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">Pending</span>;
  }
  if (outcome === 'win') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Win</span>;
  }
  if (outcome === 'voided') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/50">Voided</span>;
  }
  if (outcome === 'push') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Push</span>;
  }
  return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Loss</span>;
}
