'use client';

import { useEffect, useState } from 'react';

interface LiveHeaderProps {
  lastUpdated: Date | null;
  isConnected: boolean;
  isLoading: boolean;
  hasActiveGames: boolean;
}

export function LiveHeader({ lastUpdated, isConnected, isLoading, hasActiveGames }: LiveHeaderProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Live Tracker</h1>
          <p className="text-white/50 text-sm md:text-base">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                !isConnected ? 'bg-red-400' :
                hasActiveGames ? 'bg-green-400' : 'bg-white/30'
              }`}
            />
            <span className="text-xs text-white/40">
              {isLoading ? 'Loading...' :
               !isConnected ? 'Disconnected' :
               hasActiveGames ? 'Live' : 'No active games'}
            </span>
          </div>
          {/* Refresh countdown */}
          {isConnected && hasActiveGames && (
            <span className="text-xs text-white/30 font-mono tabular-nums">
              {secondsAgo}s ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
