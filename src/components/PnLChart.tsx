'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { PnLDataPoint } from '@/types/database';

interface PnLChartProps {
  data: PnLDataPoint[];
  loading: boolean;
}

const MILESTONES = [
  { date: '2026-01-18', label: 'Paper trading starts', color: '#60a5fa' },
  { date: '2026-03-08', label: 'Calibration overhaul', color: '#f59e0b' },
  { date: '2026-03-14', label: 'CDF fix + diagnostic', color: '#a78bfa' },
  { date: '2026-03-16', label: 'Dual strategy live', color: '#34d399' },
];

function formatUnits(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}u`;
}

// Split data into positive and negative series for green/red fill.
// Both series track the full cumProfit but clamp to 0 on the opposite side.
// A separate Line renders the continuous stroke over both.
function splitData(data: PnLDataPoint[]) {
  return data.map(d => ({
    ...d,
    cumProfitPos: Math.max(d.cumProfit, 0),
    cumProfitNeg: Math.min(d.cumProfit, 0),
  }));
}

export function PnLChart({ data, loading }: PnLChartProps) {
  if (loading) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <div className="text-white/50">Loading chart...</div>
      </div>
    );
  }

  const chartData = splitData(data);
  const dateSet = new Set(data.map(d => d.date));
  const visibleMilestones = MILESTONES.filter(m => dateSet.has(m.date));

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
        Equity Curve
      </h3>
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="redFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              stroke="#ffffff30"
              tick={{ fill: '#ffffff60', fontSize: 10 }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              stroke="#ffffff30"
              tick={{ fill: '#ffffff60', fontSize: 10 }}
              tickFormatter={formatUnits}
              label={{ value: 'Profit (units)', angle: -90, position: 'insideLeft', fill: '#ffffff40', fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                const delta = d.cumProfit - (d.cumExpectedProfit ?? 0);
                return (
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}>
                    <div style={{ color: 'white', marginBottom: 4 }}>{d.date}</div>
                    <div style={{ color: d.cumProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: 500 }}>
                      Actual: {formatUnits(d.cumProfit)}
                    </div>
                    <div style={{ color: 'rgba(147, 197, 253, 0.8)' }}>
                      Expected: {formatUnits(d.cumExpectedProfit ?? 0)}
                    </div>
                    <div style={{ color: delta >= 0 ? '#4ade80' : '#f87171', marginTop: 2 }}>
                      {delta >= 0 ? 'Running hot' : 'Running cold'}: {formatUnits(delta)}
                    </div>
                    {d.dayPnl !== undefined && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2, fontSize: '11px' }}>
                        Day: {formatUnits(d.dayPnl)} · {d.wins ?? 0}W-{d.losses ?? 0}L
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Breakeven line */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />

            {/* Milestone vertical lines (legend below chart) */}
            {visibleMilestones.map((m) => (
              <ReferenceLine
                key={m.date}
                x={m.date}
                stroke={m.color}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                strokeOpacity={0.7}
              />
            ))}

            {/* Green fill above zero (no stroke — fill only) */}
            <Area
              type="monotone"
              dataKey="cumProfitPos"
              stroke="none"
              fill="url(#greenFill)"
              baseLine={0}
            />
            {/* Red fill below zero (no stroke — fill only) */}
            <Area
              type="monotone"
              dataKey="cumProfitNeg"
              stroke="none"
              fill="url(#redFill)"
              baseLine={0}
            />
            {/* Single continuous line over both areas */}
            <Area
              type="monotone"
              dataKey="cumProfit"
              stroke="#22c55e"
              strokeWidth={2}
              fill="none"
            />
            {/* Expected P&L dashed line */}
            <Area
              type="monotone"
              dataKey="cumExpectedProfit"
              stroke="rgba(147, 197, 253, 0.5)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              fill="none"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Milestone legend */}
      {visibleMilestones.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs">
          {visibleMilestones.map((m) => (
            <div key={m.date} className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: m.color }} />
              <span className="text-white/70">{m.date.slice(5)}</span>
              <span className="text-white/50">{m.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-[1.5px] border-dashed" style={{ borderColor: 'rgba(147, 197, 253, 0.5)' }} />
            <span className="text-white/50">Expected P&L</span>
          </div>
        </div>
      )}
    </div>
  );
}
