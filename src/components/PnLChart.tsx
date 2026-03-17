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
  { date: '2026-01-18', label: 'Paper trading starts' },
  { date: '2026-03-08', label: 'Calibration overhaul' },
  { date: '2026-03-14', label: 'CDF fix + diagnostic' },
  { date: '2026-03-16', label: 'Dual strategy live' },
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
                      Cumulative: {formatUnits(d.cumProfit)}
                    </div>
                    {d.dayPnl !== undefined && (
                      <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                        Day: {formatUnits(d.dayPnl)} · {d.wins ?? 0}W-{d.losses ?? 0}L
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Breakeven line */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />

            {/* Milestone annotations */}
            {visibleMilestones.map((m) => (
              <ReferenceLine
                key={m.date}
                x={m.date}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="3 3"
                label={{
                  value: m.label,
                  position: 'top',
                  fill: 'rgba(255,255,255,0.4)',
                  fontSize: 9,
                  angle: -45,
                }}
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
