/**
 * VitalSignsPanel — Sistema Circulatorio + Respiratorio + Entrenamiento
 * Muestra los "signos vitales" de la red de agentes en tiempo real.
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Wind, Brain, Activity, Zap, Droplets, TrendingUp } from "lucide-react";

interface CirculatoryStats {
  heartRate: number;
  bloodPressure: number;
  oxygenSaturation: number;
  circulatoryStress: number;
  heartbeatCount: number;
  activePackets: number;
  vesselHealth: { arterialFlow: number; venousReturn: number; capillaryDensity: number; plaqueIndex: number };
  totalCapitalCirculated: number;
  totalKnowledgeTransferred: number;
  packetTypeBreakdown: Record<string, number>;
}

interface RespiratoryStats {
  totalAgents: number;
  avgOxygenLevel: number;
  avgCo2Level: number;
  avgLungCapacity: number;
  regimeDistribution: Record<string, number>;
  stressTypeDistribution: Record<string, number>;
  totalHypoxiaEvents: number;
  totalHyperventilationEvents: number;
  avgFitnessModifier: number;
  avgStressCapacity: number;
}

interface TrainingStats {
  totalSessions: number;
  totalProblemsGenerated: number;
  averagePassRate: number;
  averageGeneralizationScore: number;
  phaseDistribution: Record<string, number>;
  domainStrengths: { math: number; physics: number; chemistry: number; cross: number };
}

// Colores para régimen respiratorio
const REGIME_COLORS: Record<string, string> = {
  eupnea: "text-green-400",
  tachypnea: "text-yellow-400",
  bradypnea: "text-blue-400",
  hyperpnea: "text-cyan-400",
  apnea: "text-slate-400",
  dyspnea: "text-red-500",
  hypoxia: "text-orange-500",
  hyperventilation: "text-pink-500",
};

const PHASE_COLORS: Record<string, string> = {
  warmup: "bg-slate-500/20 text-slate-400",
  acceleration: "bg-yellow-500/20 text-yellow-400",
  adversarial: "bg-orange-500/20 text-orange-400",
  doctoral: "bg-purple-500/20 text-purple-400",
  chaos: "bg-red-500/20 text-red-400",
  self_play: "bg-cyan-500/20 text-cyan-400",
};

function StatRow({ label, value, color, bar, barMax = 1 }: {
  label: string; value: string | number; color?: string; bar?: number; barMax?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground font-mono w-28 flex-shrink-0">{label}</span>
      {bar !== undefined ? (
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color?.includes("red") ? "bg-red-500" : color?.includes("yellow") ? "bg-yellow-500" : color?.includes("purple") ? "bg-purple-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, (bar / barMax) * 100)}%` }}
          />
        </div>
      ) : null}
      <span className={`text-[10px] font-mono font-semibold ${color ?? "text-foreground"} w-16 text-right flex-shrink-0`}>
        {value}
      </span>
    </div>
  );
}

export function VitalSignsPanel() {
  const { data: circ } = useQuery<CirculatoryStats>({
    queryKey: ["/api/circulatory/stats"],
    queryFn: () => apiRequest("GET", "/api/circulatory/stats").then(r => r.json()),
    refetchInterval: 2000,
  });

  const { data: resp } = useQuery<RespiratoryStats>({
    queryKey: ["/api/respiratory/stats"],
    queryFn: () => apiRequest("GET", "/api/respiratory/stats").then(r => r.json()),
    refetchInterval: 2000,
  });

  const { data: training } = useQuery<TrainingStats>({
    queryKey: ["/api/training/stats"],
    queryFn: () => apiRequest("GET", "/api/training/stats").then(r => r.json()),
    refetchInterval: 3000,
  });

  const dominantRegime = resp?.regimeDistribution
    ? Object.entries(resp.regimeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "eupnea"
    : "eupnea";

  const dominantPhase = training?.phaseDistribution
    ? Object.entries(training.phaseDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "warmup"
    : "warmup";

  const bpStatus = circ
    ? circ.bloodPressure > 0.7 ? "text-red-400" : circ.bloodPressure > 0.4 ? "text-yellow-400" : "text-green-400"
    : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* ── SISTEMA CIRCULATORIO ── */}
      <div className="terminal-border p-3 border-red-500/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Heart className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">
            Sistema Circulatorio
          </span>
          {circ && (
            <span className="ml-auto text-[9px] font-mono text-muted-foreground">
              {circ.heartbeatCount} latidos
            </span>
          )}
        </div>

        {!circ ? (
          <div className="text-[9px] text-muted-foreground animate-pulse">Iniciando...</div>
        ) : (
          <div className="space-y-1.5">
            {/* Ritmo cardíaco visual */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 12 }).map((_, i) => {
                  const active = i < Math.round(circ.heartRate / 5);
                  return <div key={i} className={`w-1 rounded-full transition-all ${active ? "h-3 bg-red-400" : "h-1 bg-muted"}`} />;
                })}
              </div>
              <span className={`text-xs font-mono font-bold ${bpStatus}`}>
                {circ.heartRate} bpm
              </span>
            </div>

            <StatRow label="Presión sanguínea" value={`${(circ.bloodPressure * 100).toFixed(0)}%`}
              bar={circ.bloodPressure} color={bpStatus} />
            <StatRow label="Saturación O₂" value={`${(circ.oxygenSaturation * 100).toFixed(1)}%`}
              bar={circ.oxygenSaturation} color="text-cyan-400" />
            <StatRow label="Estrés circulatorio" value={`${(circ.circulatoryStress * 100).toFixed(1)}%`}
              bar={circ.circulatoryStress} color="text-red-400" />
            <StatRow label="Paquetes activos" value={circ.activePackets} />

            {/* Desglose de células */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[
                { key: "erythrocyte", label: "🔴 GR", color: "text-red-400" },
                { key: "leukocyte", label: "⚪ GL", color: "text-slate-300" },
                { key: "platelet", label: "🟡 Plt", color: "text-yellow-400" },
                { key: "hormone", label: "🟣 Hor", color: "text-purple-400" },
              ].map(({ key, label, color }) => (
                <div key={key} className="bg-muted/20 rounded p-1 text-center">
                  <div className={`text-[9px] font-mono font-bold ${color}`}>
                    {circ.packetTypeBreakdown?.[key] ?? 0}
                  </div>
                  <div className="text-[8px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Salud vascular */}
            <div className="border-t border-border/30 pt-1.5 mt-1">
              <div className="text-[8px] text-muted-foreground uppercase mb-1">Salud Vascular</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <StatRow label="Arterias" value={`${(circ.vesselHealth.arterialFlow * 100).toFixed(0)}%`}
                  bar={circ.vesselHealth.arterialFlow} color="text-red-300" />
                <StatRow label="Capilares" value={`${(circ.vesselHealth.capillaryDensity * 100).toFixed(0)}%`}
                  bar={circ.vesselHealth.capillaryDensity} color="text-blue-400" />
              </div>
              <StatRow label="Placa arterial" value={`${(circ.vesselHealth.plaqueIndex * 100).toFixed(1)}%`}
                bar={circ.vesselHealth.plaqueIndex} color="text-orange-400" />
            </div>

            <div className="text-[8px] text-muted-foreground font-mono">
              Capital circulado: <span className="text-foreground">${circ.totalCapitalCirculated.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── SISTEMA RESPIRATORIO ── */}
      <div className="terminal-border p-3 border-cyan-500/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
            Sistema Respiratorio
          </span>
          {resp && (
            <span className={`ml-auto text-[9px] font-mono font-semibold ${REGIME_COLORS[dominantRegime]}`}>
              {dominantRegime}
            </span>
          )}
        </div>

        {!resp ? (
          <div className="text-[9px] text-muted-foreground animate-pulse">Iniciando...</div>
        ) : (
          <div className="space-y-1.5">
            {/* O₂ / CO₂ visual */}
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <div className="text-[8px] text-cyan-400/70 mb-0.5">O₂</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${resp.avgOxygenLevel * 100}%` }} />
                </div>
                <div className="text-[8px] font-mono text-cyan-400 text-right">
                  {(resp.avgOxygenLevel * 100).toFixed(1)}%
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[8px] text-slate-400/70 mb-0.5">CO₂</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full transition-all duration-700"
                    style={{ width: `${resp.avgCo2Level * 100}%` }} />
                </div>
                <div className="text-[8px] font-mono text-slate-400 text-right">
                  {(resp.avgCo2Level * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <StatRow label="Capac. pulmonar" value={`${(resp.avgLungCapacity * 100).toFixed(1)}%`}
              bar={resp.avgLungCapacity} color="text-cyan-400" />
            <StatRow label="Modificador fitness" value={resp.avgFitnessModifier.toFixed(3)}
              bar={resp.avgFitnessModifier} barMax={1.5} color="text-emerald-400" />
            <StatRow label="Capacidad de estrés" value={`${(resp.avgStressCapacity * 100).toFixed(1)}%`}
              bar={resp.avgStressCapacity} color="text-purple-400" />

            {/* Distribución de regímenes */}
            <div className="border-t border-border/30 pt-1.5 mt-1">
              <div className="text-[8px] text-muted-foreground uppercase mb-1">Regímenes activos</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(resp.regimeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([regime, count]) => (
                    <span key={regime} className={`text-[8px] font-mono px-1 py-0.5 rounded bg-muted/30 ${REGIME_COLORS[regime] ?? "text-muted-foreground"}`}>
                      {regime}: {count}
                    </span>
                  ))}
              </div>
            </div>

            <div className="text-[8px] text-muted-foreground font-mono flex gap-3">
              <span>Hipoxia: <span className="text-orange-400">{resp.totalHypoxiaEvents}</span></span>
              <span>Hipervent: <span className="text-pink-400">{resp.totalHyperventilationEvents}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ── ENTRENAMIENTO ── */}
      <div className="terminal-border p-3 border-purple-500/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/80">
            Entrenamiento Adversarial
          </span>
          {training && (
            <span className={`ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded ${PHASE_COLORS[dominantPhase] ?? "text-muted-foreground"}`}>
              {dominantPhase}
            </span>
          )}
        </div>

        {!training ? (
          <div className="text-[9px] text-muted-foreground animate-pulse">Iniciando...</div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-muted/20 rounded p-1.5 text-center">
                <div className="text-sm font-mono font-bold text-purple-400">{training.totalSessions}</div>
                <div className="text-[8px] text-muted-foreground">Sesiones</div>
              </div>
              <div className="bg-muted/20 rounded p-1.5 text-center">
                <div className="text-sm font-mono font-bold text-purple-400">{training.totalProblemsGenerated}</div>
                <div className="text-[8px] text-muted-foreground">Problemas únicos</div>
              </div>
            </div>

            <StatRow label="Pass rate" value={`${(training.averagePassRate * 100).toFixed(1)}%`}
              bar={training.averagePassRate} color="text-emerald-400" />
            <StatRow label="Generalización" value={`${(training.averageGeneralizationScore * 100).toFixed(1)}%`}
              bar={training.averageGeneralizationScore} color="text-purple-400" />

            {/* Fortalezas por dominio */}
            <div className="border-t border-border/30 pt-1.5 mt-1">
              <div className="text-[8px] text-muted-foreground uppercase mb-1">Fortaleza por dominio</div>
              {[
                { key: "math", label: "Matemáticas", color: "bg-blue-500" },
                { key: "physics", label: "Física", color: "bg-purple-500" },
                { key: "chemistry", label: "Química", color: "bg-yellow-500" },
                { key: "cross", label: "Transdisciplinar", color: "bg-emerald-500" },
              ].map(({ key, label, color }) => {
                const val = training.domainStrengths[key as keyof typeof training.domainStrengths] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] font-mono text-muted-foreground w-24">{label}</span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${val * 100}%` }} />
                    </div>
                    <span className="text-[8px] font-mono text-muted-foreground w-8 text-right">{(val * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>

            {/* Fases de entrenamiento */}
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(training.phaseDistribution)
                .filter(([, v]) => v > 0)
                .map(([phase, count]) => (
                  <span key={phase} className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${PHASE_COLORS[phase] ?? "bg-muted/30 text-muted-foreground"}`}>
                    {phase}: {count}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
