import { GameWithSignals } from '@/types/database';
import { LiveStatusBadge } from './LiveStatusBadge';
import { CourtStatus } from './CourtStatus';

function formatStartTime(utc: string): string {
  if (!utc) return '';
  const date = new Date(utc);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }) + ' ET';
}

function formatPeriod(period: number): string {
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

export function GameCard({ game, signals }: GameWithSignals) {
  const isScheduled = game.status === 'scheduled';

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl overflow-hidden">
      {/* Game Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-white font-semibold font-display text-sm md:text-base">{game.awayTeam.tricode}</span>
            {!isScheduled && (
              <span className="text-white/70 font-mono text-sm md:text-base">{game.awayTeam.score}</span>
            )}
          </div>
          <span className="text-white/30 text-xs">@</span>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-white font-semibold font-display text-sm md:text-base">{game.homeTeam.tricode}</span>
            {!isScheduled && (
              <span className="text-white/70 font-mono text-sm md:text-base">{game.homeTeam.score}</span>
            )}
          </div>
          {game.status === 'live' && game.clock && (
            <span className="text-white/40 text-xs font-mono ml-1">
              {formatPeriod(game.period)} {game.clock}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isScheduled && (
            <span className="text-white/40 text-xs">{formatStartTime(game.startTimeUTC)}</span>
          )}
          <LiveStatusBadge status={game.status} />
        </div>
      </div>

      {/* Signal Rows - Mobile */}
      <div className="md:hidden p-3 space-y-2">
        {signals.map((s) => (
          <div key={s.signal_id} className="bg-white/5 rounded-xl p-3">
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <p className="font-medium text-white text-sm">{s.player_name}</p>
                <p className="text-xs text-white/40">{s.side.toUpperCase()} {s.line}</p>
              </div>
              <LiveStatusBadge status={s.signalStatus} />
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-3">
                {s.liveThreePointersMade !== null && (
                  <span className="text-white font-mono">
                    <span className="text-white/40">3PM: </span>
                    <span className="text-lg font-bold">{s.liveThreePointersMade}</span>
                  </span>
                )}
                <CourtStatus isOnCourt={s.isOnCourt} minutes={s.minutesPlayed} />
              </div>
              <span className="text-green-400 font-medium">+{s.edge_pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Signal Rows - Desktop Table */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/[0.06]">
            <th className="text-left px-6 py-2.5">Player</th>
            <th className="text-center px-3 py-2.5">3PM</th>
            <th className="text-center px-3 py-2.5">Line</th>
            <th className="text-center px-3 py-2.5">Side</th>
            <th className="text-center px-3 py-2.5">Edge</th>
            <th className="text-center px-3 py-2.5">Court</th>
            <th className="text-right px-6 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.signal_id} className="border-b border-white/[0.04]">
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{s.player_name}</p>
                  {s.team && <span className="text-xs text-white/40 font-medium">{s.team}</span>}
                </div>
              </td>
              <td className="px-3 py-3 text-center">
                {s.liveThreePointersMade !== null ? (
                  <span className="text-white font-mono text-lg font-bold">{s.liveThreePointersMade}</span>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-center text-white/70 font-mono">{s.line}</td>
              <td className="px-3 py-3 text-center">
                <span className={`text-xs font-medium ${s.side === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                  {s.side.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-3 text-center text-green-400 font-medium text-sm">+{s.edge_pct.toFixed(1)}%</td>
              <td className="px-3 py-3 text-center">
                <CourtStatus isOnCourt={s.isOnCourt} minutes={s.minutesPlayed} />
              </td>
              <td className="px-6 py-3 text-right">
                <LiveStatusBadge status={s.signalStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
