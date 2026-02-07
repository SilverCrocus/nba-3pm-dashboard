import { GameStatus, SignalStatus } from '@/types/database';

type BadgeType = GameStatus | SignalStatus;

const config: Record<BadgeType, { label: string; bg: string; text: string; pulse?: boolean }> = {
  live: { label: 'LIVE', bg: 'bg-green-500/20', text: 'text-green-400', pulse: true },
  scheduled: { label: 'SCHEDULED', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  final: { label: 'FINAL', bg: 'bg-white/10', text: 'text-white/50' },
  tracking: { label: 'TRACKING', bg: 'bg-green-500/20', text: 'text-green-400', pulse: true },
  hit: { label: 'HIT', bg: 'bg-green-500/20', text: 'text-green-400' },
  miss: { label: 'MISS', bg: 'bg-red-500/20', text: 'text-red-400' },
  push: { label: 'PUSH', bg: 'bg-white/10', text: 'text-white/50' },
};

export function LiveStatusBadge({ status }: { status: BadgeType }) {
  const { label, bg, text, pulse } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
      )}
      {label}
    </span>
  );
}
