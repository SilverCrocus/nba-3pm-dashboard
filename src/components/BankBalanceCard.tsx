import { KellyFraction } from '@/types/database';

interface BankBalanceCardProps {
  currentBankroll: number;
  startingBankroll: number;
  kellyFraction: KellyFraction;
  onKellyChange: (fraction: KellyFraction) => void;
  loading: boolean;
}

export function BankBalanceCard({
  currentBankroll,
  startingBankroll,
  kellyFraction,
  onKellyChange,
  loading,
}: BankBalanceCardProps) {
  const profit = currentBankroll - startingBankroll;
  const isPositive = profit >= 0;

  const fractions: { value: KellyFraction; label: string }[] = [
    { value: 1, label: 'Full' },
    { value: 0.5, label: '1/2' },
    { value: 0.25, label: '1/4' },
  ];

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-3 md:p-6">
      <p className="text-white/50 text-xs md:text-sm font-medium mb-0.5 md:mb-1">Bank Balance</p>
      <p className="text-xl md:text-3xl font-bold text-white font-display">
        {loading ? '...' : `$${currentBankroll.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      </p>
      <p className={`text-xs md:text-sm mt-0.5 md:mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {loading ? '' : `${isPositive ? '+' : ''}$${profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} profit`}
      </p>

      {/* Kelly Fraction Toggles */}
      <div className="flex gap-1 mt-2 md:mt-3">
        {fractions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onKellyChange(value)}
            className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              kellyFraction === value
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
