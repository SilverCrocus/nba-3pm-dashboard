interface BankBalanceCardProps {
  totalProfit: number;
  totalBets: number;
  loading: boolean;
}

export function BankBalanceCard({
  totalProfit,
  totalBets,
  loading,
}: BankBalanceCardProps) {
  const isPositive = totalProfit >= 0;

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-3 md:p-6">
      <p className="text-white/50 text-xs md:text-sm font-medium mb-0.5 md:mb-1">Cumulative P&L</p>
      <p className={`text-xl md:text-3xl font-bold font-display ${isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
        {loading ? '...' : `${isPositive ? '+' : ''}${totalProfit.toFixed(2)}u`}
      </p>
      <p className="text-white/50 text-xs md:text-sm mt-0.5 md:mt-1">
        {loading ? '' : `${totalBets} bets settled`}
      </p>
    </div>
  );
}
