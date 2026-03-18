import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEvolution } from "@/lib/useEvolution";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Cpu, TrendingUp, TrendingDown, Skull, Baby,
  Dna, Network, Zap, BarChart2, Clock, Radio
} from "lucide-react";
import type { Agent, MarketTick, Event } from "@shared/schema";
import { AgentGraph } from "@/components/AgentGraph";
import { PriceChart } from "@/components/PriceChart";
import { AgentCard } from "@/components/AgentCard";
import { EventLog } from "@/components/EventLog";
import { GenerationsChart } from "@/components/GenerationsChart";

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

const STRATEGY_DOMAIN: Record<string, string> = {
  brownian_motion: "math", mean_reversion: "physics",
  wave_interference: "physics", entropy_decay: "physics",
  boltzmann_distribution: "physics", chaos_theory: "math",
  harmonic_oscillator: "physics", reaction_kinetics: "chemistry",
  diffusion_gradient: "chemistry", orbital_mechanics: "physics",
};

export default function Dashboard() {
  const { agents, ticks, events, stats, generations, connected } = useEvolution();
  const [tab, setTab] = useState("agents");

  const alive = agents.filter(a => a.status !== "dead");
  const dead = agents.filter(a => a.status === "dead");
  const sorted = [...alive].sort((a, b) => b.fitnessScore - a.fitnessScore);
  const currentPrice = ticks[ticks.length - 1]?.price ?? 0;
  const prevPrice = ticks[ticks.length - 2]?.price ?? currentPrice;
  const priceUp = currentPrice >= prevPrice;

  const dominantDomain = useMemo(() => {
    const domain = STRATEGY_DOMAIN[stats.dominantStrategy] ?? "math";
    return domain;
  }, [stats.dominantStrategy]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="EvoTrading">
            <circle cx="16" cy="16" r="14" stroke="hsl(142 71% 45%)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="4" fill="hsl(142 71% 45%)" opacity="0.8"/>
            <path d="M8 16 Q12 8 16 16 Q20 24 24 16" stroke="hsl(142 71% 45%)" strokeWidth="1.5" fill="none"/>
            <circle cx="8" cy="16" r="2" fill="hsl(207 90% 54%)"/>
            <circle cx="24" cy="16" r="2" fill="hsl(280 71% 65%)"/>
            <circle cx="16" cy="8" r="2" fill="hsl(38 92% 50%)"/>
            <line x1="8" y1="16" x2="16" y2="8" stroke="hsl(var(--border))" strokeWidth="0.8" strokeDasharray="2,2"/>
            <line x1="24" y1="16" x2="16" y2="8" stroke="hsl(var(--border))" strokeWidth="0.8" strokeDasharray="2,2"/>
            <line x1="8" y1="16" x2="24" y2="16" stroke="hsl(var(--border))" strokeWidth="0.8" strokeDasharray="2,2"/>
          </svg>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">EvoTrading</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Red de Agentes Evolutivos</p>
          </div>
        </div>

        {/* Live price */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className={`text-lg font-mono font-bold ${priceUp ? "text-profit" : "text-loss"}`}>
              ${currentPrice.toLocaleString("en", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">BTC/USDT</div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${connected ? "text-profit bg-profit/10" : "text-loss bg-loss/10"}`}>
            <Radio className="w-3 h-3" />
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-6 overflow-x-auto flex-shrink-0">
        <StatItem icon={<Activity className="w-3.5 h-3.5 text-profit"/>} label="Vivos" value={stats.aliveAgents} color="profit" />
        <StatItem icon={<Skull className="w-3.5 h-3.5 text-loss"/>} label="Muertos" value={stats.deadAgents} color="loss" />
        <StatItem icon={<Baby className="w-3.5 h-3.5 text-blue-400"/>} label="Generación" value={stats.currentGeneration} color="blue" />
        <StatItem icon={<Dna className="w-3.5 h-3.5 text-purple-400"/>} label="Total Agentes" value={stats.totalAgents} color="purple" />
        <StatItem icon={<BarChart2 className="w-3.5 h-3.5 text-warning-custom"/>} label="Trades" value={stats.totalTrades} color="warning" />
        <StatItem icon={<TrendingUp className="w-3.5 h-3.5 text-profit"/>} label="Mejor Fitness" value={stats.bestFitness.toFixed(3)} color="profit" />
        <StatItem icon={<Zap className="w-3.5 h-3.5 text-yellow-400"/>} label="Estrategia Dominante" value={STRATEGY_LABELS[stats.dominantStrategy] ?? stats.dominantStrategy} color="yellow" wide />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: agent list */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5"/> Agentes Vivos ({alive.length})
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sorted.map(agent => (
                <AgentMiniCard key={agent.id} agent={agent} />
              ))}
              {alive.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-8">
                  Iniciando simulación...
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: main panels */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Price chart */}
          <div className="h-48 border-b border-border flex-shrink-0 p-2">
            <PriceChart ticks={ticks} />
          </div>

          {/* Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
              <TabsList className="mx-3 mt-2 flex-shrink-0 bg-muted/50 h-8">
                <TabsTrigger value="agents" className="text-xs" data-testid="tab-agents">
                  <Network className="w-3 h-3 mr-1"/> Grafo
                </TabsTrigger>
                <TabsTrigger value="grid" className="text-xs" data-testid="tab-grid">
                  <BarChart2 className="w-3 h-3 mr-1"/> Rankings
                </TabsTrigger>
                <TabsTrigger value="generations" className="text-xs" data-testid="tab-generations">
                  <Dna className="w-3 h-3 mr-1"/> Generaciones
                </TabsTrigger>
                <TabsTrigger value="dead" className="text-xs" data-testid="tab-dead">
                  <Skull className="w-3 h-3 mr-1"/> Extintos ({dead.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden mt-2">
                <TabsContent value="agents" className="h-full m-0 px-3 pb-3">
                  <AgentGraph agents={alive} />
                </TabsContent>

                <TabsContent value="grid" className="h-full m-0 px-3 pb-3 overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {sorted.map((agent, i) => (
                      <AgentCard key={agent.id} agent={agent} rank={i + 1} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="generations" className="h-full m-0 px-3 pb-3 overflow-auto">
                  <GenerationsChart generations={generations} />
                </TabsContent>

                <TabsContent value="dead" className="h-full m-0 px-3 pb-3 overflow-auto">
                  <div className="space-y-2">
                    {dead.length === 0 && (
                      <div className="text-center text-muted-foreground text-xs py-8">
                        Ningún agente ha muerto aún
                      </div>
                    )}
                    {[...dead].reverse().map(agent => (
                      <DeadAgentRow key={agent.id} agent={agent} />
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right: event log */}
        <div className="w-64 flex-shrink-0 border-l border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground"/>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Log de Eventos
            </span>
          </div>
          <EventLog events={events} />
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color, wide }: {
  icon: React.ReactNode; label: string; value: string | number;
  color: string; wide?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 flex-shrink-0 ${wide ? "max-w-xs" : ""}`}>
      {icon}
      <div>
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-xs font-mono font-semibold truncate ${
          color === "profit" ? "text-profit" :
          color === "loss" ? "text-loss" :
          color === "blue" ? "text-blue-400" :
          color === "purple" ? "text-purple-400" :
          color === "warning" ? "text-warning-custom" :
          color === "yellow" ? "text-yellow-400" : "text-foreground"
        }`}>{value}</div>
      </div>
    </div>
  );
}

function AgentMiniCard({ agent }: { agent: Agent }) {
  const [, navigate] = useHashLocation();
  const isProfiting = agent.pnlPercent >= 0;

  return (
    <button
      onClick={() => navigate(`/agent/${agent.id}`)}
      data-testid={`agent-mini-${agent.id}`}
      className="w-full text-left p-2 rounded terminal-border hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-mono font-semibold truncate">{agent.name}</span>
        <span className={`text-xs font-mono ${isProfiting ? "text-profit" : "text-loss"}`}>
          {isProfiting ? "+" : ""}{agent.pnlPercent.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Gen {agent.generation}</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isProfiting ? "bg-green-400 pulse-alive" : "bg-red-400"}`}/>
          <span className="text-[10px] text-muted-foreground">
            F:{agent.fitnessScore.toFixed(2)}
          </span>
        </div>
      </div>
      {/* Knowledge bar */}
      <div className="flex mt-1 rounded-full overflow-hidden h-1">
        <div style={{ width: `${agent.mathWeight * 100}%` }} className="bg-blue-500"/>
        <div style={{ width: `${agent.physicsWeight * 100}%` }} className="bg-purple-500"/>
        <div style={{ width: `${agent.chemistryWeight * 100}%` }} className="bg-yellow-500"/>
      </div>
    </button>
  );
}

function DeadAgentRow({ agent }: { agent: Agent }) {
  return (
    <div className="terminal-border p-3 opacity-60 border-loss/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-semibold text-muted-foreground flex items-center gap-1.5">
          <Skull className="w-3 h-3 text-loss"/> {agent.name}
        </span>
        <Badge variant="outline" className="text-[10px] border-loss/50 text-loss">Gen {agent.generation}</Badge>
      </div>
      <div className="text-[10px] text-muted-foreground">{agent.deathReason}</div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-loss">{agent.pnlPercent.toFixed(1)}% PnL</span>
        <span className="text-[10px] text-muted-foreground">{agent.totalTrades} trades</span>
      </div>
    </div>
  );
}
