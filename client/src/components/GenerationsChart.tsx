import type { Generation } from "@shared/schema";

const STRATEGY_LABELS: Record<string, string> = {
  brownian_motion: "Browniano",
  mean_reversion: "Reversión Media",
  wave_interference: "Interferencia",
  entropy_decay: "Entropía",
  boltzmann_distribution: "Boltzmann",
  chaos_theory: "Caos",
  harmonic_oscillator: "Oscilador",
  reaction_kinetics: "Cinética",
  diffusion_gradient: "Difusión",
  orbital_mechanics: "Orbital",
};

export function GenerationsChart({ generations }: { generations: Generation[] }) {
  if (generations.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 terminal-border">
        <p className="text-xs text-muted-foreground font-mono">
          Esperando primera selección natural...
        </p>
      </div>
    );
  }

  const maxFitness = Math.max(...generations.map(g => g.bestFitness), 0.1);
  const maxAgents = Math.max(...generations.map(g => g.agentsAlive), 1);

  return (
    <div className="space-y-4">
      {/* Fitness evolution chart */}
      <div className="terminal-border p-3">
        <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Evolución del Fitness por Generación
        </h3>
        <div className="flex items-end gap-1 h-24">
          {generations.map(gen => {
            const bestH = (gen.bestFitness / maxFitness) * 100;
            const avgH = (gen.avgFitness / maxFitness) * 100;
            return (
              <div key={gen.id} className="flex-1 flex flex-col items-center gap-0.5" data-testid={`gen-bar-${gen.generation}`}>
                <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "80px" }}>
                  <div
                    className="w-full bg-profit/70 rounded-sm transition-all"
                    style={{ height: `${Math.max(2, bestH * 0.8)}px` }}
                    title={`Best: ${gen.bestFitness.toFixed(3)}`}
                  />
                  <div
                    className="w-full bg-blue-500/50 rounded-sm transition-all"
                    style={{ height: `${Math.max(1, avgH * 0.8)}px` }}
                    title={`Avg: ${gen.avgFitness.toFixed(3)}`}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">{gen.generation}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-profit/70 rounded-sm"/>
            <span className="text-[10px] text-muted-foreground">Mejor Fitness</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-blue-500/50 rounded-sm"/>
            <span className="text-[10px] text-muted-foreground">Fitness Promedio</span>
          </div>
        </div>
      </div>

      {/* Population chart */}
      <div className="terminal-border p-3">
        <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Dinámica Poblacional
        </h3>
        <div className="flex items-end gap-1 h-20">
          {generations.map(gen => {
            const aliveH = (gen.agentsAlive / maxAgents) * 100;
            return (
              <div key={gen.id} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full relative" style={{ height: "64px" }}>
                  <div
                    className="absolute bottom-0 w-full bg-green-500/60 rounded-sm"
                    style={{ height: `${Math.max(2, aliveH * 0.64)}px` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">{gen.generation}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generations table */}
      <div className="terminal-border overflow-hidden">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Gen</th>
              <th className="text-right px-2 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Nacidos</th>
              <th className="text-right px-2 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Muertos</th>
              <th className="text-right px-2 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Vivos</th>
              <th className="text-right px-2 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Mejor F.</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Estrategia</th>
            </tr>
          </thead>
          <tbody>
            {[...generations].reverse().map(gen => (
              <tr key={gen.id} className="border-b border-border/40 hover:bg-accent/30">
                <td className="px-3 py-1.5 font-semibold">G{gen.generation}</td>
                <td className="px-2 py-1.5 text-right text-blue-400">+{gen.agentsBorn}</td>
                <td className="px-2 py-1.5 text-right text-red-400">-{gen.agentsDied}</td>
                <td className="px-2 py-1.5 text-right text-profit">{gen.agentsAlive}</td>
                <td className="px-2 py-1.5 text-right">{gen.bestFitness.toFixed(3)}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">
                  {STRATEGY_LABELS[gen.dominantStrategy ?? ""] ?? gen.dominantStrategy ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
