/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SISTEMA DIGESTIVO — Memoria Episódica, Consolidación y Olvido Selectivo
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  METÁFORA BIOLÓGICA:
 *    - Boca/Estómago = captura de experiencias brutas (episodios de trading)
 *    - Intestino delgado = digestión/compresión semántica (embedding)
 *    - Intestino grueso = consolidación (qué guardar en memoria a largo plazo)
 *    - Hígado = metabolismo de conocimiento (detox de señales engañosas)
 *    - Riñones = excreción (olvido selectivo de lo inútil)
 *
 *  INSPIRADO EN:
 *    - EMU (Efficient episodic Memory Utilization, MARL 2024) — arXiv 2403.01112
 *      encoder/decoder semántico + episodic incentive reward
 *    - EWC (Elastic Weight Consolidation, DeepMind 2017)
 *      protege pesos importantes al aprender nuevas tareas
 *    - Replay buffer (DQN, Mnih 2015) — rehearsal de experiencias pasadas
 *    - Selective Forgetting Survey (ACM 2026) — principios de diseño
 *    - ACAN (Cross-Attention Memory, Frontiers 2025) — atención dinámica
 *
 *  FRACASOS QUE PREVIENE:
 *    ❌ Olvido catastrófico: pesos CfC sobreescritos al adaptarse a nuevo régimen
 *    ❌ Agentes que "aprenden" señales espurias y no pueden olvidarlas
 *    ❌ Memoria infinita que consume RAM (buffer circular con política de expulsión)
 *    ❌ Episodios raros pero críticos perdidos (importance sampling)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface Episode {
  id: string;
  agentId: string;
  timestamp: number;
  // Contexto de mercado al momento del episodio
  marketState: {
    price: number;
    volatility: number;
    trend: number;       // -1 a 1 (bearish a bullish)
    regime: string;      // régimen respiratorio dominante
    volume: number;
  };
  // Acción tomada y resultado
  action: "buy" | "sell" | "hold";
  signal: number;        // señal CfC que generó la acción
  outcome: number;       // PnL normalizado del trade resultante (-1 a 1)
  reward: number;        // recompensa RL (outcome × riesgo ajustado)
  // Embedding semántico del episodio (digestión)
  embedding: number[];   // vector 16-dim comprimido
  // Importancia del episodio (para importance sampling)
  importance: number;    // 0-1 (calculado como |reward| × novedad)
  // Metadatos de consolidación
  accessCount: number;   // cuántas veces fue "recordado"
  lastAccessed: number;  // timestamp del último acceso
  consolidated: boolean; // si pasó a memoria a largo plazo
}

export interface MemoryStats {
  totalEpisodes: number;
  consolidatedEpisodes: number;
  forgottenEpisodes: number;
  avgImportance: number;
  topRewards: number[];
  memoryPressure: number;     // 0-1 (qué tan llena está la memoria)
  consolidationRate: number;  // episodios consolidados / total
  ewcOmegaAvg: number;        // promedio de Fisher Information (peso de protección)
}

// Fisher Information matrix (EWC) — qué tan importante es cada peso del CfC
export interface EWCProtection {
  agentId: string;
  // Omega (Ω) para cada capa del CfC: valor alto = peso crítico, no tocar
  omegaW_f: number[][];   // misma forma que W_f
  omegaW_tau: number[][]; // misma forma que W_tau
  referenceW_f: number[][];   // pesos de referencia (antes de nuevo aprendizaje)
  referenceW_tau: number[][]; // pesos de referencia
  lastUpdated: number;
}

// ─── Estado global ─────────────────────────────────────────────────────────────

// Buffer episódico por agente (máximo MAX_EPISODES por agente)
const MAX_EPISODES_PER_AGENT = 200;
const MAX_LONG_TERM_MEMORY = 50;    // episodios consolidados en LTM
const CONSOLIDATION_THRESHOLD = 0.6; // importancia mínima para consolidar
const FORGETTING_THRESHOLD = 0.15;   // importancia bajo la cual se olvida
const EMBEDDING_DIM = 16;

const episodeBuffers = new Map<string, Episode[]>();        // STM por agente
const longTermMemory = new Map<string, Episode[]>();        // LTM por agente
const ewcProtections = new Map<string, EWCProtection>();    // EWC por agente

let totalForgotten = 0;
let totalConsolidated = 0;

// ─── Funciones core ────────────────────────────────────────────────────────────

/**
 * INGESTA: Crea un nuevo episodio desde una experiencia de trading.
 * Equivale a "comer" (boca → estómago).
 */
export function ingestEpisode(
  agentId: string,
  marketState: Episode["marketState"],
  action: Episode["action"],
  signal: number,
  outcome: number // PnL normalizado
): Episode {
  // Calcular recompensa ajustada por riesgo (similar a Sharpe instantáneo)
  const riskFactor = Math.max(0.1, marketState.volatility);
  const reward = outcome / riskFactor;

  // Generar embedding semántico (digestión: compresión de la experiencia)
  const embedding = digestToEmbedding(marketState, action, signal, outcome);

  // Calcular importancia: episodios raros Y con alto reward son más importantes
  const novelty = computeNovelty(agentId, embedding);
  const importance = Math.min(1, (Math.abs(reward) * 0.6 + novelty * 0.4));

  const episode: Episode = {
    id: `ep_${agentId.slice(0, 6)}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    agentId,
    timestamp: Date.now(),
    marketState,
    action,
    signal,
    outcome,
    reward,
    embedding,
    importance,
    accessCount: 0,
    lastAccessed: Date.now(),
    consolidated: false,
  };

  // Añadir al buffer de corto plazo
  const buffer = episodeBuffers.get(agentId) ?? [];
  buffer.push(episode);

  // Si el buffer está lleno, aplicar política de expulsión (olvido selectivo)
  if (buffer.length > MAX_EPISODES_PER_AGENT) {
    selectiveForgetting(agentId, buffer);
  }

  episodeBuffers.set(agentId, buffer);
  return episode;
}

/**
 * DIGESTIÓN: Comprime la experiencia en un embedding semántico 16-dim.
 * Intestino delgado — extrae los nutrientes esenciales.
 * Sin LLM: usa features del mercado + acción codificada.
 */
function digestToEmbedding(
  state: Episode["marketState"],
  action: Episode["action"],
  signal: number,
  outcome: number
): number[] {
  const actionCode = action === "buy" ? 1 : action === "sell" ? -1 : 0;
  const regimeCode = hashRegime(state.regime);

  // 16 dimensiones semánticas
  return [
    Math.tanh(state.price / 100000),          // nivel de precio normalizado
    Math.tanh(state.volatility * 10),          // volatilidad
    Math.tanh(state.trend),                    // tendencia
    Math.tanh(state.volume / 1e9),             // volumen
    actionCode * 0.5,                          // acción
    Math.tanh(signal),                         // señal CfC
    Math.tanh(outcome * 5),                    // resultado
    regimeCode,                                // régimen respiratorio
    Math.tanh(state.price * state.volatility / 1e6), // interacción precio-vol
    Math.tanh(signal * state.trend),           // alineación señal-tendencia
    Math.tanh(outcome * state.volatility * 10), // riesgo realizado
    actionCode * Math.sign(signal) * 0.5,      // consistencia acción-señal
    Math.tanh(Math.abs(signal) * 5),           // confianza de la señal
    Math.tanh(state.volume * state.volatility / 1e10), // presión de volumen
    outcome > 0 ? Math.tanh(outcome * 3) : 0, // ganancia positiva
    outcome < 0 ? Math.tanh(-outcome * 3) : 0, // pérdida
  ];
}

function hashRegime(regime: string): number {
  const regimes: Record<string, number> = {
    eupnea: 0, tachypnea: 0.25, bradypnea: -0.25, hyperpnea: 0.5,
    apnea: -0.5, dyspnea: -0.75, hypoxia: -1, hyperventilation: 0.75,
  };
  return regimes[regime] ?? 0;
}

/**
 * NOVEDAD: Qué tan diferente es este episodio de los ya almacenados.
 * Usa distancia coseno promedio vs el buffer existente.
 * Episodios muy similares a los ya vistos tienen baja novedad.
 */
function computeNovelty(agentId: string, embedding: number[]): number {
  const buffer = episodeBuffers.get(agentId) ?? [];
  if (buffer.length === 0) return 1.0; // primera experiencia, máxima novedad

  // Comparar con una muestra aleatoria del buffer (eficiencia O(1) amortizado)
  const sampleSize = Math.min(20, buffer.length);
  const sample = buffer
    .slice(-sampleSize)
    .map(ep => cosineSimilarity(embedding, ep.embedding));

  const avgSimilarity = sample.reduce((a, b) => a + b, 0) / sample.length;
  return 1 - avgSimilarity; // 0 = muy similar (baja novedad), 1 = muy diferente
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return normA > 0 && normB > 0 ? dot / (normA * normB) : 0;
}

/**
 * OLVIDO SELECTIVO: Elimina episodios de baja importancia del STM.
 * Intestino grueso + Riñones — desecha lo que no aporta.
 *
 * Política de expulsión:
 *   1. Primero olvida episodios con importancia < FORGETTING_THRESHOLD
 *   2. Luego olvida los más antiguos que no hayan sido consolidados
 *   3. Siempre preserva los últimos 10 (memoria de trabajo)
 *   4. Siempre preserva los top-5 por reward (mejores experiencias)
 */
function selectiveForgetting(agentId: string, buffer: Episode[]): void {
  const ltm = longTermMemory.get(agentId) ?? [];

  // Paso 1: Consolidar episodios importantes antes de olvidar
  const toConsolidate = buffer.filter(
    ep => !ep.consolidated && ep.importance >= CONSOLIDATION_THRESHOLD
  );
  for (const ep of toConsolidate) {
    ep.consolidated = true;
    ltm.push(ep);
    totalConsolidated++;
  }
  // LTM también tiene límite — expulsa por FIFO los menos importantes
  if (ltm.length > MAX_LONG_TERM_MEMORY) {
    ltm.sort((a, b) => b.importance - a.importance);
    ltm.splice(MAX_LONG_TERM_MEMORY);
  }
  longTermMemory.set(agentId, ltm);

  // Paso 2: Identificar qué olvidar del STM
  const recentWindow = buffer.slice(-10);         // últimos 10: intocables
  const topRewards = [...buffer]
    .sort((a, b) => Math.abs(b.reward) - Math.abs(a.reward))
    .slice(0, 5);                                  // top-5 por reward: intocables
  const protected_ = new Set([
    ...recentWindow.map(e => e.id),
    ...topRewards.map(e => e.id),
  ]);

  // Candidatos a olvido: baja importancia y no protegidos
  const candidates = buffer.filter(
    ep => !protected_.has(ep.id) && ep.importance < FORGETTING_THRESHOLD
  );

  // Ordenar por importancia ASC y olvidar el 30% menos importante
  candidates.sort((a, b) => a.importance - b.importance);
  const toForget = candidates.slice(0, Math.ceil(buffer.length * 0.3));
  const forgetSet = new Set(toForget.map(e => e.id));

  // Eliminar del buffer
  const kept = buffer.filter(ep => !forgetSet.has(ep.id));
  buffer.splice(0, buffer.length, ...kept);
  totalForgotten += toForget.length;
}

/**
 * CONSOLIDACIÓN NOCTURNA: Proceso de sleep (análogo a la consolidación
 * hipocampo → corteza durante el sueño).
 * Se llama cada N ticks para "rumiar" las experiencias recientes.
 *
 * Extrae patrones del buffer y actualiza las estadísticas de EWC
 * para proteger los pesos del CfC que generaron buenos outcomes.
 */
export function consolidateMemory(
  agentId: string,
  brainW_f: number[][],
  brainW_tau: number[][],
  currentFitness: number
): void {
  const buffer = episodeBuffers.get(agentId) ?? [];
  if (buffer.length < 5) return;

  // Solo consolidar si hay episodios nuevos de alta importancia
  const importantNew = buffer.filter(
    ep => !ep.consolidated && ep.importance >= CONSOLIDATION_THRESHOLD
  );
  if (importantNew.length === 0) return;

  // Calcular Fisher Information (aproximación diagonal de EWC)
  // Ω_i ∝ (∂log P(episode|weights) / ∂w_i)² — estimado como varianza del gradiente
  const omegaW_f = brainW_f.map(row =>
    row.map(() => 0)
  );
  const omegaW_tau = brainW_tau.map(row =>
    row.map(() => 0)
  );

  // Acumular Fisher scores de los episodios importantes
  for (const ep of importantNew) {
    const weight = ep.importance * Math.abs(ep.reward);
    // Heurística: episodios con señal fuerte en dominio específico
    // protegen las columnas correspondientes de W_f
    for (let row = 0; row < omegaW_f.length; row++) {
      for (let col = 0; col < omegaW_f[row].length; col++) {
        // El gradient squared es aproximado por la magnitud de la señal × importancia
        const gradApprox = Math.abs(ep.signal) * weight;
        omegaW_f[row][col] = (omegaW_f[row][col] + gradApprox) / 2;
        omegaW_tau[row][col] = (omegaW_tau[row][col] + gradApprox * 0.5) / 2;
      }
    }
    ep.consolidated = true;
    totalConsolidated++;
  }

  // Normalizar omega a [0, 1]
  const normalizeMatrix = (m: number[][]) => {
    const flat = m.flatMap(r => r);
    const maxV = Math.max(...flat, 0.001);
    return m.map(r => r.map(v => v / maxV));
  };

  const ewc: EWCProtection = {
    agentId,
    omegaW_f: normalizeMatrix(omegaW_f),
    omegaW_tau: normalizeMatrix(omegaW_tau),
    referenceW_f: brainW_f.map(r => [...r]), // snapshot actual
    referenceW_tau: brainW_tau.map(r => [...r]),
    lastUpdated: Date.now(),
  };

  ewcProtections.set(agentId, ewc);
}

/**
 * EWC PENALTY: Aplica la penalización EWC a una actualización de pesos.
 * Uso: llamar DESPUÉS de cada Hebbian update en evolutionEngine.
 *
 * Δw_i_penalizado = Δw_i - λ × Ω_i × (w_i - w*_i)
 * donde w*_i es el peso de referencia (antes del nuevo aprendizaje)
 *
 * Esto PRESERVA los pesos importantes mientras permite adaptación en los no críticos.
 */
export function applyEWCProtection(
  agentId: string,
  newW_f: number[][],
  lambda: number = 0.4 // regularización: 0 = sin protección, 1 = máxima protección
): number[][] {
  const ewc = ewcProtections.get(agentId);
  if (!ewc) return newW_f; // sin historial, sin protección

  return newW_f.map((row, i) =>
    row.map((w, j) => {
      const omega = ewc.omegaW_f[i]?.[j] ?? 0;
      const wRef = ewc.referenceW_f[i]?.[j] ?? w;
      // Penalizar el alejamiento de pesos importantes
      const penalty = lambda * omega * (w - wRef);
      return w - penalty;
    })
  );
}

/**
 * RECALL EPISÓDICO: Recupera los episodios más relevantes para el contexto actual.
 * Usa cosine similarity del embedding actual vs buffer (ACAN-inspired).
 *
 * Devuelve hasta K episodios ordenados por relevancia × importancia.
 * Se usa para dar contexto histórico al agente antes de una decisión.
 */
export function recallRelevantEpisodes(
  agentId: string,
  currentEmbedding: number[],
  k: number = 5
): Episode[] {
  const stm = episodeBuffers.get(agentId) ?? [];
  const ltm = longTermMemory.get(agentId) ?? [];
  const all = [...stm, ...ltm];

  if (all.length === 0) return [];

  // Calcular relevancia: similaridad coseno × importancia
  const scored = all.map(ep => ({
    ep,
    score: cosineSimilarity(currentEmbedding, ep.embedding) * ep.importance,
  }));

  // Ordenar por score DESC, tomar top K
  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, k).map(s => s.ep);

  // Actualizar contadores de acceso
  topK.forEach(ep => {
    ep.accessCount++;
    ep.lastAccessed = Date.now();
    // Episodios frecuentemente accedidos ganan importancia (reconsolidation)
    ep.importance = Math.min(1, ep.importance + 0.02);
  });

  return topK;
}

/**
 * EPISODIC INCENTIVE: Bonus de recompensa basado en qué tan
 * "deseable" es el estado actual comparado con el historial.
 * Inspirado en EMU (MARL 2024): incentivar transiciones deseables.
 *
 * Returns: bonus [−0.2, +0.2] para añadir al fitness del agente
 */
export function computeEpisodicIncentive(
  agentId: string,
  currentEmbedding: number[],
  currentOutcome: number
): number {
  const episodes = episodeBuffers.get(agentId) ?? [];
  if (episodes.length < 10) return 0;

  // Encontrar episodios similares al contexto actual
  const similar = episodes
    .filter(ep => cosineSimilarity(currentEmbedding, ep.embedding) > 0.7)
    .sort((a, b) => b.reward - a.reward);

  if (similar.length === 0) return 0;

  // Bonus si el outcome actual es mejor que el histórico en contextos similares
  const historicalAvg = similar.slice(0, 5).reduce((s, ep) => s + ep.reward, 0) / similar.length;
  const improvement = currentOutcome - historicalAvg;

  // Escalar a [-0.2, +0.2]
  return Math.tanh(improvement * 2) * 0.2;
}

/**
 * TRANSFERENCIA INTER-AGENTE: Al morir un agente, sus mejores episodios
 * pueden "heredarse" por los descendientes (memoria genética).
 */
export function inheritEpisodes(
  parentId: string,
  childId: string,
  inheritRatio: number = 0.3 // fracción de episodios del padre a heredar
): void {
  const parentLTM = longTermMemory.get(parentId) ?? [];
  const parentSTM = episodeBuffers.get(parentId) ?? [];

  const parentBest = [...parentLTM, ...parentSTM]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, Math.floor(MAX_EPISODES_PER_AGENT * inheritRatio));

  // Clonar episodios con agentId del hijo (experiencia heredada, no vivida)
  const inherited = parentBest.map(ep => ({
    ...ep,
    id: `inherited_${ep.id}`,
    agentId: childId,
    importance: ep.importance * 0.7, // heredado vale menos que vivido
    accessCount: 0,
    lastAccessed: Date.now(),
    consolidated: false,
  }));

  const childBuffer = episodeBuffers.get(childId) ?? [];
  childBuffer.push(...inherited);
  episodeBuffers.set(childId, childBuffer);
}

/**
 * Limpia la memoria de un agente muerto (después de herencia).
 */
export function clearAgentMemory(agentId: string, afterDelay: number = 5000): void {
  setTimeout(() => {
    episodeBuffers.delete(agentId);
    // LTM se preserva para posible consulta forense/herencia
    ewcProtections.delete(agentId);
  }, afterDelay);
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getDigestiveStats(): MemoryStats {
  let totalEp = 0;
  let totalImp = 0;
  let allRewards: number[] = [];

  episodeBuffers.forEach(buffer => {
    totalEp += buffer.length;
    buffer.forEach(ep => {
      totalImp += ep.importance;
      allRewards.push(ep.reward);
    });
  });

  longTermMemory.forEach(ltm => {
    totalEp += ltm.length;
    ltm.forEach(ep => {
      totalImp += ep.importance;
    });
  });

  const totalAgents = episodeBuffers.size + longTermMemory.size;

  // EWC omega promedio
  let omegaSum = 0;
  let omegaCount = 0;
  ewcProtections.forEach(ewc => {
    ewc.omegaW_f.forEach(row => row.forEach(v => { omegaSum += v; omegaCount++; }));
  });

  return {
    totalEpisodes: totalEp,
    consolidatedEpisodes: totalConsolidated,
    forgottenEpisodes: totalForgotten,
    avgImportance: totalEp > 0 ? totalImp / totalEp : 0,
    topRewards: allRewards.sort((a, b) => b - a).slice(0, 5),
    memoryPressure: Math.min(1, totalEp / (totalAgents * MAX_EPISODES_PER_AGENT + 1)),
    consolidationRate: totalEp > 0 ? totalConsolidated / (totalConsolidated + totalForgotten + 1) : 0,
    ewcOmegaAvg: omegaCount > 0 ? omegaSum / omegaCount : 0,
  };
}

export function getAgentMemory(agentId: string): { stm: Episode[]; ltm: Episode[] } {
  return {
    stm: episodeBuffers.get(agentId) ?? [],
    ltm: longTermMemory.get(agentId) ?? [],
  };
}

// ─── Persistence hooks ─────────────────────────────────────────────────────────

/**
 * Extrae todo el estado del sistema digestivo para checkpoint.
 */
export function extractDigestiveState(): {
  episodeBuffers: Record<string, any[]>;
  longTermMemory: Record<string, any[]>;
  ewcProtections: Record<string, any>;
  totalForgotten: number;
  totalConsolidated: number;
} {
  const bufObj: Record<string, any[]> = {};
  episodeBuffers.forEach((v, k) => { bufObj[k] = v; });

  const ltmObj: Record<string, any[]> = {};
  longTermMemory.forEach((v, k) => { ltmObj[k] = v; });

  const ewcObj: Record<string, any> = {};
  ewcProtections.forEach((v, k) => { ewcObj[k] = v; });

  return {
    episodeBuffers: bufObj,
    longTermMemory: ltmObj,
    ewcProtections: ewcObj,
    totalForgotten,
    totalConsolidated,
  };
}

/**
 * Restaura el estado del sistema digestivo desde un checkpoint.
 */
export function restoreDigestiveState(data: {
  episodeBuffers?: Record<string, any[]>;
  longTermMemory?: Record<string, any[]>;
  ewcProtections?: Record<string, any>;
  totalForgotten?: number;
  totalConsolidated?: number;
}): void {
  if (data.episodeBuffers) {
    episodeBuffers.clear();
    Object.entries(data.episodeBuffers).forEach(([k, v]) => {
      episodeBuffers.set(k, v);
    });
  }
  if (data.longTermMemory) {
    longTermMemory.clear();
    Object.entries(data.longTermMemory).forEach(([k, v]) => {
      longTermMemory.set(k, v);
    });
  }
  if (data.ewcProtections) {
    ewcProtections.clear();
    Object.entries(data.ewcProtections).forEach(([k, v]) => {
      ewcProtections.set(k, v);
    });
  }
  if (data.totalForgotten !== undefined) totalForgotten = data.totalForgotten;
  if (data.totalConsolidated !== undefined) totalConsolidated = data.totalConsolidated;

  const agentCount = Object.keys(data.episodeBuffers ?? {}).length;
  const epCount = Object.values(data.episodeBuffers ?? {}).reduce((s, v) => s + v.length, 0);
  console.log(`[Digestive] Restaurado: ${agentCount} agentes, ${epCount} episodios STM`);
}
