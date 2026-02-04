'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BankrollData, KellyFraction } from '@/types/database';

interface PnLChartProps {
  data: BankrollData[];
  kellyFraction: KellyFraction;
  loading: boolean;
}

const kellyLabels: Record<KellyFraction, string> = {
  1: 'Full Kelly',
  0.5: '1/2 Kelly',
  0.25: '1/4 Kelly',
};

export function PnLChart({ data, kellyFraction, loading }: PnLChartProps) {
  if (loading) {
    return <div className="text-white/50">Loading chart...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-green-600/80 to-green-800/80 rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
        Bankroll Growth ({kellyLabels[kellyFraction]})
      </h3>
      <div className="h-40 md:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#ffffff50"
              tick={{ fill: '#ffffff80', fontSize: 10 }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              stroke="#ffffff50"
              tick={{ fill: '#ffffff80', fontSize: 10 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value) => [`$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Bankroll']}
            />
            <Area
              type="monotone"
              dataKey="bankroll"
              stroke="#4ade80"
              strokeWidth={2}
              fill="url(#pnlGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
