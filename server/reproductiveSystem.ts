/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SISTEMA REPRODUCTIVO MEJORADO — Selección Natural Optimizada
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  METÁFORA BIOLÓGICA:
 *    - Gónadas = generadores de variedad genética (mutación diversa)
 *    - Selección sexual = los mejores eligen a los mejores (fitness sharing)
 *    - Nichos ecológicos = especialización sin extinción de diversidad
 *    - Gametos = vectores de conocimiento (cerebros CfC + dominios)
 *    - Zigoto = agente hijo con herencia compleja
 *
 *  BASADO EN:
 *    - Neuroevolutionary Diversity Policy Search (ScienceDirect 2024)
 *      aproxima el Frente de Pareto — múltiples objetivos simultáneos
 *    - Adaptive Species Discovery — ASD (MIT GECCO 2011)
 *      niching sin parámetros fijos, descubrimiento dinámico de nichos
 *    - Peak Identification in Multimodal Optimization (Biomimetics 2024)
 *      fitness sharing por nicho con Hill-Valley clustering
 *    - "Speciation in Evolutionary Algorithms" (GECCO)
 *      radio de nicho adaptativo, especie por cuenca de atracción
 *
 *  FRACASOS QUE PREVIENE:
 *    ❌ Convergencia prematura: toda la población al mismo fenotipo (un solo óptimo)
 *    ❌ Drift genético: agentes mediocres dominan por azar sin presión de selección
 *    ❌ Explosión demográfica: reproducción sin límite colapsa la RAM
 *    ❌ Endogamia: padre1 == padre2 → varianza cero en la descendencia
 *    ❌ Selección ciega: fitness de un solo número ignora robustez y diversidad
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface AgentNiche {
  nicheId: string;
  dominantStrategy: string;
  centroid: number[];     // centroide del fenotipo del nicho [math, phys, chem, entry, exit, pos]
  members: string[];      // IDs de agentes en este nicho
  avgFitness: number;
  bestFitness: number;
  radius: number;         // radio del nicho (qué tan similares deben ser para pertenecer)
}

export interface MultiObjectiveFitness {
  agentId: string;
  // Componentes del Frente de Pareto
  sharpe: number;          // rentabilidad ajustada por riesgo
  robustness: number;      // consistencia (1 - varianza de outcomes)
  adaptability: number;    // qué tan bien se adapta a cambios de régimen
  diversity: number;       // distancia genética a vecinos (contribución a diversidad)
  knowledgeDepth: number;  // profundidad de conocimiento científico
  // Fitness compuesto (no single-objective)
  composite: number;
  // Rank en el Frente de Pareto (1 = no dominado)
  paretoRank: number;
  nicheId: string | null;
}

export interface ReproductionEvent {
  parent1Id: string;
  parent2Id: string;
  childId: string;
  generation: number;
  nicheId: string | null;
  crossoverType: "standard" | "domain_specialized" | "heterochrony";
  mutationRate: number;
  inheritedDomains: { math: number; physics: number; chemistry: number };
  fitnessProjection: number; // fitness esperado del hijo
}

export interface ReproductiveStats {
  totalNiches: number;
  avgNicheSize: number;
  diversityIndex: number;     // Shannon entropy de estrategias
  paretoFrontSize: number;    // agentes no dominados
  inbreedingRate: number;     // parejas con similaridad > 0.8 (mala señal)
  speciesCount: number;       // nichos con >= 2 miembros
  avgMutationRate: number;
  dominantStrategy: string;
}

// ─── Estado global ─────────────────────────────────────────────────────────────

const niches = new Map<string, AgentNiche>();
const agentMoFitness = new Map<string, MultiObjectiveFitness>();
const recentReproductionEvents: ReproductionEvent[] = [];
const MAX_EVENTS = 200;

// Historial de outcomes por agente para calcular robustez
const agentOutcomeHistory = new Map<string, number[]>(); // agentId → últimos 20 outcomes

// ─── Fenotipo de agente ────────────────────────────────────────────────────────

/**
 * Vector fenotípico de un agente (6 dimensiones).
 * Usado para calcular distancias genéticas y asignar nichos.
 */
export function phenotype(agent: {
  mathWeight: number;
  physicsWeight: number;
  chemistryWeight: number;
  entryThreshold: number;
  exitThreshold: number;
  positionSizing: number;
  momentumBias?: number;
}): number[] {
  return [
    agent.mathWeight,
    agent.physicsWeight,
    agent.chemistryWeight,
    agent.entryThreshold * 10,   // normalizado
    agent.exitThreshold * 10,
    agent.positionSizing * 3,
    (agent.momentumBias ?? 0) * 0.5,
  ];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] ?? 0)) ** 2, 0));
}

// ─── Fitness Multi-Objetivo ────────────────────────────────────────────────────

/**
 * Calcula el fitness multi-objetivo de un agente.
 * Reemplaza el fitness escalar simple con 5 componentes del Frente de Pareto.
 */
export function computeMultiObjectiveFitness(agent: {
  id: string;
  fitnessScore: number;
  sharpeRatio: number;
  winRate: number;
  pnlPercent: number;
  mathWeight: number;
  physicsWeight: number;
  chemistryWeight: number;
  entryThreshold: number;
  exitThreshold: number;
  positionSizing: number;
  momentumBias?: number;
  totalTrades: number;
  generation: number;
}, recentOutcomes: number[]): MultiObjectiveFitness {

  // 1. Sharpe (rentabilidad ajustada por riesgo)
  const sharpe = Math.tanh(agent.sharpeRatio / 3); // normalizado a [-1, 1]

  // 2. Robustez: 1 - desviación estándar de outcomes (consistencia)
  const outcomes = recentOutcomes.slice(-20);
  const robustness = outcomes.length > 1
    ? Math.max(0, 1 - computeStd(outcomes) * 5)
    : 0.5;

  // 3. Adaptabilidad: cambio de fitness entre las últimas generaciones
  const adaptability = Math.tanh(agent.winRate * 2 - 0.5);

  // 4. Diversidad: contribución al pool genético (calculado después en niching)
  const diversity = 0.5; // placeholder, se actualiza en assignNiches()

  // 5. Profundidad de conocimiento científico (balance entre dominios)
  const knowledgeSum = agent.mathWeight + agent.physicsWeight + agent.chemistryWeight;
  const balancePenalty = Math.abs(agent.mathWeight - agent.physicsWeight)
    + Math.abs(agent.physicsWeight - agent.chemistryWeight)
    + Math.abs(agent.mathWeight - agent.chemistryWeight);
  const knowledgeDepth = Math.min(1, knowledgeSum / 2.4) * (1 - balancePenalty * 0.2);

  // Fitness compuesto (Pareto-weighted, no simple promedio)
  const composite =
    sharpe * 0.30 +
    robustness * 0.20 +
    adaptability * 0.20 +
    diversity * 0.15 +
    knowledgeDepth * 0.15;

  const moFit: MultiObjectiveFitness = {
    agentId: agent.id,
    sharpe,
    robustness,
    adaptability,
    diversity,
    knowledgeDepth,
    composite,
    paretoRank: 1, // se calcula después en computeParetoRanks()
    nicheId: null,
  };

  agentMoFitness.set(agent.id, moFit);

  // Actualizar historial de outcomes
  const hist = agentOutcomeHistory.get(agent.id) ?? [];
  if (recentOutcomes.length > 0) hist.push(...recentOutcomes.slice(-3));
  if (hist.length > 30) hist.splice(0, hist.length - 30);
  agentOutcomeHistory.set(agent.id, hist);

  return moFit;
}

function computeStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calcula el Frente de Pareto usando dominancia no estricta.
 * Un agente A domina a B si A es mejor o igual en TODOS los objetivos
 * y estrictamente mejor en al menos uno.
 */
export function computeParetoRanks(agentIds: string[]): Map<string, number> {
  const ranks = new Map<string, number>();
  const fits = agentIds.map(id => agentMoFitness.get(id)).filter(Boolean) as MultiObjectiveFitness[];

  // Rank 1: no dominados. Rank 2: dominados solo por rank-1. Etc.
  let remaining = [...fits];
  let rank = 1;

  while (remaining.length > 0) {
    const nonDominated = remaining.filter(a => {
      return !remaining.some(b => b.agentId !== a.agentId && dominates(b, a));
    });

    nonDominated.forEach(f => {
      ranks.set(f.agentId, rank);
      f.paretoRank = rank;
    });

    remaining = remaining.filter(f => !ranks.has(f.agentId));
    rank++;
    if (rank > 10) break; // safety
  }

  return ranks;
}

function dominates(a: MultiObjectiveFitness, b: MultiObjectiveFitness): boolean {
  const objectives: (keyof MultiObjectiveFitness)[] =
    ["sharpe", "robustness", "adaptability", "diversity", "knowledgeDepth"];
  const betterInOne = objectives.some(k => (a[k] as number) > (b[k] as number));
  const notWorseInAll = objectives.every(k => (a[k] as number) >= (b[k] as number));
  return betterInOne && notWorseInAll;
}

// ─── Niching — Adaptive Species Discovery ─────────────────────────────────────

/**
 * Asigna agentes a nichos basándose en similaridad fenotípica (ASD-inspired).
 * Radio de nicho adaptativo: si los agentes son muy similares, el radio se reduce.
 * Cada nicho tiene un "species master" (mejor agente del nicho).
 *
 * Previene convergencia a un solo óptimo global.
 */
export function assignNiches(agents: Array<{
  id: string;
  fitnessScore: number;
  mathWeight: number;
  physicsWeight: number;
  chemistryWeight: number;
  entryThreshold: number;
  exitThreshold: number;
  positionSizing: number;
  momentumBias?: number;
  strategy: string;
}>): void {
  niches.clear();

  if (agents.length === 0) return;

  // Radio de nicho base — adaptativo al número de agentes
  // Con más agentes, el radio es más pequeño para permitir más nichos
  const baseRadius = Math.max(0.3, 1.5 / Math.sqrt(agents.length));

  const assigned = new Set<string>();
  const sorted = [...agents].sort((a, b) => b.fitnessScore - a.fitnessScore);

  for (const master of sorted) {
    if (assigned.has(master.id)) continue;

    const masterPheno = phenotype(master);
    const nicheId = `niche_${master.id.slice(0, 6)}`;

    // Encontrar miembros dentro del radio
    const members = sorted.filter(a => {
      if (assigned.has(a.id)) return false;
      const dist = euclideanDistance(masterPheno, phenotype(a));
      return dist <= baseRadius;
    });

    const nicheAgents = members.map(a => a.fitnessScore);
    const avgFitness = nicheAgents.reduce((s, f) => s + f, 0) / (nicheAgents.length || 1);

    niches.set(nicheId, {
      nicheId,
      dominantStrategy: master.strategy,
      centroid: masterPheno,
      members: members.map(a => a.id),
      avgFitness,
      bestFitness: master.fitnessScore,
      radius: baseRadius,
    });

    members.forEach(a => assigned.add(a.id));

    // Actualizar diversidad en MoFitness de cada miembro
    members.forEach(a => {
      const moFit = agentMoFitness.get(a.id);
      if (moFit) {
        // Diversidad = 1/tamaño del nicho (nichos pequeños = mayor contribución a diversidad)
        moFit.diversity = Math.min(1, 1 / members.length);
        moFit.nicheId = nicheId;
      }
    });
  }
}

/**
 * FITNESS SHARING: Penaliza el fitness de agentes en nichos superpoblados.
 * Agentes en nichos pequeños tienen ventaja relativa (mayor niche fitness).
 *
 * f_shared(i) = f(i) / Σⱼ sh(d(i,j))
 * donde sh(d) = 1 - (d/σ_share)² si d < σ_share, 0 en otro caso
 */
export function computeSharedFitness(agentId: string, rawFitness: number): number {
  const moFit = agentMoFitness.get(agentId);
  if (!moFit?.nicheId) return rawFitness;

  const niche = niches.get(moFit.nicheId);
  if (!niche) return rawFitness;

  // Penalización proporcional al tamaño del nicho
  const nichePenalty = Math.sqrt(niche.members.length);
  return rawFitness / nichePenalty;
}

// ─── Selección sexual / elección de pareja ──────────────────────────────────────

/**
 * Selecciona la pareja óptima para un agente (selección sexual).
 * Favorece:
 *   1. Buen fitness (por supuesto)
 *   2. Diversidad genética (no endogamia — distancia fenotípica mínima)
 *   3. Nichos distintos (cross-niche reproduction para diversidad)
 *   4. Estrategias complementarias (ej: math + physics → hijo interdisciplinar)
 */
export function selectMate<T extends {
  id: string;
  fitnessScore: number;
  mathWeight: number;
  physicsWeight: number;
  chemistryWeight: number;
  entryThreshold: number;
  exitThreshold: number;
  positionSizing: number;
  momentumBias?: number;
  strategy: string;
}>(
  parent1: T,
  candidates: T[],
  allowSameNiche: boolean = true
): T | null {
  if (candidates.length === 0) return null;

  const p1Pheno = phenotype(parent1);
  const p1MoFit = agentMoFitness.get(parent1.id);

  // Evaluar cada candidato como pareja
  const scored = candidates
    .filter(c => c.id !== parent1.id)
    .map(c => {
      const dist = euclideanDistance(p1Pheno, phenotype(c));
      const cMoFit = agentMoFitness.get(c.id);

      // Penalizar endogamia (muy similares genéticamente)
      const endogamyPenalty = dist < 0.3 ? 0.5 : 1.0;

      // Bonus por nichos distintos (cross-niche)
      const nicheBonus = (p1MoFit?.nicheId !== cMoFit?.nicheId) ? 1.3 : 1.0;

      // Complementariedad de estrategias
      const stratComplement = parent1.strategy !== c.strategy ? 1.2 : 1.0;

      const score = c.fitnessScore * endogamyPenalty * nicheBonus * stratComplement;
      return { candidate: c, score, dist };
    })
    .filter(s => s.dist > 0.1); // filtrar casi-clones

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

// ─── Crossover especializado ────────────────────────────────────────────────────

export type CrossoverType = "standard" | "domain_specialized" | "heterochrony";

/**
 * Determina el tipo de crossover basándose en la compatibilidad de los padres.
 *
 * - standard: mezcla uniforme de genes
 * - domain_specialized: cada hijo hereda el dominio más fuerte de cada padre
 * - heterochrony: el hijo hereda tasas de desarrollo diferentes (lookback, thresholds)
 */
export function selectCrossoverType(
  parent1Fitness: number,
  parent2Fitness: number,
  p1Math: number,
  p2Math: number,
  generation: number
): CrossoverType {
  const fitnessDiff = Math.abs(parent1Fitness - parent2Fitness);
  const domainDiff  = Math.abs(p1Math - p2Math);

  // Crossover especializado cuando los padres tienen dominios muy distintos
  if (domainDiff > 0.3) return "domain_specialized";

  // Heterochrony en generaciones avanzadas (variación en desarrollo)
  if (generation > 10 && Math.random() < 0.3) return "heterochrony";

  return "standard";
}

/**
 * Genera los parámetros genéticos del hijo con el tipo de crossover dado.
 */
export function performCrossover(
  parent1: { mathWeight: number; physicsWeight: number; chemistryWeight: number;
             entryThreshold: number; exitThreshold: number; positionSizing: number;
             momentumBias?: number; lookbackPeriod: number; riskTolerance: number;
             volatilityFilter: number; fitnessScore: number; strategy: string },
  parent2: { mathWeight: number; physicsWeight: number; chemistryWeight: number;
             entryThreshold: number; exitThreshold: number; positionSizing: number;
             momentumBias?: number; lookbackPeriod: number; riskTolerance: number;
             volatilityFilter: number; fitnessScore: number; strategy: string },
  type: CrossoverType,
  mutationRate: number = 0.1
): {
  mathWeight: number; physicsWeight: number; chemistryWeight: number;
  entryThreshold: number; exitThreshold: number; positionSizing: number;
  momentumBias: number; lookbackPeriod: number; riskTolerance: number;
  volatilityFilter: number; strategy: string;
} {
  const mut = (v: number, range: number) =>
    v + (Math.random() < mutationRate ? (Math.random() * 2 - 1) * range : 0);
  const cross = (a: number, b: number) => Math.random() < 0.5 ? a : b;

  if (type === "domain_specialized") {
    // Cada dominio viene del padre más fuerte en ese dominio
    const mathWinner    = parent1.mathWeight > parent2.mathWeight ? parent1 : parent2;
    const physWinner    = parent1.physicsWeight > parent2.physicsWeight ? parent1 : parent2;
    const chemWinner    = parent1.chemistryWeight > parent2.chemistryWeight ? parent1 : parent2;
    const tradingWinner = parent1.fitnessScore > parent2.fitnessScore ? parent1 : parent2;

    return {
      mathWeight:      mut(mathWinner.mathWeight, 0.05),
      physicsWeight:   mut(physWinner.physicsWeight, 0.05),
      chemistryWeight: mut(chemWinner.chemistryWeight, 0.05),
      entryThreshold:  mut(tradingWinner.entryThreshold, 0.005),
      exitThreshold:   mut(tradingWinner.exitThreshold, 0.003),
      positionSizing:  mut(tradingWinner.positionSizing, 0.02),
      momentumBias:    mut(cross(parent1.momentumBias ?? 0, parent2.momentumBias ?? 0), 0.1),
      lookbackPeriod:  Math.max(5, Math.round(cross(parent1.lookbackPeriod, parent2.lookbackPeriod) + (Math.random() < mutationRate ? (Math.random() - 0.5) * 4 : 0))),
      riskTolerance:   mut(cross(parent1.riskTolerance, parent2.riskTolerance), 0.05),
      volatilityFilter:mut(cross(parent1.volatilityFilter, parent2.volatilityFilter), 0.05),
      strategy:        Math.random() < 0.15 ? parent2.strategy : parent1.strategy,
    };

  } else if (type === "heterochrony") {
    // Heterochrony: mezcla estándar de conocimiento pero lookback/thresholds mutados más fuerte
    const heteroMut = mutationRate * 2.5;
    return {
      mathWeight:      mut(cross(parent1.mathWeight, parent2.mathWeight), 0.08),
      physicsWeight:   mut(cross(parent1.physicsWeight, parent2.physicsWeight), 0.08),
      chemistryWeight: mut(cross(parent1.chemistryWeight, parent2.chemistryWeight), 0.08),
      entryThreshold:  mut(cross(parent1.entryThreshold, parent2.entryThreshold), heteroMut * 0.01),
      exitThreshold:   mut(cross(parent1.exitThreshold, parent2.exitThreshold), heteroMut * 0.008),
      positionSizing:  mut(cross(parent1.positionSizing, parent2.positionSizing), heteroMut * 0.03),
      momentumBias:    mut(cross(parent1.momentumBias ?? 0, parent2.momentumBias ?? 0), 0.2),
      lookbackPeriod:  Math.max(3, Math.round(cross(parent1.lookbackPeriod, parent2.lookbackPeriod) + (Math.random() - 0.5) * 10)),
      riskTolerance:   mut(cross(parent1.riskTolerance, parent2.riskTolerance), heteroMut * 0.08),
      volatilityFilter:mut(cross(parent1.volatilityFilter, parent2.volatilityFilter), heteroMut * 0.05),
      strategy:        Math.random() < 0.25 ? parent2.strategy : parent1.strategy,
    };

  } else {
    // Standard: crossover uniforme clásico
    return {
      mathWeight:      mut(cross(parent1.mathWeight, parent2.mathWeight), 0.05),
      physicsWeight:   mut(cross(parent1.physicsWeight, parent2.physicsWeight), 0.05),
      chemistryWeight: mut(cross(parent1.chemistryWeight, parent2.chemistryWeight), 0.05),
      entryThreshold:  mut(cross(parent1.entryThreshold, parent2.entryThreshold), 0.005),
      exitThreshold:   mut(cross(parent1.exitThreshold, parent2.exitThreshold), 0.003),
      positionSizing:  mut(cross(parent1.positionSizing, parent2.positionSizing), 0.02),
      momentumBias:    mut(cross(parent1.momentumBias ?? 0, parent2.momentumBias ?? 0), 0.1),
      lookbackPeriod:  Math.max(5, Math.round(cross(parent1.lookbackPeriod, parent2.lookbackPeriod) + (Math.random() < mutationRate ? (Math.random() - 0.5) * 4 : 0))),
      riskTolerance:   mut(cross(parent1.riskTolerance, parent2.riskTolerance), 0.05),
      volatilityFilter:mut(cross(parent1.volatilityFilter, parent2.volatilityFilter), 0.05),
      strategy:        Math.random() < 0.15 ? parent2.strategy : parent1.strategy,
    };
  }
}

// ─── Tasa de mutación adaptativa ────────────────────────────────────────────────

/**
 * Calcula la tasa de mutación óptima basándose en el estado de la población.
 * Más diversidad = menos mutación necesaria.
 * Convergencia detectada = más mutación para escapar óptimo local.
 */
export function computeAdaptiveMutationRate(
  diversityIndex: number,  // 0-1 (Shannon entropy de estrategias)
  generationsSinceImprovement: number,
  currentGen: number
): number {
  // Base: mutación estándar
  let rate = 0.10;

  // Si hay convergencia (baja diversidad), aumentar mutación
  if (diversityIndex < 0.3) rate += 0.15;
  else if (diversityIndex < 0.5) rate += 0.05;

  // Si llevamos muchas generaciones sin mejorar, explorar más
  if (generationsSinceImprovement > 5) rate += 0.10;
  if (generationsSinceImprovement > 10) rate += 0.15;

  // Generaciones tempranas: más exploración
  if (currentGen < 3) rate *= 1.5;

  return Math.min(0.5, rate); // máximo 50% de mutación
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getReproductiveStats(
  agents: Array<{ id: string; strategy: string; fitnessScore: number }>
): ReproductiveStats {
  // Shannon entropy de estrategias
  const stratCount: Record<string, number> = {};
  agents.forEach(a => { stratCount[a.strategy] = (stratCount[a.strategy] ?? 0) + 1; });
  const total = agents.length || 1;
  const entropy = Object.values(stratCount).reduce((s, count) => {
    const p = count / total;
    return s - (p > 0 ? p * Math.log2(p) : 0);
  }, 0);
  const maxEntropy = Math.log2(Object.keys(stratCount).length || 1);
  const diversityIndex = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Frente de Pareto
  const paretoFrontSize = [...agentMoFitness.values()].filter(f => f.paretoRank === 1).length;

  // Tasa de endogamia (parejas muy similares en reproducción reciente)
  const inbreedingEvents = recentReproductionEvents.filter(e => {
    const p1Fit = agentMoFitness.get(e.parent1Id);
    const p2Fit = agentMoFitness.get(e.parent2Id);
    return p1Fit && p2Fit && Math.abs(p1Fit.composite - p2Fit.composite) < 0.05;
  }).length;
  const inbreedingRate = recentReproductionEvents.length > 0
    ? inbreedingEvents / recentReproductionEvents.length
    : 0;

  // Niches con >= 2 miembros
  const speciesCount = [...niches.values()].filter(n => n.members.length >= 2).length;
  const avgNicheSize = niches.size > 0
    ? [...niches.values()].reduce((s, n) => s + n.members.length, 0) / niches.size
    : 0;

  const dominantEntry = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0];

  return {
    totalNiches: niches.size,
    avgNicheSize,
    diversityIndex,
    paretoFrontSize,
    inbreedingRate,
    speciesCount,
    avgMutationRate: 0.10, // placeholder, varía por ciclo
    dominantStrategy: dominantEntry?.[0] ?? "none",
  };
}

export function getNiches(): AgentNiche[] {
  return [...niches.values()];
}

export function getAgentMoFitness(agentId: string): MultiObjectiveFitness | null {
  return agentMoFitness.get(agentId) ?? null;
}

export function registerReproductionEvent(event: ReproductionEvent): void {
  recentReproductionEvents.push(event);
  if (recentReproductionEvents.length > MAX_EVENTS) {
    recentReproductionEvents.shift();
  }
}

// ─── Persistence hooks ─────────────────────────────────────────────────────────

/**
 * Extrae estado del sistema reproductivo para checkpoint.
 */
export function extractReproductiveState(): {
  agentMoFitness: Record<string, any>;
  agentOutcomeHistory: Record<string, number[]>;
} {
  const moObj: Record<string, any> = {};
  agentMoFitness.forEach((v, k) => { moObj[k] = v; });

  const histObj: Record<string, number[]> = {};
  agentOutcomeHistory.forEach((v, k) => { histObj[k] = v; });

  return {
    agentMoFitness: moObj,
    agentOutcomeHistory: histObj,
  };
}

/**
 * Restaura el estado del sistema reproductivo desde un checkpoint.
 */
export function restoreReproductiveState(data: {
  agentMoFitness?: Record<string, any>;
  agentOutcomeHistory?: Record<string, number[]>;
}): void {
  if (data.agentMoFitness) {
    agentMoFitness.clear();
    Object.entries(data.agentMoFitness).forEach(([k, v]) => {
      agentMoFitness.set(k, v as MultiObjectiveFitness);
    });
  }
  if (data.agentOutcomeHistory) {
    agentOutcomeHistory.clear();
    Object.entries(data.agentOutcomeHistory).forEach(([k, v]) => {
      agentOutcomeHistory.set(k, v);
    });
  }
  console.log(`[Reproductive] Restaurado: ${Object.keys(data.agentMoFitness ?? {}).length} MO-fitness`);
}
