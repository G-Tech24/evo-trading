import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Dna, TrendingUp, TrendingDown, Cpu, Activity,
  Brain, Network, BookOpen, FlaskConical, Atom, Calculator,
  GraduationCap, Zap, Target
} from "lucide-react";
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

const LEVEL_LABELS = [
  "Guardiería", "Secundaria", "Bachillerato",
  "Universidad I–II", "Universidad III–IV", "Maestría", "Doctorado"
];

const DOMAIN_COLORS: Record<string, string> = {
  math: "text-blue-400",
  physics: "text-purple-400",
  chemistry: "text-yellow-400",
};
const DOMAIN_BG: Record<string, string> = {
  math: "bg-blue-500/20 border-blue-500/30",
  physics: "bg-purple-500/20 border-purple-500/30",
  chemistry: "bg-yellow-500/20 border-yellow-500/30",
};
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  math: <Calculator className="w-3 h-3" />,
  physics: <Atom className="w-3 h-3" />,
  chemistry: <FlaskConical className="w-3 h-3" />,
};

interface CurriculumData {
  agentId: string;
  curriculumLevel: number;
  levelLabel: string;
  wisdomVector: { math: number; physics: number; chemistry: number };
  relevantConcepts: Array<{
    id: string; name: string; domain: string; level: number;
    formula: string; insight: string; tradingAnalogy: string;
  }>;
}

interface ProblemData {
  agentId: string;
  count: number;
  problems: Array<{
    id: string; title: string; domain: string; level: number;
    difficulty: number; statement: string;
    tradingSignal: string; signalStrength: number;
  }>;
}

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

  const { data: curriculum } = useQuery<CurriculumData>({
    queryKey: ["/api/curriculum/agent", agentId],
    queryFn: () => apiRequest("GET", `/api/curriculum/agent/${agentId}`).then(r => r.json()),
    refetchInterval: 5000,
    enabled: !!agentId,
  });

  const { data: problems } = useQuery<ProblemData>({
    queryKey: ["/api/problems/agent", agentId],
    queryFn: () => apiRequest("GET", `/api/problems/agent/${agentId}`).then(r => r.json()),
    refetchInterval: 10000,
    enabled: !!agentId,
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

  const wisdom = curriculum?.wisdomVector ?? { math: 0, physics: 0, chemistry: 0 };
  const dominantDomain = Object.entries(wisdom).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const currLevel = curriculum?.curriculumLevel ?? 1;

  // Pill colours for signal
  const signalColor = (sig: string) =>
    sig === "buy" ? "text-green-400 bg-green-400/10 border-green-400/30"
    : sig === "sell" ? "text-red-400 bg-red-400/10 border-red-400/30"
    : "text-slate-400 bg-slate-400/10 border-slate-400/30";

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
          {curriculum && (
            <Badge variant="outline" className={`text-[10px] ${DOMAIN_COLORS[dominantDomain]}`}>
              <GraduationCap className="w-2.5 h-2.5 mr-1"/>
              Lvl {currLevel} · {LEVEL_LABELS[currLevel - 1]}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── LEFT COLUMN ── */}
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

          {/* CfC Brain panel */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400"/> Sistema Nervioso CfC
            </h2>
            <div className="space-y-2">
              <div className="text-[9px] font-mono text-muted-foreground mb-1">Arquitectura NCP (C. elegans)</div>
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col gap-0.5">
                  {Array.from({length: 9}).map((_, i) => (
                    <div key={i} className={`w-2 h-1.5 rounded-sm ${
                      i < 3 ? "bg-blue-500/60" : i < 6 ? "bg-purple-500/60" : "bg-yellow-500/60"
                    }`}/>
                  ))}
                </div>
                <div className="flex-1 border-t border-dashed border-muted-foreground/20"/>
                <div className="flex flex-col gap-0.5">
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="w-2 h-1 rounded-sm bg-cyan-500/50"/>
                  ))}
                </div>
                <div className="flex-1 border-t border-dashed border-muted-foreground/20"/>
                <div className="flex flex-col gap-0.5">
                  {["BUY","SELL","HOLD"].map((label) => (
                    <div key={label} className="text-[8px] font-mono px-1 rounded bg-muted/40"
                      style={{color: label==="BUY"?"#4ade80":label==="SELL"?"#f87171":"#94a3b8"}}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <div className="bg-muted/30 rounded p-1.5 text-center">
                  <div className="text-[8px] text-muted-foreground">Sensorial</div>
                  <div className="text-[10px] font-mono text-blue-400">9 neuronas</div>
                </div>
                <div className="bg-muted/30 rounded p-1.5 text-center">
                  <div className="text-[8px] text-muted-foreground">CfC Inter</div>
                  <div className="text-[10px] font-mono text-cyan-400">12 neuronas</div>
                </div>
                <div className="bg-muted/30 rounded p-1.5 text-center">
                  <div className="text-[8px] text-muted-foreground">Motora</div>
                  <div className="text-[10px] font-mono text-green-400">3 output</div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-muted-foreground mt-1 flex gap-3">
                <span>Densidad: <span className="text-foreground">~28%</span></span>
                <span>τ adaptativo: <span className="text-purple-400">activo</span></span>
                <span>GAT: <span className="text-cyan-400">{(agent.neighbors ?? []).length} vecinos</span></span>
              </div>
            </div>
          </div>

          {/* GAT Connections */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-cyan-400"/> Atención GAT
            </h2>
            <div className="space-y-1">
              {(agent.neighbors ?? []).length === 0 && (
                <div className="text-[10px] text-muted-foreground font-mono">Sin vecinos conectados</div>
              )}
              {(agent.neighbors ?? []).map((nid, i) => {
                const alpha = 1 / Math.max(1, (agent.neighbors ?? []).length);
                const pct = Math.round(alpha * 100);
                return (
                  <div key={nid} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground w-4">{i+1}.</span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500/70 rounded-full" style={{width:`${pct}%`}}/>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
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

        {/* ── CENTER COLUMN ── */}
        <div className="space-y-4">
          {/* Strategy */}
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

          {/* ── CURRICULUM LEVEL ── */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400"/> Nivel Académico
            </h2>
            {!curriculum ? (
              <div className="text-[10px] text-muted-foreground font-mono animate-pulse">Calculando nivel...</div>
            ) : (
              <>
                {/* Level progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">Guardiería</span>
                    <span className={`text-[10px] font-mono font-bold ${DOMAIN_COLORS[dominantDomain]}`}>
                      {curriculum.levelLabel}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Doctorado</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        dominantDomain === "math" ? "bg-gradient-to-r from-blue-600 to-blue-400"
                        : dominantDomain === "physics" ? "bg-gradient-to-r from-purple-600 to-purple-400"
                        : "bg-gradient-to-r from-yellow-600 to-yellow-400"
                      }`}
                      style={{ width: `${((currLevel - 1) / 6) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    {LEVEL_LABELS.map((lbl, idx) => (
                      <div key={idx} className={`text-[7px] font-mono ${idx < currLevel ? DOMAIN_COLORS[dominantDomain] : "text-muted-foreground/40"}`}>
                        L{idx + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wisdom vector */}
                <div className="mb-3 space-y-1.5">
                  <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Vector de Sabiduría</div>
                  {(["math", "physics", "chemistry"] as const).map(domain => (
                    <div key={domain} className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[9px] font-mono w-20 flex-shrink-0 ${DOMAIN_COLORS[domain]}`}>
                        {DOMAIN_ICONS[domain]}
                        {domain === "math" ? "Mat" : domain === "physics" ? "Fís" : "Quím"}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            domain === "math" ? "bg-blue-500"
                            : domain === "physics" ? "bg-purple-500"
                            : "bg-yellow-500"
                          }`}
                          style={{ width: `${Math.min(100, wisdom[domain] * 100)}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono w-10 text-right ${DOMAIN_COLORS[domain]}`}>
                        {(wisdom[domain] * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── ACTIVE CONCEPTS ── */}
          <div className="terminal-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400"/> Conceptos Activos
            </h2>
            {!curriculum ? (
              <div className="text-[10px] text-muted-foreground font-mono animate-pulse">Cargando conceptos...</div>
            ) : curriculum.relevantConcepts.length === 0 ? (
              <div className="text-[10px] text-muted-foreground font-mono">Sin conceptos activos</div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-1.5 pr-2">
                  {curriculum.relevantConcepts.map(c => (
                    <div key={c.id} className={`rounded border p-2 ${DOMAIN_BG[c.domain]}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[9px] font-mono font-semibold ${DOMAIN_COLORS[c.domain]} flex items-center gap-1`}>
                          {DOMAIN_ICONS[c.domain]} {c.name}
                        </span>
                        <span className="text-[8px] font-mono text-muted-foreground">L{c.level}</span>
                      </div>
                      {c.formula && (
                        <div className="text-[8px] font-mono text-foreground/70 italic truncate">{c.formula}</div>
                      )}
                      <div className="text-[8px] text-muted-foreground font-mono mt-0.5 leading-tight line-clamp-2">
                        {c.tradingAnalogy}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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

        {/* ── RIGHT COLUMN: problems + trade history ── */}
        <div className="space-y-4">
          {/* Problems assigned to agent */}
          <div className="terminal-border flex flex-col overflow-hidden" style={{ maxHeight: "340px" }}>
            <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400"/>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Banco de Problemas ({problems?.count ?? 0})
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1.5">
                {!problems ? (
                  <div className="text-center text-muted-foreground text-xs py-4 animate-pulse font-mono">Cargando problemas...</div>
                ) : problems.problems.map(p => (
                  <div key={p.id} className={`p-2 rounded border text-[10px] font-mono ${DOMAIN_BG[p.domain]}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-semibold ${DOMAIN_COLORS[p.domain]} flex items-center gap-1`}>
                        {DOMAIN_ICONS[p.domain]} {p.title}
                      </span>
                      <span className="text-[8px] text-muted-foreground">L{p.level} · D{p.difficulty}</span>
                    </div>
                    <div className="text-muted-foreground leading-tight line-clamp-2 mb-1">{p.statement}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono ${signalColor(p.tradingSignal)}`}>
                        {p.tradingSignal.toUpperCase()}
                      </span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.tradingSignal === "buy" ? "bg-green-500" : p.tradingSignal === "sell" ? "bg-red-500" : "bg-slate-500"}`}
                          style={{ width: `${p.signalStrength * 100}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground">{(p.signalStrength * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Trade history */}
          <div className="terminal-border flex flex-col overflow-hidden" style={{ maxHeight: "380px" }}>
            <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400"/>
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
