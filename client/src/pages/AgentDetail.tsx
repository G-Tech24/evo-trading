import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Dna, TrendingUp, TrendingDown, Cpu, Activity } from "lucide-react";
import type { Agent, Trade } from "@shared/schema";

const STRATEGY_LABELS: Record<string, string> = {
  brownian_motion: "Movimiento Browniano",
  mean_reversion: "Reversión a la Media",
  wave_interference: "Interferencia de Ondas",
  entropy_decay: "Decaimiento de Entropía",
  boltzmann_distribution: "Distribución Boltzmann",
  chaos_theory: "Teoría del Caos",
  harmonic_oscillator: "Oscilador Armónico",
  reaction_kinetics: "Cinética de Reacción",
  diffusion_gradient: "Gradiente de Difusión",
  orbital_mechanics: "Mecánica Orbital",
};

const STRATEGY_DESCRIPTION: Record<string, string> = {
  brownian_motion: "Modelo de proceso de Wiener — el agente interpreta las variaciones de precio como caminatas aleatorias con deriva estadística. Derivado del Cálculo Estocástico (Itô).",
  mean_reversion: "Oscilador armónico — el precio es visto como una masa en un resorte. La 'fuerza restauradora' hacia la media es proporcional al desplazamiento (Ley de Hooke).",
  wave_interference: "Superposición de ondas de corto y largo período. El agente detecta constructive/destructive interference entre ciclos temporales del mercado.",
  entropy_decay: "Principio termodinámico — mercados de alta entropía (aleatorios) tienen baja señal. Cuando la entropía cae, el sistema se vuelve ordenado y predecible.",
  boltzmann_distribution: "Factor de Boltzmann: probabilidad de estado = e^(-E/kT). El agente evita 'estados de alta energía' (precios extremos) como la física estadística predice.",
  chaos_theory: "Sensibilidad a condiciones iniciales (Lyapunov). El agente mide la tasa de divergencia de trayectorias de precio para detectar transiciones caótico→ordenado.",
  harmonic_oscillator: "RSI derivado de principios de oscilador simple — el agente modela la 'frecuencia natural' del activo y opera cuando está en fase resonante.",
  reaction_kinetics: "Ley de velocidad de reacción (Arrhenius). El precio se trata como una concentración química — el agente opera cuando la 'reacción' se aproxima al equilibrio.",
  diffusion_gradient: "Segunda ley de Fick — los activos fluyen de alta a baja concentración (precio). El agente sigue el gradiente de difusión de capital en el mercado.",
  orbital_mechanics: "Leyes de Kepler — detección de ciclos elípticos en el precio. El agente identifica 'perihelios' (mínimos) y 'afelios' (máximos) del ciclo orbital.",
};

export default function AgentDetail() {
  const [location] = useHashLocation();
  const agentId = location.replace("/agent/", "");

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    queryFn: () => apiRequest("GET", `/api/agents/${agentId}`).then(r => r.json()),
    refetchInterval: 2000,
  });

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/agents", agentId, "trades"],
    queryFn: () => apiRequest("GET", `/api/agents/${agentId}/trades`).then(r => r.json()),
    refetchInterval: 3000,
  });

  if (isLoading || !agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Cargando agente...</div>
      </div>
    );
  }

  const isProfiting = agent.pnlPercent >= 0;
  const closedTrades = trades.filter(t => t.pnl !== 0);
  const winTrades = closedTrades.filter(t => t.pnl > 0);
  const totalPnlFromTrades = closedTrades.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-mono transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/> Volver
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${agent.status === "alive" ? "bg-green-400 pulse-alive" : "bg-red-400"}`}/>
          <h1 className="text-sm font-mono font-bold">{agent.name}</h1>
          <Badge variant="outline" className="text-[10px]">Gen {agent.generation}</Badge>
          <Badge variant="outline" className={`text-[10px] ${agent.status === "alive" ? "text-profit border-profit/50" : "text-loss border-loss/50"}`}>
            {agent.status.toUpperCase()}
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: stats + genes */}
        <div className="space-y-4">
          {/* Performance card */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5"/> Rendimiento
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="PnL %" value={`${isProfiting ? "+" : ""}${agent.pnlPercent.toFixed(2)}%`}
                valueClass={isProfiting ? "text-profit" : "text-loss"} />
              <MetricBox label="Capital" value={`$${agent.capital.toLocaleString("en", { maximumFractionDigits: 0 })}`} />
              <MetricBox label="Fitness" value={agent.fitnessScore.toFixed(4)}
                valueClass={agent.fitnessScore >= 0 ? "text-profit" : "text-loss"} />
              <MetricBox label="Sharpe" value={agent.sharpeRatio.toFixed(3)}
                valueClass={agent.sharpeRatio >= 1 ? "text-profit" : agent.sharpeRatio >= 0 ? "text-warning-custom" : "text-loss"} />
              <MetricBox label="Win Rate" value={`${(agent.winRate * 100).toFixed(1)}%`} />
              <MetricBox label="Trades" value={agent.totalTrades} />
              <MetricBox label="Max DD" value={`${(agent.maxDrawdown * 100).toFixed(1)}%`} valueClass="text-loss" />
              <MetricBox label="Vecinos" value={(agent.neighbors ?? []).length} />
            </div>
          </div>

          {/* Genes card */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5"/> Genoma del Agente
            </h2>
            <div className="space-y-2.5">
              <GeneBar label="Matemáticas" value={agent.mathWeight} color="bg-blue-500" />
              <GeneBar label="Física" value={agent.physicsWeight} color="bg-purple-500" />
              <GeneBar label="Química" value={agent.chemistryWeight} color="bg-yellow-500" />
              <div className="border-t border-border pt-2 mt-2 space-y-1.5">
                <GeneRow label="Tolerancia al riesgo" value={agent.riskTolerance} min={0} max={1} />
                <GeneRow label="Período lookback" value={agent.lookbackPeriod} min={3} max={40} displayVal={String(agent.lookbackPeriod)} />
                <GeneRow label="Umbral entrada" value={agent.entryThreshold / 0.1} min={0} max={1} displayVal={agent.entryThreshold.toFixed(4)} />
                <GeneRow label="Tamaño posición" value={agent.positionSizing / 0.3} min={0} max={1} displayVal={`${(agent.positionSizing * 100).toFixed(0)}%`} />
                <GeneRow label="Sesgo momentum" value={(agent.momentumBias + 1) / 2} min={0} max={1}
                  displayVal={agent.momentumBias.toFixed(2)}
                  colorOverride={agent.momentumBias > 0 ? "bg-profit" : agent.momentumBias < 0 ? "bg-loss" : "bg-muted-foreground"} />
                <GeneRow label="Filtro volatilidad" value={agent.volatilityFilter} min={0} max={1} />
              </div>
            </div>
          </div>

          {/* Lineage */}
          {(agent.parentIds ?? []).length > 0 && (
            <div className="terminal-border p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Linaje
              </h2>
              <div className="text-[10px] font-mono text-muted-foreground">
                Padres: {(agent.parentIds ?? []).join(", ")}
              </div>
            </div>
          )}
        </div>

        {/* Center: strategy */}
        <div className="space-y-4">
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5"/> Estrategia Científica
            </h2>
            <div className="mb-3">
              <div className="text-base font-mono font-bold text-foreground mb-1">
                {STRATEGY_LABELS[agent.strategy] ?? agent.strategy}
              </div>
              <div className="text-xs text-muted-foreground font-mono leading-relaxed">
                {STRATEGY_DESCRIPTION[agent.strategy] ?? "Estrategia basada en principios científicos."}
              </div>
            </div>
            {agent.openPosition && (
              <div className={`flex items-center gap-2 p-2 rounded ${
                agent.openPosition === "long" ? "bg-profit/10 border border-profit/30" : "bg-loss/10 border border-loss/30"
              }`}>
                {agent.openPosition === "long"
                  ? <TrendingUp className="w-4 h-4 text-profit"/>
                  : <TrendingDown className="w-4 h-4 text-loss"/>}
                <div>
                  <div className={`text-xs font-mono font-semibold ${agent.openPosition === "long" ? "text-profit" : "text-loss"}`}>
                    Posición abierta: {agent.openPosition.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Entrada @ ${agent.openPositionPrice?.toLocaleString("en", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trade P&L summary */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Resumen de Trades
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <MetricBox label="Trades Cerrados" value={closedTrades.length} />
              <MetricBox label="Ganadores" value={winTrades.length} valueClass="text-profit" />
              <MetricBox label="PnL Realizado" value={`$${totalPnlFromTrades.toFixed(2)}`}
                valueClass={totalPnlFromTrades >= 0 ? "text-profit" : "text-loss"} />
              <MetricBox label="Capital Inicial" value="$10,000" />
            </div>
          </div>

          {/* Death info */}
          {agent.status === "dead" && agent.deathReason && (
            <div className="terminal-border p-4 border-loss/30">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-loss mb-2">Causa de Extinción</h2>
              <p className="text-xs font-mono text-muted-foreground">{agent.deathReason}</p>
            </div>
          )}
        </div>

        {/* Right: trade history */}
        <div className="terminal-border flex flex-col overflow-hidden" style={{ maxHeight: "600px" }}>
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historial de Trades ({trades.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {[...trades].reverse().map(trade => (
                <div key={trade.id} className={`p-2 rounded terminal-border text-[10px] font-mono ${
                  trade.pnl > 0 ? "border-profit/30" : trade.pnl < 0 ? "border-loss/30" : "border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${trade.type === "buy" ? "text-profit" : "text-loss"}`}>
                      {trade.type.toUpperCase()}
                    </span>
                    {trade.pnl !== 0 && (
                      <span className={trade.pnl > 0 ? "text-profit" : "text-loss"}>
                        {trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-muted-foreground mt-0.5">
                    <span>@ ${trade.price.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                    <span>{trade.rationale?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))}
              {trades.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-6">
                  Sin trades aún
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="bg-muted/30 rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`text-sm font-mono font-semibold ${valueClass ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function GeneBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value * 100}%` }}/>
      </div>
    </div>
  );
}

function GeneRow({ label, value, min, max, displayVal, colorOverride }: {
  label: string; value: number; min: number; max: number;
  displayVal?: string; colorOverride?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorOverride ?? "bg-primary"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-[10px] font-mono w-12 text-right">{displayVal ?? value.toFixed(2)}</span>
    </div>
  );
}
