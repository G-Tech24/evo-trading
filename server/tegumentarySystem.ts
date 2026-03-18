/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SISTEMA TEGUMENTARIO — Regulación Térmica y Optimización de Energía
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  METÁFORA BIOLÓGICA:
 *    - Piel = interfaz con el entorno computacional (CPU, RAM, tiempo)
 *    - Glándulas sudoríparas = disipación de calor (throttling adaptativo)
 *    - Vasos sanguíneos superficiales = distribución de recursos
 *    - Termoreceptores = sensores de carga del sistema
 *    - Pelo/aislamiento = protección contra picos de trabajo
 *
 *  BASADO EN:
 *    - Thermal-Aware On-Device Inference (ACM 2026) — throttling continuo
 *    - "Play It Cool: Dynamic Shifting" (ICML 2022) — modelo grande ↔ pequeño
 *      según temperatura CPU sin perder throughput
 *    - Impact of Thermal Throttling on CNNs (arXiv 2020) — análisis de pérdida
 *      de rendimiento por calor (hasta 90% de throughput sin cooling)
 *
 *  FRACASOS QUE PREVIENE:
 *    ❌ CPU al 100% durante horas → throttling del OS → ticks irregulares
 *    ❌ Memoria RAM creciendo indefinidamente → OOM kill del proceso
 *    ❌ Todos los agentes procesando en paralelo a máxima complejidad
 *    ❌ Tick loop sin control → 2s de tick real puede volverse 10s
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as os from "os";
import * as process from "process";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type ThermalRegime =
  | "hypothermia"    // CPU < 20%: sistema frío, puede procesar más
  | "normothermic"   // CPU 20-60%: temperatura óptima
  | "febrile"        // CPU 60-80%: fiebre leve, reducir trabajo no crítico
  | "hyperpyrexia"   // CPU 80-90%: emergencia, throttling activo
  | "critical";      // CPU > 90%: modo supervivencia

export interface ThermalSnapshot {
  cpuUsage: number;           // 0-1
  memUsageMB: number;
  memLimitMB: number;
  memPressure: number;        // 0-1
  regime: ThermalRegime;
  tickBudgetMs: number;       // tiempo máximo disponible por tick
  agentBudget: number;        // máximo de agentes a procesar por tick
  complexityLevel: number;    // 0-1 (cuánta complejidad de cálculo permitida)
  thermalScore: number;       // 0-1 (salud térmica: 1 = frío, 0 = sobrecalentado)
  lastSampleMs: number;
}

export interface EnergyBudget {
  // Distribución de la energía computacional del tick actual
  priorityAgents: number;     // agentes elite que siempre se procesan
  normalAgents: number;       // agentes normales (se reduce bajo calor)
  skipTraining: boolean;      // saltar entrenamiento adversarial si hay calor
  skipGATRebuild: boolean;    // saltar reconstrucción GAT si hay calor
  skipCirculatory: boolean;   // saltar sistema circulatorio
  reducedCfC: boolean;        // usar CfC simplificado (menos neuronas efectivas)
  tickDelayMs: number;        // delay extra al tick para enfriar
}

// ─── Estado global ─────────────────────────────────────────────────────────────

let lastCpuMeasure: { idle: number; total: number } | null = null;
let currentSnapshot: ThermalSnapshot | null = null;
let snapshotHistory: ThermalSnapshot[] = [];
const MAX_HISTORY = 60;

// EMA de CPU para evitar spikes falsos
let emaCpu = 0.3;
const EMA_ALPHA = 0.3;

// Historial de duraciones de tick para detectar sobrecarga
let tickDurations: number[] = [];

// ─── Medición de CPU ───────────────────────────────────────────────────────────

function measureCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    const times = cpu.times;
    totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
    totalIdle += times.idle;
  }

  if (!lastCpuMeasure) {
    lastCpuMeasure = { idle: totalIdle, total: totalTick };
    return 0.3; // estimación inicial conservadora
  }

  const idleDiff  = totalIdle - lastCpuMeasure.idle;
  const totalDiff = totalTick - lastCpuMeasure.total;
  lastCpuMeasure = { idle: totalIdle, total: totalTick };

  if (totalDiff === 0) return emaCpu;
  return 1 - (idleDiff / totalDiff);
}

// ─── Lectura del sistema ───────────────────────────────────────────────────────

export function sampleThermalState(aliveAgentCount: number): ThermalSnapshot {
  const rawCpu = measureCpuUsage();

  // EMA para suavizar picos momentáneos
  emaCpu = EMA_ALPHA * rawCpu + (1 - EMA_ALPHA) * emaCpu;
  const cpu = Math.min(1, emaCpu);

  // Memoria
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const memUsageMB   = usedMem / 1024 / 1024;
  const memLimitMB   = totalMem / 1024 / 1024;
  const memPressure  = usedMem / totalMem;

  // Régimen térmico
  let regime: ThermalRegime;
  if (cpu < 0.2)       regime = "hypothermia";
  else if (cpu < 0.6)  regime = "normothermic";
  else if (cpu < 0.8)  regime = "febrile";
  else if (cpu < 0.9)  regime = "hyperpyrexia";
  else                 regime = "critical";

  // Ajustar también por presión de memoria
  if (memPressure > 0.9 && regime !== "critical") {
    regime = "hyperpyrexia";
  }

  // Temperatura combinada (CPU 60% + RAM 40%)
  const thermalScore = Math.max(0, 1 - (cpu * 0.6 + memPressure * 0.4));

  // Budget de tiempo por tick según régimen
  const tickBudgetMs = (() => {
    switch (regime) {
      case "hypothermia":  return 1800; // uso completo
      case "normothermic": return 1500;
      case "febrile":      return 1000;
      case "hyperpyrexia": return 600;
      case "critical":     return 300;
    }
  })();

  // Cuántos agentes procesar por tick
  const maxAgents = Math.max(
    4, // mínimo vital
    Math.floor(aliveAgentCount * thermalScore * 1.2)
  );

  // Nivel de complejidad computacional permitida
  const complexityLevel = thermalScore;

  const snapshot: ThermalSnapshot = {
    cpuUsage: cpu,
    memUsageMB: Math.round(memUsageMB),
    memLimitMB: Math.round(memLimitMB),
    memPressure,
    regime,
    tickBudgetMs,
    agentBudget: Math.min(aliveAgentCount, maxAgents),
    complexityLevel,
    thermalScore,
    lastSampleMs: Date.now(),
  };

  currentSnapshot = snapshot;
  snapshotHistory.push(snapshot);
  if (snapshotHistory.length > MAX_HISTORY) {
    snapshotHistory.shift();
  }

  return snapshot;
}

// ─── Presupuesto de energía ────────────────────────────────────────────────────

/**
 * Calcula cómo distribuir los recursos del tick actual.
 * Inspirado en Dynamic Shifting — cambia la "talla" del modelo según temperatura.
 */
export function computeEnergyBudget(
  snapshot: ThermalSnapshot,
  totalAgents: number,
  eliteCount: number
): EnergyBudget {
  const { regime, complexityLevel } = snapshot;

  // Agentes prioritarios = élite (top 25%) — siempre se procesan
  const priorityAgents = Math.min(totalAgents, Math.max(1, eliteCount));

  // Agentes normales — se recortan bajo calor
  const normalAgents = Math.max(
    0,
    snapshot.agentBudget - priorityAgents
  );

  return {
    priorityAgents,
    normalAgents,
    // Bajo calor: saltar procesos pesados no críticos
    skipTraining:    regime === "critical" || regime === "hyperpyrexia",
    skipGATRebuild:  regime === "critical" || (regime === "hyperpyrexia" && Math.random() > 0.3),
    skipCirculatory: regime === "critical",
    // CfC reducido: cortar el lookback a la mitad bajo calor
    reducedCfC:      regime === "febrile" || regime === "hyperpyrexia" || regime === "critical",
    // Delay extra para enfriar entre ticks
    tickDelayMs: regime === "critical"     ? 500 :
                 regime === "hyperpyrexia" ? 200 :
                 regime === "febrile"      ? 50  : 0,
  };
}

/**
 * Registra la duración de un tick para detectar sobrecarga acumulada.
 */
export function recordTickDuration(durationMs: number): void {
  tickDurations.push(durationMs);
  if (tickDurations.length > 30) tickDurations.shift();
}

/**
 * Detecta si hay sobrecarga crónica (ticks consistentemente lentos).
 * Si los últimos 10 ticks promedian > 3s, el sistema está sobrecargado.
 */
export function isChronicallyOverloaded(): boolean {
  if (tickDurations.length < 10) return false;
  const recent = tickDurations.slice(-10);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return avg > 3000; // más de 3s por tick en promedio = sobrecarga crónica
}

/**
 * GC hint: solicitar garbage collection si hay presión de memoria alta.
 * Solo funciona si Node fue iniciado con --expose-gc.
 */
export function hintGarbageCollection(): void {
  const memPressure = currentSnapshot?.memPressure ?? 0;
  if (memPressure > 0.8) {
    if (typeof (global as any).gc === "function") {
      (global as any).gc();
    }
  }
}

/**
 * Calcula el lookback period efectivo para un agente bajo restricciones térmicas.
 * En modo febrile+, los agentes usan un lookback reducido para ahorrar CPU.
 */
export function getEffectiveLookback(
  originalLookback: number,
  budget: EnergyBudget
): number {
  if (!budget.reducedCfC) return originalLookback;
  const reduction = currentSnapshot?.regime === "critical"     ? 0.3 :
                    currentSnapshot?.regime === "hyperpyrexia" ? 0.5 :
                    0.7;
  return Math.max(5, Math.floor(originalLookback * reduction));
}

// ─── Selector de agentes a procesar ───────────────────────────────────────────

/**
 * Dado el presupuesto térmico, decide QUÉ agentes procesar este tick.
 * Siempre procesa la élite + una muestra del resto.
 * Bajo calor, rota los agentes normales para que todos tengan oportunidad
 * a lo largo del tiempo (round-robin térmico).
 */
let roundRobinPointer = 0;

export function selectAgentsForTick<T extends { id: string; fitnessScore: number }>(
  agents: T[],
  budget: EnergyBudget
): { selected: T[]; skipped: number } {
  if (agents.length === 0) return { selected: [], skipped: 0 };

  // Ordenar por fitness para identificar élite
  const sorted = [...agents].sort((a, b) => b.fitnessScore - a.fitnessScore);
  const elite  = sorted.slice(0, budget.priorityAgents);
  const normal = sorted.slice(budget.priorityAgents);

  // De los normales, seleccionar con round-robin para equidad térmica
  const toSelectNormal = Math.min(normal.length, budget.normalAgents);
  const selectedNormal: T[] = [];
  for (let i = 0; i < toSelectNormal; i++) {
    const idx = (roundRobinPointer + i) % Math.max(1, normal.length);
    selectedNormal.push(normal[idx]);
  }
  roundRobinPointer = (roundRobinPointer + toSelectNormal) % Math.max(1, normal.length);

  const selected = [...elite, ...selectedNormal];
  const skipped  = agents.length - selected.length;

  return { selected, skipped };
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export interface TegumentaryStats {
  currentRegime: ThermalRegime;
  cpuUsage: number;
  memUsageMB: number;
  memPressure: number;
  thermalScore: number;
  avgTickDurationMs: number;
  isOverloaded: boolean;
  throttleEvents: number; // ticks en que se aplicó throttling
}

let throttleEventCount = 0;

export function getTegumentaryStats(): TegumentaryStats {
  const snap = currentSnapshot;
  const avgTick = tickDurations.length > 0
    ? tickDurations.reduce((a, b) => a + b, 0) / tickDurations.length
    : 0;

  if (snap && (snap.regime === "febrile" || snap.regime === "hyperpyrexia" || snap.regime === "critical")) {
    throttleEventCount++;
  }

  return {
    currentRegime: snap?.regime ?? "normothermic",
    cpuUsage: snap?.cpuUsage ?? 0,
    memUsageMB: snap?.memUsageMB ?? 0,
    memPressure: snap?.memPressure ?? 0,
    thermalScore: snap?.thermalScore ?? 1,
    avgTickDurationMs: Math.round(avgTick),
    isOverloaded: isChronicallyOverloaded(),
    throttleEvents: throttleEventCount,
  };
}

export function getCurrentSnapshot(): ThermalSnapshot | null {
  return currentSnapshot;
}
