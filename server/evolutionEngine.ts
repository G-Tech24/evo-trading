/**
 * EVOLUTION ENGINE — v2 "SISTEMA NERVIOSO"
 * ==========================================
 * Red de agentes evolutivos con sistema nervioso basado en:
 *
 *   1. CfC (Closed-form Continuous-depth) Networks — MIT Liquid AI
 *      Cada agente tiene un "cerebro" con neuronas de tiempo continuo.
 *      ḣ = -[τ⁻¹ + f(h,x)]⊙h + f(h,x)⊙A
 *      Solver-free variant (150x más rápido que ODE completo).
 *      Los pesos del CfC SON los genes evolucionados.
 *
 *   2. GAT (Graph Attention Networks)
 *      Mensajes entre agentes con pesos de atención aprendidos.
 *      αᵢⱼ = softmax(LeakyReLU(aᵀ[Whᵢ||Whⱼ]))
 *      Los agentes exitosos reciben más atención automáticamente.
 *
 *   3. G-Designer inspired dynamic topology
 *      La topología del grafo evoluciona con los agentes.
 *      Score de compatibilidad determina quien se conecta con quien.
 *
 *   4. NCP (Neural Circuit Policies) — C. elegans sparse wiring
 *      3 capas: sensorial (ciencias) → interneurona → motora (decisión)
 *      Conectividad escasa (20-30%) como el sistema nervioso real.
 *
 * Metáfora:
 *   - Conocimiento + práctica = músculo/esqueleto (genes, estrategias)
 *   - Sistema nervioso = CfC + GAT + NCP (cómo procesan y deciden)
 */

import { storage } from "./storage.js";
import type { Agent } from "@shared/schema";
import { extractKnowledgeFeatures, selectRelevantConcepts, CURRICULUM_STATS } from "./knowledgeBase.js";
import { selectProblemsForAgent, computeWisdomVector, PROBLEM_BANK_STATS } from "./problemBank.js";
import {
  generateTrainingSession, registerSession, getTrainingStats, getRecentSessions,
  selectTrainingPhase
} from "./trainingEngine.js";
import {
  heartbeat, capillaryExchange, venousReturn, processPackets,
  updateAgentProfile, getCirculatoryStats, getCirculatoryState
} from "./circulatorySystem.js";
import {
  breathe, analyzeMarketAirQuality, getRespiratorySystemStats, getAgentRespiratoryProfile
} from "./respiratorySystem.js";

// Exportar stats de los sistemas fisiológicos
export { getTrainingStats, getRecentSessions };
export { getCirculatoryStats, getCirculatoryState };
export { getRespiratorySystemStats, getAgentRespiratoryProfile };

// ─── Constantes del sistema nervioso ─────────────────────────────────────────
const CFC_HIDDEN = 24;       // Neuronas CfC por agente (compacto pero expresivo)
const NCP_SENSORY = 9;       // 9 neuronas sensoriales: 3 math + 3 physics + 3 chemistry
const NCP_INTER = 12;        // Interneuronas (procesamiento)
const NCP_MOTOR = 3;         // Neuronas motoras: buy_strength, sell_strength, hold_confidence
const GAT_HEADS = 2;         // Cabezas de atención multi-head
const ATTENTION_DIM = 8;     // Dimensión del vector de atención

export const STRATEGIES = [
  "brownian_motion",        // Math: Proceso de Wiener — random walk con drift
  "mean_reversion",         // Physics: Oscilador armónico — tendencia al equilibrio
  "wave_interference",      // Physics: Superposición de ondas — señales de múltiples períodos
  "entropy_decay",          // Termodinámica: Sistemas hacia equilibrio
  "boltzmann_distribution", // Mecánica Estadística: Probabilidad de estado energético
  "chaos_theory",           // Math: Sensibilidad a condiciones iniciales
  "harmonic_oscillator",    // Physics: Movimiento periódico alrededor del equilibrio
  "reaction_kinetics",      // Chemistry: Tasa de cambio y equilibrio
  "diffusion_gradient",     // Chemistry/Physics: Flujo de alta a baja concentración
  "orbital_mechanics",      // Physics: Ciclos elípticos, atracción gravitacional
];

// ─── Utilidades básicas ───────────────────────────────────────────────────────
function rand(min = 0, max = 1): number {
  return Math.random() * (max - min) + min;
}
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-clamp(x, -20, 20)));
}
function tanh(x: number): number {
  return Math.tanh(clamp(x, -20, 20));
}
function relu(x: number): number {
  return Math.max(0, x);
}
function leakyRelu(x: number, alpha = 0.2): number {
  return x > 0 ? x : alpha * x;
}
function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0) + 1e-8;
  return exps.map(e => e / sum);
}
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
}
function matMulVec(W: number[][], x: number[]): number[] {
  return W.map(row => dotProduct(row, x));
}
function vecAdd(a: number[], b: number[]): number[] {
  return a.map((ai, i) => ai + (b[i] ?? 0));
}
function vecScale(a: number[], s: number): number[] {
  return a.map(ai => ai * s);
}
function vecHadamard(a: number[], b: number[]): number[] {
  return a.map((ai, i) => ai * (b[i] ?? 0));
}
function vecConcat(a: number[], b: number[]): number[] {
  return [...a, ...b];
}
function initMatrix(rows: number, cols: number, scale = 0.1): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rand(-scale, scale))
  );
}
function initVec(size: number, scale = 0.1): number[] {
  return Array.from({ length: size }, () => rand(-scale, scale));
}
function generateId(): string {
  return `agent_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}
function generateName(generation: number, index: number): string {
  const prefixes = [
    "Euler", "Gauss", "Fourier", "Laplace", "Newton", "Leibniz",
    "Maxwell", "Boltzmann", "Heisenberg", "Planck", "Curie",
    "Dirac", "Fermat", "Riemann", "Cauchy", "Bernoulli",
    "Lorentz", "Faraday", "Avogadro", "Kepler",
  ];
  const base = prefixes[index % prefixes.length];
  return `${base}-G${generation}`;
}

// ─── NCP Sparse Wiring Matrix (C. elegans inspired) ──────────────────────────
/**
 * Genera una máscara de conectividad escasa al estilo NCP.
 * Solo el 25-30% de las conexiones están activas.
 * Las neuronas sensoriales se conectan preferentemente a interneuronas,
 * las interneuronas a motoras.
 */
function generateNcpMask(from: number, to: number, density = 0.28): number[][] {
  return Array.from({ length: to }, () =>
    Array.from({ length: from }, () => Math.random() < density ? 1 : 0)
  );
}

// ─── CfC Cerebro por Agente ───────────────────────────────────────────────────
/**
 * Implementación del Closed-form Continuous-depth (CfC) network.
 *
 * Ecuación del sistema:
 *   f(h,x) = sigmoid(W_f·[h,x] + b_f)          ← "backbone" signal
 *   A = tanh(W_A·[h,x] + b_A)                  ← attractor state
 *   τ = softplus(W_τ·[h,x] + b_τ) + 0.001      ← time constant (adaptable)
 *   ḣ ≈ -[τ⁻¹ + f]⊙h + f⊙A                    ← continuous-time ODE (solver-free approx)
 *   h_new = ODE_solution = h + Δt·ḣ / (1 + Δt·τ⁻¹)  ← closed-form step
 *
 * La clave: τ VARÍA según la entrada → el agente adapta su "velocidad de pensamiento"
 * a los regímenes del mercado (volátil = τ pequeño = respuesta rápida).
 */
export interface CfCBrain {
  // NCP Layer 1: sensory → inter (sparse)
  W_si: number[][];  // [NCP_INTER × NCP_SENSORY]
  M_si: number[][];  // sparse mask
  b_si: number[];

  // NCP Layer 2: inter → motor (sparse)
  W_im: number[][];  // [NCP_MOTOR × NCP_INTER]
  M_im: number[][];  // sparse mask
  b_im: number[];

  // CfC dynamics (applied in inter layer)
  W_f: number[][];   // [NCP_INTER × (NCP_INTER + NCP_SENSORY)]
  W_A: number[][];   // [NCP_INTER × (NCP_INTER + NCP_SENSORY)]
  W_tau: number[][]; // [NCP_INTER × (NCP_INTER + NCP_SENSORY)]
  b_f: number[];
  b_A: number[];
  b_tau: number[];

  // GAT attention vectors (for inter-agent communication)
  W_msg: number[][];  // [ATTENTION_DIM × NCP_MOTOR] — encodes outgoing message
  W_att: number[][];  // [1 × (ATTENTION_DIM * 2)] — attention score per edge
  b_att: number[];

  // Persistent hidden state (evolves over time — actual "memory")
  hiddenState: number[];  // [NCP_INTER]
}

function initCfCBrain(): CfCBrain {
  const inDim = NCP_INTER + NCP_SENSORY;
  return {
    W_si: initMatrix(NCP_INTER, NCP_SENSORY, 0.3),
    M_si: generateNcpMask(NCP_SENSORY, NCP_INTER, 0.28),
    b_si: initVec(NCP_INTER, 0.01),

    W_im: initMatrix(NCP_MOTOR, NCP_INTER, 0.3),
    M_im: generateNcpMask(NCP_INTER, NCP_MOTOR, 0.35),
    b_im: initVec(NCP_MOTOR, 0.01),

    W_f:   initMatrix(NCP_INTER, inDim, 0.2),
    W_A:   initMatrix(NCP_INTER, inDim, 0.2),
    W_tau: initMatrix(NCP_INTER, inDim, 0.1),
    b_f:   initVec(NCP_INTER, 0.0),
    b_A:   initVec(NCP_INTER, 0.0),
    b_tau: initVec(NCP_INTER, 0.5), // bias toward moderate τ

    W_msg: initMatrix(ATTENTION_DIM, NCP_MOTOR, 0.2),
    W_att: initMatrix(1, ATTENTION_DIM * 2, 0.1),
    b_att: [0.0],

    hiddenState: new Array(NCP_INTER).fill(0),
  };
}

/**
 * Serializa el CfC brain para guardar en el agente (JSON-compatible).
 */
function serializeBrain(brain: CfCBrain): any {
  return {
    W_si: brain.W_si, M_si: brain.M_si, b_si: brain.b_si,
    W_im: brain.W_im, M_im: brain.M_im, b_im: brain.b_im,
    W_f: brain.W_f, W_A: brain.W_A, W_tau: brain.W_tau,
    b_f: brain.b_f, b_A: brain.b_A, b_tau: brain.b_tau,
    W_msg: brain.W_msg, W_att: brain.W_att, b_att: brain.b_att,
    hiddenState: brain.hiddenState,
  };
}

function deserializeBrain(data: any): CfCBrain {
  if (!data) return initCfCBrain();
  return data as CfCBrain;
}

/**
 * Forward pass del CfC brain:
 *   1. Construye vector sensorial de las ciencias (math/physics/chemistry features)
 *   2. Capa NCP sensory→inter con máscara escasa + dinámica CfC
 *   3. Capa NCP inter→motor con máscara escasa
 *   4. Retorna: [buy_strength, sell_strength, hold_confidence] + hidden state
 */
function runCfCForward(
  brain: CfCBrain,
  sensoryInput: number[],   // [NCP_SENSORY] — señales de las 3 ciencias
  dt: number = 1.0           // time step (puede variar con volatilidad del mercado)
): { motorOutput: number[]; newHidden: number[]; timeConstants: number[] } {
  // ─ Layer 1: Sensory → Inter (NCP sparse + CfC dynamics) ─────────────────
  const h = brain.hiddenState;
  const x = sensoryInput;

  // Concatenar estado oculto + entrada
  const hx = vecConcat(h, x);  // [NCP_INTER + NCP_SENSORY]

  // CfC: calcular f, A, τ para cada neurona inter
  const f_raw = matMulVec(brain.W_f, hx);
  const A_raw = matMulVec(brain.W_A, hx);
  const tau_raw = matMulVec(brain.W_tau, hx);

  const f = vecAdd(f_raw, brain.b_f).map(sigmoid);
  const A = vecAdd(A_raw, brain.b_A).map(tanh);
  const tau = vecAdd(tau_raw, brain.b_tau).map(v => Math.log1p(Math.exp(v)) + 0.001); // softplus

  // NCP sparse input contribution: W_si * x (with mask)
  const sparse_input = Array.from({ length: NCP_INTER }, (_, i) => {
    let sum = 0;
    for (let j = 0; j < NCP_SENSORY; j++) {
      sum += brain.M_si[i][j] * brain.W_si[i][j] * (x[j] ?? 0);
    }
    return sum + brain.b_si[i];
  });

  // CfC closed-form step: h_new = (h + Δt·f⊙A) / (1 + Δt·(τ⁻¹ + f))
  // This is the solver-free approximation (Runge-Kutta free)
  const tauInv = tau.map(t => 1 / t);
  const numerator = h.map((hi, i) =>
    hi + dt * (f[i] * A[i] + 0.2 * sparse_input[i])
  );
  const denominator = h.map((_, i) => 1 + dt * (tauInv[i] + f[i]));
  const newHidden = numerator.map((n, i) =>
    clamp(n / denominator[i], -2, 2)
  );

  // ─ Layer 2: Inter → Motor (NCP sparse) ──────────────────────────────────
  const motorRaw = Array.from({ length: NCP_MOTOR }, (_, i) => {
    let sum = 0;
    for (let j = 0; j < NCP_INTER; j++) {
      sum += brain.M_im[i][j] * brain.W_im[i][j] * newHidden[j];
    }
    return sum + brain.b_im[i];
  });

  // Motor outputs: buy, sell, hold
  const motorOutput = motorRaw.map(tanh); // [-1, 1]

  return { motorOutput, newHidden, timeConstants: tau };
}

/**
 * Extrae señales sensoriales usando el CONOCIMIENTO DOCTORAL del agente.
 * Integra la knowledgeBase — cada agente percibe el mercado a través del lens
 * de sus ciencias, ponderado por su genoma.
 *
 * 9 features: 3 Math + 3 Physics + 3 Chemistry
 * Basado en conceptos reales de MIT/Caltech PhD curricula.
 */
function extractSensorySignals(
  agent: Agent,
  prices: number[]
): number[] {
  if (prices.length < 5) return new Array(NCP_SENSORY).fill(0);

  // Usar la base de conocimiento para extraer features
  // (log-retorno Itô, Hurst, z-score | energía cinética, entropía, resorte | cinética, difusión Fick, Le Chatelier)
  const knowledgeFeatures = extractKnowledgeFeatures(
    agent.mathWeight,
    agent.physicsWeight,
    agent.chemistryWeight,
    prices,
    agent.lookbackPeriod
  );

  // Wisdom boost: si el agente ha "estudiado" más problemas, sus señales son más precisas
  // (simulado via fitnessScore como proxy de experiencia acumulada)
  const wisdomBoost = Math.min(1.2, 1.0 + Math.max(0, agent.fitnessScore) * 0.1);

  return knowledgeFeatures.map(f => clamp(f * wisdomBoost, -1, 1));
}

// ─── In-memory brain store ────────────────────────────────────────────────────
// Los CfC brains viven en memoria (no en DB) por eficiencia.
// Se persisten en el agente como JSON en campo `brainState`.
const agentBrains = new Map<string, CfCBrain>();

function getBrain(agent: Agent): CfCBrain {
  if (agentBrains.has(agent.id)) {
    return agentBrains.get(agent.id)!;
  }
  // Intentar deserializar del agente (si viene de reproducción)
  const stored = (agent as any).brainState;
  const brain = stored ? deserializeBrain(stored) : initCfCBrain();
  agentBrains.set(agent.id, brain);
  return brain;
}

function saveBrain(agentId: string, brain: CfCBrain) {
  agentBrains.set(agentId, brain);
}

// ─── GAT Message Passing ──────────────────────────────────────────────────────
/**
 * Graph Attention Network message passing entre vecinos.
 *
 * Para cada par (i, j) donde j es vecino de i:
 *   msg_j = W_msg · motor_j                     ← encode j's motor state
 *   e_ij = LeakyReLU(W_att · [msg_i || msg_j])  ← attention logit
 *   α_ij = softmax_j(e_ij)                      ← normalized attention weight
 *
 * Mensaje agregado para i:
 *   m_i = Σⱼ α_ij · msg_j
 *
 * Este mensaje se suma al vector sensorial del agente en el siguiente tick.
 */
interface GATMessage {
  agentId: string;
  msgVector: number[];      // [ATTENTION_DIM] — encoded motor state
  fitnessScore: number;
  attentionScore?: number;  // calculado por el receptor
}

function computeGATMessages(
  agent: Agent,
  brain: CfCBrain,
  myMotorOutput: number[]
): { aggregatedMsg: number[]; attentionWeights: Record<string, number> } {
  const neighbors = agent.neighbors ?? [];
  if (neighbors.length === 0) {
    return { aggregatedMsg: new Array(ATTENTION_DIM).fill(0), attentionWeights: {} };
  }

  // Encode my motor state for attention computation
  const myMsg = matMulVec(brain.W_msg, myMotorOutput);

  const messages: GATMessage[] = [];

  neighbors.forEach(nid => {
    const neighbor = storage.getAgent(nid);
    if (!neighbor || neighbor.status !== "alive") return;

    const neighborBrain = agentBrains.get(nid);
    if (!neighborBrain) return;

    // Get neighbor's last motor output (approximated from fitness + trades)
    // Use stored brain's last motor output encoded via W_msg
    const neighborMotor = [
      clamp(neighbor.fitnessScore * 0.5, -1, 1),
      clamp(-neighbor.fitnessScore * 0.3, -1, 1),
      clamp(neighbor.winRate * 2 - 1, -1, 1),
    ];
    const neighborMsg = matMulVec(brain.W_msg, neighborMotor);

    messages.push({
      agentId: nid,
      msgVector: neighborMsg,
      fitnessScore: neighbor.fitnessScore,
    });
  });

  if (messages.length === 0) {
    return { aggregatedMsg: new Array(ATTENTION_DIM).fill(0), attentionWeights: {} };
  }

  // Compute attention scores: e_ij = LeakyReLU(W_att · [msg_i || msg_j])
  const attentionLogits = messages.map(m => {
    const concat = vecConcat(myMsg, m.msgVector);
    const score = dotProduct(brain.W_att[0], concat) + brain.b_att[0];
    return leakyRelu(score);
  });

  // Normalize with softmax
  const alphas = softmax(attentionLogits);

  // Aggregate: m_i = Σⱼ α_ij · msg_j
  const aggregated = new Array(ATTENTION_DIM).fill(0);
  messages.forEach((m, idx) => {
    for (let d = 0; d < ATTENTION_DIM; d++) {
      aggregated[d] += alphas[idx] * m.msgVector[d];
    }
  });

  const attentionWeights: Record<string, number> = {};
  messages.forEach((m, idx) => {
    attentionWeights[m.agentId] = alphas[idx];
  });

  return { aggregatedMsg: aggregated, attentionWeights };
}

// ─── Dynamic Topology (G-Designer inspired) ───────────────────────────────────
/**
 * La topología del grafo evoluciona dinámicamente.
 * Score de compatibilidad entre dos agentes = f(strategy_diversity, fitness_diff, domain_overlap)
 *
 * Principios:
 * - Agentes con estrategias complementarias se conectan (diversidad = resiliencia)
 * - Agentes muy exitosos atraen más conexiones (hubs naturales)
 * - Dominios de ciencia similares facilitan la comunicación
 */
export function buildDynamicGraph() {
  const agents = storage.getAliveAgents();
  if (agents.length < 2) return;

  const ids = agents.map(a => a.id);

  agents.forEach((agent) => {
    const neighbors: string[] = [];
    const scores: { id: string; score: number }[] = [];

    // Score de compatibilidad con cada otro agente
    ids.forEach(otherId => {
      if (otherId === agent.id) return;
      const other = storage.getAgent(otherId);
      if (!other || other.status !== "alive") return;

      // 1. Diversidad de estrategia (mejor conectar estrategias diferentes)
      const stratDiversity = agent.strategy !== other.strategy ? 0.3 : 0.0;

      // 2. Atracción gravitacional por fitness (agentes exitosos atraen)
      const fitnessAttraction = clamp(other.fitnessScore * 0.2, -0.1, 0.4);

      // 3. Complementariedad de dominio científico
      const domainOverlap = 1 - Math.abs(agent.mathWeight - other.mathWeight)
        - Math.abs(agent.physicsWeight - other.physicsWeight) * 0.5;

      // 4. Ruido pequeño para evitar grafos demasiado deterministas
      const noise = rand(-0.05, 0.05);

      const totalScore = stratDiversity + fitnessAttraction + domainOverlap * 0.3 + noise;
      scores.push({ id: otherId, score: totalScore });
    });

    // Ordenar por score y tomar los top-3 (o hasta 4)
    scores.sort((a, b) => b.score - a.score);
    const maxConnections = Math.min(4, Math.max(2, Math.floor(agents.length / 3)));
    const topNeighbors = scores.slice(0, maxConnections).map(s => s.id);

    // Garantizar mínimo 1 conexión aleatoria de largo alcance (small-world property)
    if (topNeighbors.length > 0 && Math.random() < 0.3) {
      const randomIdx = Math.floor(rand(0, ids.length));
      const randomId = ids[randomIdx];
      if (randomId !== agent.id && !topNeighbors.includes(randomId)) {
        topNeighbors[topNeighbors.length - 1] = randomId; // reemplazar último
      }
    }

    neighbors.push(...topNeighbors.filter(id => id !== agent.id));
    storage.updateAgent(agent.id, { neighbors });
  });
}

// ─── Legacy buildGraph (alias para compatibilidad) ────────────────────────────
export function buildGraph() {
  buildDynamicGraph();
}

// ─── Crossover de CfC Brains ──────────────────────────────────────────────────
/**
 * Reproducción del sistema nervioso: crossover entre dos cerebros CfC.
 * Mezcla las matrices de pesos con cruce gene-a-gene + mutación gaussiana.
 */
function crossoverBrains(brain1: CfCBrain, brain2: CfCBrain, mutationRate = 0.08): CfCBrain {
  const child = initCfCBrain();
  const mutate = (v: number) => v + (Math.random() < 0.15 ? rand(-mutationRate, mutationRate) : 0);
  const crossRow = (r1: number[], r2: number[]) =>
    r1.map((v, i) => mutate(Math.random() < 0.5 ? v : (r2[i] ?? v)));
  const crossMat = (M1: number[][], M2: number[][]) =>
    M1.map((row, i) => crossRow(row, M2[i] ?? row));
  const crossVec = (v1: number[], v2: number[]) =>
    v1.map((v, i) => mutate(Math.random() < 0.5 ? v : (v2[i] ?? v)));

  child.W_si = crossMat(brain1.W_si, brain2.W_si);
  child.W_im = crossMat(brain1.W_im, brain2.W_im);
  child.W_f  = crossMat(brain1.W_f,  brain2.W_f);
  child.W_A  = crossMat(brain1.W_A,  brain2.W_A);
  child.W_tau = crossMat(brain1.W_tau, brain2.W_tau);
  child.W_msg = crossMat(brain1.W_msg, brain2.W_msg);
  child.W_att = crossMat(brain1.W_att, brain2.W_att);

  child.b_si  = crossVec(brain1.b_si,  brain2.b_si);
  child.b_im  = crossVec(brain1.b_im,  brain2.b_im);
  child.b_f   = crossVec(brain1.b_f,   brain2.b_f);
  child.b_A   = crossVec(brain1.b_A,   brain2.b_A);
  child.b_tau = crossVec(brain1.b_tau, brain2.b_tau);
  child.b_att = crossVec(brain1.b_att, brain2.b_att);

  // Los hijos heredan máscara de conectividad NCP (con pequeña probabilidad de rewiring)
  child.M_si = brain1.M_si.map((row, i) =>
    row.map((v, j) => {
      if (Math.random() < 0.05) return Math.random() < 0.28 ? 1 : 0; // rewire
      return Math.random() < 0.5 ? v : (brain2.M_si[i]?.[j] ?? v);
    })
  );
  child.M_im = brain1.M_im.map((row, i) =>
    row.map((v, j) => {
      if (Math.random() < 0.05) return Math.random() < 0.35 ? 1 : 0;
      return Math.random() < 0.5 ? v : (brain2.M_im[i]?.[j] ?? v);
    })
  );

  // Hidden state inicializado en 0 para los hijos (nacen sin memoria)
  child.hiddenState = new Array(NCP_INTER).fill(0);

  return child;
}

// ─── Market data ──────────────────────────────────────────────────────────────
let currentPrice = 65000 + rand(-5000, 5000);
let priceHistory: number[] = [];
let volumeHistory: number[] = [];

export async function fetchOrSimulatePrice(): Promise<{ price: number; volume: number; change24h: number }> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const price = parseFloat(data.lastPrice);
      const volume = parseFloat(data.quoteVolume) / 1e6;
      const change24h = parseFloat(data.priceChangePercent);
      currentPrice = price;
      return { price, volume, change24h };
    }
  } catch (_) {
    // Fall back to simulation
  }

  // Brownian motion simulation with fat tails
  const drift = 0.0001;
  const sigma = 0.002;
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const shock = Math.random() < 0.02 ? z * 3 : z;
  currentPrice = currentPrice * Math.exp(drift + sigma * shock);
  currentPrice = clamp(currentPrice, 20000, 150000);

  const volume = rand(0.5, 5);
  const change24h = rand(-8, 8);
  return { price: currentPrice, volume, change24h };
}

// ─── computeSignal v2: CfC + GAT ─────────────────────────────────────────────
/**
 * El nuevo sistema nervioso.
 *
 * Flujo:
 *   1. Extrae señales sensoriales de las 3 ciencias (9-dim)
 *   2. Obtiene mensajes GAT de vecinos (ATTENTION_DIM-dim aggregated)
 *   3. Combina sensory + GAT message como input al CfC
 *   4. CfC forward pass: actualiza hidden state, retorna motor output
 *   5. Motor output [buy, sell, hold] → señal escalar de trading
 *
 * El dt (time constant) varía con la volatilidad del mercado:
 *   - Mercado volátil → dt pequeño → agente más reactivo
 *   - Mercado tranquilo → dt grande → agente más paciente
 */
function computeSignalV2(
  agent: Agent,
  prices: number[],
  marketVolatility: number
): { signal: number; attentionWeights: Record<string, number>; timeConstants: number[] } {
  if (prices.length < 5) {
    return { signal: 0, attentionWeights: {}, timeConstants: [] };
  }

  const brain = getBrain(agent);

  // 1. Señales sensoriales de las ciencias
  const sensory = extractSensorySignals(agent, prices);

  // 2. Motor output aproximado para computar mensajes GAT
  //    (usamos el último resultado o un proxy basado en fitness)
  const myProxyMotor: number[] = [
    clamp(agent.fitnessScore * 0.5, -1, 1),
    clamp(-agent.fitnessScore * 0.3, -1, 1),
    clamp(agent.winRate * 2 - 1, -1, 1),
  ];

  // 3. GAT: obtener mensaje agregado de vecinos
  const { aggregatedMsg, attentionWeights } = computeGATMessages(agent, brain, myProxyMotor);

  // 4. Enriquecer entrada sensorial con mensaje GAT
  //    Reducir dimensionalidad del mensaje (ATTENTION_DIM → NCP_SENSORY)
  //    tomando los primeros NCP_SENSORY elementos del mensaje
  const gatBoost = aggregatedMsg.slice(0, NCP_SENSORY).map(v => v * 0.3);
  const enrichedSensory = sensory.map((s, i) => s + (gatBoost[i] ?? 0));

  // 5. Adaptive dt: mercados volátiles = dt menor (más reactivo)
  const dt = clamp(1.0 / (1 + marketVolatility * 5), 0.1, 1.5);

  // 6. CfC forward pass
  const { motorOutput, newHidden, timeConstants } = runCfCForward(brain, enrichedSensory, dt);

  // 7. Actualizar hidden state
  brain.hiddenState = newHidden;
  saveBrain(agent.id, brain);

  // 8. Convertir motor output a señal de trading
  //    buy_strength - sell_strength = net signal
  //    hold_confidence modera la magnitud
  const [buyStrength, sellStrength, holdConf] = motorOutput;
  const holdMod = 1 - Math.abs(holdConf) * 0.4; // hold reduce la señal
  const rawSignal = (buyStrength - sellStrength) * holdMod;

  // 9. Aplicar filtros del genoma (risk tolerance, volatility filter)
  const n = Math.min(agent.lookbackPeriod, prices.length);
  const window = prices.slice(-n);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
  const std = Math.sqrt(variance);
  const relVol = std / (mean + 1e-8);

  let finalSignal = rawSignal;

  // Volatility filter: agentes cautelosos reducen señal en mercados caóticos
  if (relVol > agent.volatilityFilter * 0.05) {
    finalSignal *= (1 - agent.volatilityFilter * 0.3);
  }

  // Risk tolerance modulates position conviction
  finalSignal *= (0.5 + agent.riskTolerance * 0.5);

  // Momentum bias (gen heredado): ligeramente sesgar señal
  finalSignal += agent.momentumBias * 0.05;

  return {
    signal: clamp(finalSignal, -1, 1),
    attentionWeights,
    timeConstants,
  };
}

// ─── Population spawn ─────────────────────────────────────────────────────────
export function spawnInitialPopulation(count = 12) {
  for (let i = 0; i < count; i++) {
    const mathW = rand(0.1, 0.8);
    const physW = rand(0.1, 0.8 - mathW);
    const chemW = 1 - mathW - physW;
    const strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
    const id = generateId();

    storage.createAgent({
      id,
      name: generateName(1, i),
      generation: 1,
      status: "alive",
      parentIds: [],
      mathWeight: mathW,
      physicsWeight: physW,
      chemistryWeight: chemW,
      riskTolerance: rand(0.1, 0.9),
      lookbackPeriod: Math.floor(rand(5, 30)),
      entryThreshold: rand(0.005, 0.05),
      exitThreshold: rand(0.004, 0.04),
      positionSizing: rand(0.05, 0.25),
      momentumBias: rand(-1, 1),
      volatilityFilter: rand(0.2, 0.8),
      strategy,
      capital: 10000,
      initialCapital: 10000,
      neighbors: [],
    });

    // Inicializar cerebro CfC aleatorio
    const brain = initCfCBrain();
    agentBrains.set(id, brain);

    storage.addEvent({
      type: "birth",
      agentId: id,
      message: `${generateName(1, i)} nació — Estrategia: ${strategy} | CfC-NCP activo`,
      data: { strategy, generation: 1, brainType: "CfC+GAT+NCP" },
    });
  }

  buildDynamicGraph();
}

// ─── Run trading tick ─────────────────────────────────────────────────────────
export async function runTick() {
  const { price, volume, change24h } = await fetchOrSimulatePrice();
  priceHistory.push(price);
  if (priceHistory.length > 200) priceHistory = priceHistory.slice(-200);
  volumeHistory.push(volume);
  if (volumeHistory.length > 200) volumeHistory = volumeHistory.slice(-200);

  storage.addMarketTick(price, volume, change24h);

  // Calcular volatilidad del mercado para el dt adaptativo
  const recentPrices = priceHistory.slice(-20);
  const mktReturns = recentPrices.slice(1).map((p, i) => (p - recentPrices[i]) / recentPrices[i]);
  const mktMean = mktReturns.reduce((a, b) => a + b, 0) / (mktReturns.length || 1);
  const mktVar = mktReturns.reduce((a, b) => a + (b - mktMean) ** 2, 0) / (mktReturns.length || 1);
  const marketVolatility = Math.sqrt(mktVar) * 100; // en % de std

  const agents = storage.getAliveAgents();

  for (const agent of agents) {
    const { signal, attentionWeights, timeConstants } = computeSignalV2(agent, priceHistory, marketVolatility);

    let { capital, openPosition, openPositionPrice } = agent;
    let pnl = agent.pnl;
    let totalTrades = agent.totalTrades;

    if (!openPosition && Math.abs(signal) > agent.entryThreshold) {
      const direction = signal > 0 ? "long" : "short";
      const positionCapital = capital * agent.positionSizing;

      storage.updateAgent(agent.id, {
        openPosition: direction,
        openPositionPrice: price,
      });

      storage.addTrade({
        agentId: agent.id,
        type: direction === "long" ? "buy" : "sell",
        price,
        quantity: positionCapital / price,
        pnl: 0,
        rationale: `${agent.strategy}|CfC:τ=${timeConstants[0]?.toFixed(2) ?? "?"}|attn:${Object.keys(attentionWeights).length}`,
      });

      storage.addEvent({
        type: "trade",
        agentId: agent.id,
        message: `${agent.name} abre ${direction.toUpperCase()} @ $${price.toFixed(0)} | señal CfC: ${signal.toFixed(3)}`,
        data: { direction, signal: signal.toFixed(3), strategy: agent.strategy, attentionWeights },
      });

      openPosition = direction;
      openPositionPrice = price;
      totalTrades++;
    } else if (openPosition && openPositionPrice) {
      const priceChange = (price - openPositionPrice) / openPositionPrice;
      const tradePnl = openPosition === "long" ? priceChange : -priceChange;

      const shouldExit =
        Math.abs(signal) < agent.exitThreshold ||
        (openPosition === "long"  && signal < -agent.entryThreshold) ||
        (openPosition === "short" && signal > agent.entryThreshold)  ||
        tradePnl < -0.05;

      if (shouldExit) {
        const positionCapital = capital * agent.positionSizing;
        const tradePnlAmount = positionCapital * tradePnl;

        capital += tradePnlAmount;
        pnl += tradePnlAmount;
        totalTrades++;

        storage.addTrade({
          agentId: agent.id,
          type: openPosition === "long" ? "sell" : "buy",
          price,
          quantity: positionCapital / openPositionPrice,
          pnl: tradePnlAmount,
          rationale: agent.strategy,
        });

        storage.addEvent({
          type: "trade",
          agentId: agent.id,
          message: `${agent.name} cierra ${openPosition.toUpperCase()} @ $${price.toFixed(0)} | PnL: ${tradePnlAmount >= 0 ? "+" : ""}$${tradePnlAmount.toFixed(2)}`,
          data: { tradePnl: tradePnlAmount, strategy: agent.strategy },
        });

        openPosition = null;
        openPositionPrice = null;
      }
    }

    const allTrades = storage.getTradesByAgent(agent.id);
    const closedTrades = allTrades.filter(t => t.pnl !== 0);
    const wins = closedTrades.filter(t => t.pnl > 0).length;
    const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

    const pnlPercent = ((capital - agent.initialCapital) / agent.initialCapital) * 100;
    const maxDrawdown = Math.min(0, pnlPercent) / 100;

    const returns = closedTrades.map(t => t.pnl / (capital * agent.positionSizing));
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const returnStd = returns.length > 1
      ? Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length)
      : 0.001;
    const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(252) : 0;

    const fitnessScore = sharpeRatio * 0.5 + winRate * 0.3 + clamp(pnlPercent / 50, -1, 2) * 0.2;

    storage.updateAgent(agent.id, {
      capital,
      pnl,
      pnlPercent,
      maxDrawdown,
      winRate,
      totalTrades,
      openPosition: openPosition ?? null,
      openPositionPrice: openPositionPrice ?? null,
      sharpeRatio: clamp(sharpeRatio, -5, 5),
      fitnessScore,
    });

    if (capital < 6000 || pnlPercent < -40) {
      killAgent(agent.id, capital < 6000 ? "Ruina de capital" : "Drawdown fatal (>40%)");
    }
  }

  // ── SISTEMA CIRCULATORIO: latido del corazón ──────────────────────────────
  const allAliveForCirc = storage.getAliveAgents();
  const bloodPackets = heartbeat(
    allAliveForCirc.map(a => ({
      id: a.id, fitnessScore: a.fitnessScore, capital: a.capital,
      mathWeight: a.mathWeight, physicsWeight: a.physicsWeight,
      chemistryWeight: a.chemistryWeight, status: a.status,
      generation: a.generation, winRate: a.winRate,
    })),
    storage.getRecentTicks(1000).length,
    marketVolatility,
    price
  );

  // Procesar paquetes circulatorios y aplicar efectos
  const { effects } = processPackets(storage.getRecentTicks(1000).length);
  for (const eff of effects) {
    const ag = storage.getAgent(eff.agentId);
    if (!ag || ag.status !== "alive") continue;
    const newCap = Math.max(0, ag.capital + eff.capitalDelta);
    const newMath = Math.min(0.9, ag.mathWeight + eff.knowledgeDelta[0]);
    const newPhys = Math.min(0.9, ag.physicsWeight + eff.knowledgeDelta[1]);
    const newChem = Math.min(0.9, ag.chemistryWeight + eff.knowledgeDelta[2]);
    if (eff.capitalDelta !== 0 || eff.knowledgeDelta.some(k => k !== 0)) {
      storage.updateAgent(eff.agentId, {
        capital: newCap,
        mathWeight: newMath,
        physicsWeight: newPhys,
        chemistryWeight: newChem,
      });
    }
    updateAgentProfile(eff.agentId, ag.fitnessScore, newCap);
  }

  // ── SISTEMA RESPIRATORIO + ENTRENAMIENTO: cada 5 ticks ────────────────────
  const tickCount = storage.getRecentTicks(1000).length;
  if (tickCount % 5 === 0) {
    const airQuality = analyzeMarketAirQuality(priceHistory, marketVolatility, volume);
    const agentsForTraining = storage.getAliveAgents();
    for (const agent of agentsForTraining) {
      // Respiración
      const respProfile = breathe(
        agent.id, agent.fitnessScore, agent.capital,
        Math.abs(agent.maxDrawdown), agent.winRate, agent.totalTrades,
        agent.generation, airQuality, tickCount
      );

      // Entrenamiento adversarial (cada 10 ticks por agente)
      if (tickCount % 10 === 0) {
        const session = generateTrainingSession(
          agent.id, agent.mathWeight, agent.physicsWeight, agent.chemistryWeight,
          agent.fitnessScore, agent.generation, marketVolatility, tickCount
        );
        registerSession(session);

        // Los resultados del entrenamiento ajustan levemente los pesos del genoma
        const [mGain, pGain, cGain] = session.wisdomGain;
        const fitnessBoost = session.generalizationScore * respProfile.fitnessModifier * 0.001;
        storage.updateAgent(agent.id, {
          mathWeight: Math.min(0.9, agent.mathWeight + mGain * respProfile.signalSensitivity),
          physicsWeight: Math.min(0.9, agent.physicsWeight + pGain * respProfile.signalSensitivity),
          chemistryWeight: Math.min(0.9, agent.chemistryWeight + cGain * respProfile.signalSensitivity),
          fitnessScore: Math.min(2, agent.fitnessScore + fitnessBoost),
        });
      }
    }
  }

  // Actualizar topología dinámica cada 15 ticks
  if (tickCount > 0 && tickCount % 15 === 0) {
    buildDynamicGraph();
  }

  if (tickCount > 0 && tickCount % 30 === 0) {
    runSelectionCycle();
  }
}

// ─── Kill agent ───────────────────────────────────────────────────────────────
function killAgent(agentId: string, reason: string) {
  const agent = storage.getAgent(agentId);
  if (!agent) return;
  storage.updateAgent(agentId, {
    status: "dead",
    deathReason: reason,
    diedAt: new Date(),
    openPosition: null,
    openPositionPrice: null,
  });
  // Eliminar cerebro de la memoria
  agentBrains.delete(agentId);

  // SISTEMA CIRCULATORIO: retorno venoso — capital reciclado a los vivos
  const aliveForVein = storage.getAliveAgents();
  const veinPackets = venousReturn(
    agentId, agent.capital,
    aliveForVein.map(a => ({ id: a.id, fitnessScore: a.fitnessScore, capital: a.capital })),
    storage.getRecentTicks(1000).length
  );
  // Aplicar retorno venoso directamente
  for (const pkt of veinPackets) {
    const recv = storage.getAgent(pkt.destination);
    if (recv && recv.status === "alive") {
      storage.updateAgent(pkt.destination, {
        capital: recv.capital + (pkt.payload.capitalDelta ?? 0)
      });
    }
  }

  storage.addEvent({
    type: "death",
    agentId,
    message: `☠ ${agent.name} eliminado — ${reason} | PnL: ${agent.pnlPercent.toFixed(1)}% | 🩸 ${veinPackets.length} retornos venosos`,
    data: { reason, pnl: agent.pnl, fitness: agent.fitnessScore, venousReturn: veinPackets.length },
  });
  buildDynamicGraph();
}

// ─── Natural selection ────────────────────────────────────────────────────────
function runSelectionCycle() {
  const alive = storage.getAliveAgents();
  if (alive.length < 3) return;

  const sorted = [...alive].sort((a, b) => b.fitnessScore - a.fitnessScore);
  const currentGen = storage.getCurrentGeneration();
  const newGen = currentGen + 1;

  const reproducers = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25)));
  const losers = sorted
    .slice(-Math.max(1, Math.floor(sorted.length * 0.25)))
    .filter(a => a.fitnessScore < 0 || a.pnlPercent < -15);

  losers.forEach(agent => {
    killAgent(agent.id, "Eliminado por selección natural");
  });

  const numOffspring = Math.min(reproducers.length, 4);
  for (let i = 0; i < numOffspring; i++) {
    const parent1 = reproducers[i % reproducers.length];
    const parent2 = reproducers[(i + 1) % reproducers.length];
    if (parent1.id !== parent2.id) {
      spawnOffspring(parent1, parent2, newGen, i);
    }
  }

  const aliveAfter = storage.getAliveAgents();
  const bestAgent = aliveAfter.sort((a, b) => b.fitnessScore - a.fitnessScore)[0];

  storage.addGeneration({
    generation: newGen,
    agentsBorn: numOffspring,
    agentsDied: losers.length,
    agentsAlive: aliveAfter.length,
    bestFitness: bestAgent?.fitnessScore ?? 0,
    avgFitness: aliveAfter.reduce((s, a) => s + a.fitnessScore, 0) / (aliveAfter.length || 1),
    bestAgentId: bestAgent?.id,
    dominantStrategy: getMostCommonStrategy(aliveAfter),
  });

  storage.addEvent({
    type: "generation",
    message: `⚡ Generación ${newGen}: ${numOffspring} nacimientos, ${losers.length} muertes, ${aliveAfter.length} vivos | CfC+GAT evolucionan`,
    data: { generation: newGen, bestFitness: bestAgent?.fitnessScore?.toFixed(3) },
  });

  buildDynamicGraph();
}

// ─── Reproduce offspring ──────────────────────────────────────────────────────
function spawnOffspring(parent1: Agent, parent2: Agent, generation: number, index: number) {
  const mutation = 0.1;
  const mutate = (val: number, min: number, max: number) =>
    clamp(val + rand(-mutation, mutation), min, max);
  const crossover = (a: number, b: number) => Math.random() < 0.5 ? a : b;

  let strategy = parent1.fitnessScore >= parent2.fitnessScore ? parent1.strategy : parent2.strategy;
  if (Math.random() < 0.15) {
    strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
  }

  const mathW = mutate(crossover(parent1.mathWeight, parent2.mathWeight), 0.05, 0.9);
  const physW = mutate(crossover(parent1.physicsWeight, parent2.physicsWeight), 0.05, 0.9 - mathW);
  const chemW = 1 - mathW - physW;

  const id = generateId();
  const name = generateName(generation, index + Math.floor(Math.random() * 10));

  storage.createAgent({
    id,
    name,
    generation,
    status: "alive",
    parentIds: [parent1.id, parent2.id],
    mathWeight: mathW,
    physicsWeight: physW,
    chemistryWeight: clamp(chemW, 0.05, 0.9),
    riskTolerance: mutate(crossover(parent1.riskTolerance, parent2.riskTolerance), 0.05, 0.95),
    lookbackPeriod: Math.floor(mutate(crossover(parent1.lookbackPeriod, parent2.lookbackPeriod), 3, 40)),
    entryThreshold: mutate(crossover(parent1.entryThreshold, parent2.entryThreshold), 0.002, 0.1),
    exitThreshold: mutate(crossover(parent1.exitThreshold, parent2.exitThreshold), 0.001, 0.08),
    positionSizing: mutate(crossover(parent1.positionSizing, parent2.positionSizing), 0.03, 0.3),
    momentumBias: mutate(crossover(parent1.momentumBias, parent2.momentumBias), -1, 1),
    volatilityFilter: mutate(crossover(parent1.volatilityFilter, parent2.volatilityFilter), 0.1, 0.9),
    strategy,
    capital: 10000,
    initialCapital: 10000,
    neighbors: [],
  });

  // Crossover de los cerebros CfC de los padres
  const brain1 = agentBrains.get(parent1.id) ?? initCfCBrain();
  const brain2 = agentBrains.get(parent2.id) ?? initCfCBrain();
  const childBrain = crossoverBrains(brain1, brain2, mutation);
  agentBrains.set(id, childBrain);

  storage.addEvent({
    type: "birth",
    agentId: id,
    message: `🧬 ${name} nació de ${parent1.name} × ${parent2.name} — Estrategia: ${strategy} | CfC heredado`,
    data: { strategy, generation, parents: [parent1.name, parent2.name], brainType: "CfC+GAT+NCP" },
  });
}

function getMostCommonStrategy(agents: Agent[]): string {
  const count: Record<string, number> = {};
  agents.forEach(a => { count[a.strategy] = (count[a.strategy] || 0) + 1; });
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
}

// ─── Simulation loop ──────────────────────────────────────────────────────────
let tickInterval: NodeJS.Timeout | null = null;

export function startSimulation() {
  if (tickInterval) return;
  spawnInitialPopulation(12);

  tickInterval = setInterval(async () => {
    try {
      await runTick();
    } catch (err) {
      console.error("Tick error:", err);
    }
    const alive = storage.getAliveAgents();
    if (alive.length < 4) {
      const gen = storage.getCurrentGeneration() + 1;
      for (let i = 0; i < 6; i++) {
        const strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
        const id = generateId();
        storage.createAgent({
          id, name: generateName(gen, i + 20), generation: gen, status: "alive",
          parentIds: [], strategy,
          mathWeight: rand(0.1, 0.8), physicsWeight: rand(0.1, 0.5), chemistryWeight: rand(0.1, 0.5),
          riskTolerance: rand(0.1, 0.9), lookbackPeriod: Math.floor(rand(5, 30)),
          entryThreshold: rand(0.005, 0.05), exitThreshold: rand(0.004, 0.04),
          positionSizing: rand(0.05, 0.25), momentumBias: rand(-1, 1), volatilityFilter: rand(0.2, 0.8),
          capital: 10000, initialCapital: 10000, neighbors: [],
        });
        agentBrains.set(id, initCfCBrain());
      }
      buildDynamicGraph();
    }
  }, 2000);
}

export function stopSimulation() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function isRunning(): boolean {
  return tickInterval !== null;
}

export function resetSimulation() {
  stopSimulation();
  agentBrains.clear();
}
