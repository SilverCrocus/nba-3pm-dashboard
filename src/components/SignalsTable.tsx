import { SizedSignal, KellyFraction } from '@/types/database';

// Convert American odds to decimal odds for display
function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    return 1 + (100 / Math.abs(americanOdds));
  } else {
    return 1 + (americanOdds / 100);
  }
}

interface SignalsTableProps {
  signals: SizedSignal[];
  loading: boolean;
  bankroll: number | null;
  onBankrollChange: (value: number | null) => void;
  totalRisk: number;
  activeBets: number;
  kellyFraction: KellyFraction;
}

export function SignalsTable({ signals, loading, bankroll, onBankrollChange, totalRisk, activeBets, kellyFraction }: SignalsTableProps) {
  if (loading) {
    return <div className="text-white/50">Loading signals...</div>;
  }

  if (signals.length === 0) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>
        <p className="text-white/50">No signals for today</p>
      </div>
    );
  }

  const pendingCount = signals.filter(s => !s.outcome).length;

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>

      {/* Bankroll Input Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <label className="text-white/50 text-xs font-medium whitespace-nowrap">Your Bankroll:</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={bankroll ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                if (raw === '') {
                  onBankrollChange(null);
                } else {
                  const parsed = parseFloat(raw);
                  if (!isNaN(parsed)) onBankrollChange(parsed);
                }
              }}
              placeholder="500"
              className="w-28 bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
            />
          </div>
        </div>
        {bankroll && bankroll > 0 && (
          <div className="flex gap-3 text-xs">
            <span className="text-white/50">
              Total Risk: <span className="text-orange-400 font-medium">${totalRisk.toFixed(0)} ({((totalRisk / bankroll) * 100).toFixed(1)}%)</span>
            </span>
            <span className="text-white/50">
              Bets: <span className="text-white/70 font-medium">{activeBets} of {pendingCount}</span>
            </span>
          </div>
        )}
      </div>

      {/* Mobile: Card layout */}
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
                </div>
                <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line} @ {americanToDecimal(signal.odds).toFixed(2)}</p>
              </div>
              <StatusBadge outcome={signal.outcome} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}% edge</span>
              <span className="text-white/50">{signal.bookmaker}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-white/40">Bet:</span>
              <BetCell signal={signal} bankroll={bankroll} kellyFraction={kellyFraction} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
            <th className="text-left pb-3">Player</th>
            <th className="text-left pb-3">Line</th>
            <th className="text-left pb-3">Odds</th>
            <th className="text-left pb-3">Edge</th>
            <th className="text-left pb-3">Bet</th>
            <th className="text-left pb-3">Book</th>
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
              <td className="py-3 text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</td>
              <td className="py-3">
                <BetCell signal={signal} bankroll={bankroll} kellyFraction={kellyFraction} />
              </td>
              <td className="py-3 text-white/50">{signal.bookmaker}</td>
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

function BetCell({ signal, bankroll, kellyFraction }: { signal: SizedSignal; bankroll: number | null; kellyFraction: KellyFraction }) {
  if (!bankroll || bankroll <= 0) {
    return <span className="text-white/40 font-mono text-sm">{(signal.kelly_stake * kellyFraction * 100).toFixed(1)}%</span>;
  }

  if (signal.dollarBet === null) {
    const reason = 'Daily cap reached';
    return (
      <span className="text-orange-400/60 text-xs font-medium cursor-help" title={reason}>
        Skip
      </span>
    );
  }

  return (
    <span className="text-green-400 font-medium font-mono text-sm">
      ${signal.dollarBet.toFixed(2)}
    </span>
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
