import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@shared/schema";

const STRATEGY_LABELS: Record<string, string> = {
  brownian_motion: "Browniano",
  mean_reversion: "Reversión Media",
  wave_interference: "Interferencia Ondas",
  entropy_decay: "Entropía",
  boltzmann_distribution: "Boltzmann",
  chaos_theory: "Caos",
  harmonic_oscillator: "Oscilador",
  reaction_kinetics: "Cinética",
  diffusion_gradient: "Difusión",
  orbital_mechanics: "Orbital",
};

const DOMAIN_COLORS: Record<string, string> = {
  math: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  physics: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  chemistry: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

const STRATEGY_DOMAIN: Record<string, string> = {
  brownian_motion: "math", mean_reversion: "physics",
  wave_interference: "physics", entropy_decay: "physics",
  boltzmann_distribution: "physics", chaos_theory: "math",
  harmonic_oscillator: "physics", reaction_kinetics: "chemistry",
  diffusion_gradient: "chemistry", orbital_mechanics: "physics",
};

export function AgentCard({ agent, rank }: { agent: Agent; rank: number }) {
  const isProfiting = agent.pnlPercent >= 0;
  const domain = STRATEGY_DOMAIN[agent.strategy] ?? "math";
  const domainClass = DOMAIN_COLORS[domain];

  return (
    <Link href={`/agent/${agent.id}`}>
      <div
        data-testid={`agent-card-${agent.id}`}
        className={`terminal-border p-3 cursor-pointer hover:bg-accent transition-colors ${
          isProfiting ? "border-profit/20" : "border-loss/20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">#{rank}</span>
            <span className="text-xs font-mono font-bold truncate">{agent.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {agent.openPosition && (
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                agent.openPosition === "long" ? "text-profit border-profit/50" : "text-loss border-loss/50"
              }`}>
                {agent.openPosition.toUpperCase()}
              </Badge>
            )}
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${domainClass}`}>
              {STRATEGY_LABELS[agent.strategy] ?? agent.strategy}
            </Badge>
          </div>
        </div>

        {/* PnL */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`text-base font-mono font-bold ${isProfiting ? "text-profit" : "text-loss"}`}>
              {isProfiting ? "+" : ""}{agent.pnlPercent.toFixed(2)}%
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              ${agent.capital.toLocaleString("en", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">Fitness</div>
            <div className={`text-sm font-mono font-semibold ${agent.fitnessScore >= 0 ? "text-profit" : "text-loss"}`}>
              {agent.fitnessScore.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <StatMini label="Sharpe" value={agent.sharpeRatio.toFixed(2)} />
          <StatMini label="Win %" value={`${(agent.winRate * 100).toFixed(0)}%`} />
          <StatMini label="Trades" value={agent.totalTrades} />
        </div>

        {/* Knowledge weights */}
        <div className="flex items-center gap-1">
          <div className="flex flex-1 rounded-full overflow-hidden h-1.5">
            <div style={{ width: `${agent.mathWeight * 100}%` }} className="bg-blue-500"/>
            <div style={{ width: `${agent.physicsWeight * 100}%` }} className="bg-purple-500"/>
            <div style={{ width: `${agent.chemistryWeight * 100}%` }} className="bg-yellow-500"/>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">Gen {agent.generation}</span>
        </div>
      </div>
    </Link>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded px-1.5 py-1 text-center">
      <div className="text-[8px] text-muted-foreground uppercase">{label}</div>
      <div className="text-[11px] font-mono font-semibold">{value}</div>
    </div>
  );
}
