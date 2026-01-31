import { PaperTrade } from '@/types/database';

interface SignalsTableProps {
  signals: PaperTrade[];
  loading: boolean;
}

export function SignalsTable({ signals, loading }: SignalsTableProps) {
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

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {signals.map((signal) => (
          <div key={signal.signal_id} className="bg-white/5 rounded-xl p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-white text-sm">{signal.player_name}</p>
                <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line}</p>
              </div>
              <StatusBadge outcome={signal.outcome} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}% edge</span>
              <span className="text-white/50">{signal.bookmaker}</span>
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
            <th className="text-left pb-3">Edge</th>
            <th className="text-left pb-3">Book</th>
            <th className="text-right pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {signals.map((signal) => (
            <tr key={signal.signal_id} className="border-b border-white/5">
              <td className="py-3">
                <div>
                  <p className="font-medium text-white">{signal.player_name}</p>
                  <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line}</p>
                </div>
              </td>
              <td className="py-3 font-mono text-white/70">{signal.line}</td>
              <td className="py-3 text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</td>
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

function StatusBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">Pending</span>;
  }
  if (outcome === 'win') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Win</span>;
  }
  return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Loss</span>;
}
