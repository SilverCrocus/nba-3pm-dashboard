'use client';

import { Fragment, useState } from 'react';
import { PaperTrade } from '@/types/database';
import { americanToDecimal } from '@/lib/odds';
import { computeClvImpliedPct, classifyClvTier } from '@/lib/clv';

interface SignalsTableProps {
  signals: PaperTrade[];
  loading: boolean;
  noSignalsToday?: boolean;
  signalDate?: string | null;
}

function hasReasoningData(signal: PaperTrade): boolean {
  return signal.strategy === 'playoffs_multi_agent' || signal.strategy === 'playoffs_llm_enhanced';
}

function TierBadge({ value, colorMap }: { value: string | null; colorMap: Record<string, string> }) {
  if (!value) return <span className="text-white/30">--</span>;
  const upper = value.toUpperCase();
  const color = colorMap[upper] ?? 'text-white/50 bg-white/10';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>
      {upper}
    </span>
  );
}

function parseVotes(raw: unknown): Array<{ role: string; vote: string }> | null {
  if (!raw) return null;
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr;
  } catch {
    return null;
  }
}

function VoteDots({ votes }: { votes: Array<{ role: string; vote?: string; p_under?: number; model_id?: string }> }) {
  const dotColor = (v: { p_under?: number; vote?: string }) => {
    if (v.p_under != null) {
      if (v.p_under >= 0.55) return 'bg-green-400';
      if (v.p_under <= 0.45) return 'bg-red-400';
      return 'bg-amber-400';
    }
    return v.vote === 'CONFIRM' ? 'bg-green-400' : 'bg-red-400';
  };
  const tooltip = votes.map(v =>
    v.p_under != null ? `${v.role}: P(u)=${(v.p_under * 100).toFixed(0)}%` : `${v.role}: ${v.vote}`
  ).join(', ');
  return (
    <div className="flex items-center gap-0.5 mt-1.5" title={tooltip}>
      {votes.map((v, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor(v)}`} />
      ))}
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

function PipelineDetail({ signal }: { signal: PaperTrade }) {
  const isMultiAgent = signal.strategy === 'playoffs_multi_agent';
  const isDebate = signal.strategy === 'playoffs_llm_enhanced';

  const hasMultiAgentData = signal.screening_tier != null || signal.adversarial_verdict != null ||
    signal.scenario_prob_under != null || signal.portfolio_stake != null;
  const hasDebateData = signal.debate_verdict != null || signal.debate_confirm_count != null ||
    signal.debate_summary != null;

  if ((isMultiAgent && !hasMultiAgentData) || (isDebate && !hasDebateData)) {
    return (
      <div className="bg-white/[0.03] rounded-lg p-3 text-xs text-white/40">
        No pipeline data available
      </div>
    );
  }

  if (isMultiAgent) {
    const screeningColors: Record<string, string> = {
      'PROCEED': 'text-green-400 bg-green-500/20',
      'ESCALATE': 'text-amber-400 bg-amber-500/20',
    };
    const debateColors: Record<string, string> = {
      'PASS': 'text-green-400 bg-green-500/20',
      'CAUTION': 'text-amber-400 bg-amber-500/20',
    };

    const agentCount = signal.adversarial_confirm_count;
    const aggPUnder = signal.adversarial_weighted_confirm;
    const aggColor = aggPUnder != null
      ? aggPUnder >= 0.55 ? 'text-green-400' : aggPUnder >= 0.50 ? 'text-amber-400' : 'text-red-400'
      : 'text-white/40';

    const scenarioProb = signal.scenario_prob_under;
    const scenarioColor = scenarioProb != null
      ? scenarioProb > 0.55 ? 'text-green-400' : scenarioProb >= 0.50 ? 'text-amber-400' : 'text-red-400'
      : 'text-white/40';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Screening</p>
          <div className="flex items-center gap-2">
            <TierBadge value={signal.screening_tier} colorMap={screeningColors} />
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">7-Agent Tri-Model Debate</p>
          <div className="flex items-center gap-2">
            <TierBadge value={signal.adversarial_verdict} colorMap={debateColors} />
            {aggPUnder != null && (
              <span className={`text-xs font-mono font-medium ${aggColor}`}>P(u) {(aggPUnder * 100).toFixed(1)}%</span>
            )}
            {agentCount != null && (
              <span className="text-[11px] text-white/40">{agentCount}/7 agents</span>
            )}
          </div>
          {(() => {
            const votes = parseVotes(signal.adversarial_votes);
            return votes && <VoteDots votes={votes} />;
          })()}
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Scenario</p>
          {scenarioProb != null ? (
            <span className={`text-sm font-mono font-medium ${scenarioColor}`}>
              {(scenarioProb * 100).toFixed(1)}% under probability
            </span>
          ) : (
            <span className="text-white/30 text-xs">--</span>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Portfolio</p>
          <span className="text-sm font-mono font-medium text-white/80">1.0u flat</span>
          {signal.portfolio_stake != null && (
            <span className="text-[11px] text-white/40 ml-2">(Kelly: {signal.portfolio_stake.toFixed(2)}u)</span>
          )}
          {signal.pipeline_cost_usd != null && (
            <span className="text-[11px] text-white/40 ml-2">${signal.pipeline_cost_usd.toFixed(2)} cost</span>
          )}
        </div>
      </div>
    );
  }

  if (isDebate) {
    const verdictColors: Record<string, string> = {
      'CONFIRM': 'text-green-400 bg-green-500/20',
      'CAUTION': 'text-amber-400 bg-amber-500/20',
      'SKIP': 'text-red-400 bg-red-500/20',
    };
    const confirmCount = signal.debate_confirm_count;
    const confirmColor = confirmCount != null
      ? confirmCount >= 5 ? 'text-green-400' : confirmCount >= 3 ? 'text-amber-400' : 'text-red-400'
      : 'text-white/40';

    return (
      <div className="bg-white/[0.03] rounded-lg p-3">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Debate Verdict</p>
        <div className="flex items-center gap-2 mb-1.5">
          <TierBadge value={signal.debate_verdict} colorMap={verdictColors} />
          {confirmCount != null && (
            <span className={`text-xs font-mono font-medium ${confirmColor}`}>{confirmCount}/6 confirm</span>
          )}
        </div>
        {signal.debate_summary && (
          <p className="text-[11px] text-white/50 leading-snug">{truncate(signal.debate_summary, 120)}</p>
        )}
      </div>
    );
  }

  return null;
}

const STRATEGY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  'unders_2.5+_5f': { label: '5f', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'unders_3.5+': { label: '3.5+', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'unders_2.5+': { label: 'legacy', bg: 'bg-white/10', text: 'text-white/50' },
  'playoffs_multi_agent': { label: 'MA', bg: 'bg-green-500/20', text: 'text-green-400' },
  'playoffs_llm_enhanced': { label: 'debate', bg: 'bg-amber-500/20', text: 'text-amber-400' },
};

function StrategyPill({ strategy }: { strategy: string }) {
  const style = STRATEGY_STYLES[strategy] ?? { label: strategy.slice(0, 6), bg: 'bg-white/10', text: 'text-white/50' };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function ClvDot({ signal }: { signal: PaperTrade }) {
  if (signal.closing_odds_fanduel == null) {
    return <span className="text-white/20">&mdash;</span>;
  }

  const entryOdds = americanToDecimal(signal.odds);
  const closingOdds = americanToDecimal(signal.closing_odds_fanduel);
  const clvPct = computeClvImpliedPct(entryOdds, closingOdds);
  const tier = classifyClvTier(clvPct);

  const dotColor = tier === 'green' ? 'bg-green-400' : tier === 'red' ? 'bg-red-400' : 'bg-white/30';
  const tooltip = `${clvPct >= 0 ? '+' : ''}${clvPct.toFixed(1)}%`;

  return (
    <span className={`w-2 h-2 rounded-full inline-block ${dotColor}`} title={tooltip} />
  );
}

function ClvDetail({ signal }: { signal: PaperTrade }) {
  if (signal.closing_line_fanduel == null || signal.closing_odds_fanduel == null) {
    return null;
  }
  const side = signal.side === 'under' ? 'U' : 'O';
  return (
    <span className="text-[10px] text-white/35 font-mono">
      {side} {signal.closing_line_fanduel} @ {americanToDecimal(signal.closing_odds_fanduel).toFixed(2)}
    </span>
  );
}

export function SignalsTable({ signals, loading, noSignalsToday, signalDate }: SignalsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (signalId: string) => {
    setExpandedId(prev => prev === signalId ? null : signalId);
  };

  if (loading) {
    return <div className="text-white/50">Loading signals...</div>;
  }

  if (noSignalsToday) {
    const fallbackDateLabel = signalDate
      ? new Date(signalDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      : null;

    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
          <p className="text-white/70 text-sm font-medium">No signals today</p>
          <p className="text-white/40 text-xs mt-1">
            The model found no bets meeting the edge threshold.
          </p>
        </div>
        {signals.length > 0 && fallbackDateLabel && (
          <div className="mt-2">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">
              Last signals &mdash; {fallbackDateLabel}
            </p>
            <div className="space-y-2">
              {signals.slice(0, 5).map((signal) => (
                <div key={signal.signal_id} className="flex justify-between items-center text-xs text-white/60">
                  <span className="flex items-center gap-2">
                    {signal.player_name}
                    <StrategyPill strategy={signal.strategy} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{signal.side.toUpperCase()} {signal.line}</span>
                    <StatusBadge outcome={signal.outcome} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>
        <p className="text-white/50">No signals for today</p>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Today&apos;s Signals</h3>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {signals.map((signal) => {
          const canExpand = hasReasoningData(signal);
          const isExpanded = expandedId === signal.signal_id;

          return (
            <div key={signal.signal_id} className="bg-white/5 rounded-xl p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm">{signal.player_name}</p>
                    {signal.team && (
                      <span className="text-[10px] text-white/50 font-medium">{signal.team}</span>
                    )}
                    <StrategyPill strategy={signal.strategy} />
                  </div>
                  <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line} @ {americanToDecimal(signal.odds).toFixed(2)}</p>
                </div>
                <StatusBadge outcome={signal.outcome} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</span>
                <span className="flex items-center gap-1.5">
                  <ClvDot signal={signal} />
                  <ClvDetail signal={signal} />
                  <span className="text-white/50">{signal.bookmaker}</span>
                </span>
              </div>
              {canExpand && (
                <>
                  <button
                    onClick={() => toggleExpand(signal.signal_id)}
                    className="mt-2 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                  >
                    {isExpanded ? 'Hide pipeline ▾' : 'View pipeline ▸'}
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-200 ease-in-out"
                    style={{ maxHeight: isExpanded ? '400px' : '0px', opacity: isExpanded ? 1 : 0 }}
                  >
                    <div className="mt-2">
                      <PipelineDetail signal={signal} />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
            <th className="text-left pb-3">Player</th>
            <th className="text-left pb-3">Line</th>
            <th className="text-left pb-3">Odds</th>
            <th className="text-left pb-3">Edge</th>
            <th className="text-left pb-3">Strat</th>
            <th className="text-center pb-3">CLV</th>
            <th className="text-right pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {signals.map((signal) => {
            const canExpand = hasReasoningData(signal);
            const isExpanded = expandedId === signal.signal_id;

            return (
              <Fragment key={signal.signal_id}>
                <tr
                  className={`border-b border-white/5 ${canExpand ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                  onClick={canExpand ? () => toggleExpand(signal.signal_id) : undefined}
                >
                  <td className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{signal.player_name}</p>
                        {signal.team && (
                          <span className="text-xs text-white/40 font-medium">{signal.team}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line}</p>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-white/70">{signal.line}</td>
                  <td className="py-3 font-mono text-white/70">{americanToDecimal(signal.odds).toFixed(2)}</td>
                  <td className="py-3">
                    <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</span>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1">
                      <StrategyPill strategy={signal.strategy} />
                      {canExpand && (
                        <span className="text-[10px] text-white/30">{isExpanded ? '▾' : '▸'}</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ClvDot signal={signal} />
                      <ClvDetail signal={signal} />
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <StatusBadge outcome={signal.outcome} />
                  </td>
                </tr>
                {canExpand && isExpanded && (
                  <tr className="border-b border-white/5">
                    <td colSpan={7} className="py-3 pl-4 border-l-2 border-green-500/30">
                      <PipelineDetail signal={signal} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">Pending</span>;
  }
  if (outcome === 'win') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Win</span>;
  }
  if (outcome === 'voided') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/50">Voided</span>;
  }
  if (outcome === 'push') {
    return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Push</span>;
  }
  return <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Loss</span>;
}
