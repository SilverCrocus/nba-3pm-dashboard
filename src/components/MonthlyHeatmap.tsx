'use client';

import { useMemo, useState } from 'react';

interface HeatmapProps {
  dailyPnL: Record<string, number>;
  dailyRecords: Record<string, { wins: number; losses: number; pushes: number }>;
  loading: boolean;
}

interface DayCell {
  date: string;
  pnl: number;
  wins: number;
  losses: number;
  pushes: number;
  hasBets: boolean;
}

function getColor(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return 'bg-white/5';
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);

  if (pnl > 0) {
    if (intensity > 0.6) return 'bg-green-500';
    if (intensity > 0.3) return 'bg-green-600/70';
    return 'bg-green-700/50';
  }
  if (pnl < 0) {
    if (intensity > 0.6) return 'bg-red-500';
    if (intensity > 0.3) return 'bg-red-600/70';
    return 'bg-red-700/50';
  }
  return 'bg-white/5';
}

function formatUnits(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}u`;
}

export function MonthlyHeatmap({ dailyPnL, dailyRecords, loading }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; x: number; y: number } | null>(null);

  const { weeks, monthLabels, maxAbsPnL, monthlyTotals } = useMemo(() => {
    const dates = Object.keys(dailyPnL).sort();
    if (dates.length === 0) return { weeks: [], monthLabels: [], maxAbsPnL: 0, monthlyTotals: {} };

    // Find the range: from first date to last date
    const startDate = new Date(dates[0] + 'T12:00:00Z');
    const endDate = new Date(dates[dates.length - 1] + 'T12:00:00Z');

    // Align to start of week (Monday)
    const dayOfWeek = startDate.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(startDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);

    // Build grid of weeks
    const allWeeks: DayCell[][] = [];
    const labels: { month: string; weekIdx: number }[] = [];
    const totals: Record<string, number> = {};
    let maxAbs = 0;
    let currentDate = new Date(weekStart);
    let weekIdx = 0;
    let lastMonth = '';

    while (currentDate <= endDate || currentDate.getUTCDay() !== 1) {
      const week: DayCell[] = [];

      for (let d = 0; d < 7; d++) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const pnl = dailyPnL[dateStr] ?? 0;
        const record = dailyRecords[dateStr] ?? { wins: 0, losses: 0, pushes: 0 };
        const hasBets = dateStr in dailyPnL;

        if (hasBets) {
          maxAbs = Math.max(maxAbs, Math.abs(pnl));
          const monthKey = dateStr.slice(0, 7); // YYYY-MM
          totals[monthKey] = (totals[monthKey] || 0) + pnl;
        }

        // Track month labels
        const month = currentDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        if (month !== lastMonth && d === 0) {
          labels.push({ month, weekIdx });
          lastMonth = month;
        }

        week.push({ date: dateStr, pnl, ...record, hasBets });
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      allWeeks.push(week);
      weekIdx++;

      if (currentDate > endDate && currentDate.getUTCDay() === 1) break;
    }

    return { weeks: allWeeks, monthLabels: labels, maxAbsPnL: maxAbs, monthlyTotals: totals };
  }, [dailyPnL, dailyRecords]);

  if (loading) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <div className="text-white/50">Loading heatmap...</div>
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-3">Monthly Returns</h3>
        <p className="text-white/50 text-sm">No data available</p>
      </div>
    );
  }

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  // Calculate cell size to fill available width
  // Card has ~p-6 (24px) padding on each side, day labels ~40px, gaps ~3px between cells
  // We want cells to stretch to fill the card
  const weekCount = weeks.length;

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1">Monthly Returns</h3>

      {/* Monthly totals */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {Object.entries(monthlyTotals).map(([monthKey, total]) => {
          const [y, m] = monthKey.split('-');
          const monthName = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' });
          return (
            <span key={monthKey} className={`font-medium ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {monthName}: {formatUnits(total)}
            </span>
          );
        })}
      </div>

      {/* Heatmap grid — cells stretch to fill width */}
      <div className="relative">
        {/* Month labels row */}
        <div className="flex pl-10 mb-1.5" style={{ gap: 0 }}>
          {monthLabels.map(({ month, weekIdx }, i) => {
            // Position label above the correct week column
            const nextLabelWeek = i < monthLabels.length - 1 ? monthLabels[i + 1].weekIdx : weekCount;
            const spanWeeks = nextLabelWeek - weekIdx;
            return (
              <div
                key={i}
                className="text-xs text-white/50"
                style={{
                  width: `${(spanWeeks / weekCount) * 100}%`,
                  marginLeft: i === 0 ? `${(weekIdx / weekCount) * 100}%` : 0,
                }}
              >
                {month}
              </div>
            );
          })}
        </div>

        <div className="flex">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] mr-2 shrink-0">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-5 md:h-6 w-8 text-xs text-white/40 flex items-center">
                {label}
              </div>
            ))}
          </div>

          {/* Week columns — grow to fill available width */}
          <div className="flex gap-[3px] flex-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] flex-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-full h-5 md:h-6 rounded cursor-pointer transition-opacity hover:opacity-80 hover:ring-1 hover:ring-white/30 ${
                      day.hasBets ? getColor(day.pnl, maxAbsPnL) : 'bg-white/[0.04]'
                    }`}
                    onMouseEnter={(e) => {
                      if (day.hasBets) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ date: day.date, x: rect.left + rect.width / 2, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && dailyPnL[tooltip.date] !== undefined && (
          <div
            className="fixed z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none"
            style={{ left: tooltip.x - 50, top: tooltip.y - 58 }}
          >
            <div className="font-medium">{tooltip.date}</div>
            <div className={dailyPnL[tooltip.date] >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatUnits(dailyPnL[tooltip.date])}
            </div>
            <div className="text-white/60">
              {dailyRecords[tooltip.date]?.wins}W-{dailyRecords[tooltip.date]?.losses}L
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-4 text-xs text-white/40">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <div className="w-3 h-3 rounded-sm bg-red-600/70" />
        <div className="w-3 h-3 rounded-sm bg-white/5" />
        <div className="w-3 h-3 rounded-sm bg-green-700/50" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <span>More</span>
      </div>
    </div>
  );
}
