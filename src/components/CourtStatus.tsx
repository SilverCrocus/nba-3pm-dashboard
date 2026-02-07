interface CourtStatusProps {
  isOnCourt: boolean | null;
  minutes: string | null;
}

export function CourtStatus({ isOnCourt, minutes }: CourtStatusProps) {
  if (isOnCourt === null) {
    return <span className="text-xs text-white/30">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 group relative">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isOnCourt ? 'bg-green-400' : 'bg-white/30'
        }`}
      />
      <span className={`text-xs ${isOnCourt ? 'text-green-400' : 'text-white/40'}`}>
        {isOnCourt ? 'On' : 'Off'}
      </span>
      {minutes && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[rgba(20,20,25,0.95)] text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {minutes} min
        </span>
      )}
    </span>
  );
}
