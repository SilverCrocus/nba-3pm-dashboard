'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DrawdownChartProps {
  data: Array<{ date: string; drawdown: number }>;
  currentDrawdown: number;
  loading: boolean;
}

function formatUnits(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}u`;
}

export function DrawdownChart({ data, currentDrawdown, loading }: DrawdownChartProps) {
  if (loading) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <div className="text-white/50">Loading drawdown...</div>
      </div>
    );
  }

  const drawdownLabel = currentDrawdown < 0
    ? `Current: ${formatUnits(currentDrawdown)} from peak`
    : 'At peak';

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-white">Drawdown</h3>
        <span className={`text-xs md:text-sm font-medium ${currentDrawdown < 0 ? 'text-red-400' : 'text-green-400'}`}>
          {drawdownLabel}
        </span>
      </div>
      <div className="h-28 md:h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
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
              domain={['dataMin - 0.5', 0]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
              }}
              formatter={(value) => [formatUnits(Number(value ?? 0)), 'Drawdown']}
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#drawdownFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
