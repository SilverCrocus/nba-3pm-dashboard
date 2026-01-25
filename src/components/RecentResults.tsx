import { PaperTrade } from '@/types/database';

interface RecentResultsProps {
  results: PaperTrade[];
  loading: boolean;
}

export function RecentResults({ results, loading }: RecentResultsProps) {
  if (loading) {
    return <div className="text-white/50">Loading results...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-purple-600/60 to-purple-800/60 rounded-3xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Recent Results</h3>
      <div className="flex gap-2 h-24 items-end">
        {results.slice(0, 10).reverse().map((result, i) => (
          <div
            key={result.signal_id}
            className={['flex-1 rounded-t-lg transition-all',
              result.outcome === 'win' ? 'bg-green-500' : 'bg-red-500'
            ].join(' ')}
            style={{
              height: Math.abs((result.profit || 0) * 100 * 20 + 20) + '%',
              opacity: 0.6 + (i * 0.04)
            }}
            title={result.player_name + ': ' + result.outcome}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/40 mt-2">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  );
}
