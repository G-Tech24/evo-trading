/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SISTEMA RESPIRATORIO — Oxigenación y Gestión del Estrés Extremo
 *
 *  ANALOGÍA BIOLÓGICA:
 *  - Pulmones     = Interfaz con el mercado (captura volatilidad como O₂)
 *  - Alvéolos     = Puntos de contacto con el precio BTC (microintercambios)
 *  - Diafragma    = Ritmo de decisiones (velocidad de toma de decisiones)
 *  - Hemoglobina  = Capacidad de capturar señales (afinidad de señal)
 *  - CO₂          = Trades tóxicos acumulados (posiciones perdedoras)
 *  - O₂           = Oportunidades de mercado capturadas
 *  - Hipoxia      = Mercado sin señal (flat/choppy market) → parálisis
 *  - Hiperventilación = Over-trading (demasiadas operaciones = agotamiento)
 *  - Apnea        = Período de hold forzado (espera del momento)
 *  - Asfixia      = Drawdown máximo → muerte inminente
 *
 *  TRABAJO BAJO ESTRÉS EXTREMO:
 *  Como atletas de alto rendimiento, los agentes aprenden a optimizar
 *  su consumo de O₂ (señales) y eliminación de CO₂ (pérdidas).
 *  Los agentes entrenados bajo estrés máximo desarrollan "capacidad pulmonar"
 *  superior (mayor tolerancia a volatilidad sin paralizarse).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface RespiratoryState {
  breathingRate: number;          // ciclos por minuto (equiv. trades/tiempo)
  oxygenLevel: number;            // 0-1 (O₂ disponible = calidad de señal)
  co2Level: number;               // 0-1 (CO₂ acumulado = toxicidad de cartera)
  lungCapacity: number;           // 0-1 (capacidad total = experiencia del agente)
  tidalVolume: number;            // 0-1 (volumen por respiración = tamaño posición)
  respiratoryQuotient: number;    // O₂_consumido / CO₂_producido (eficiencia)
  regime: BreathingRegime;
  stressResponse: StressResponse;
  hypoxiaEvents: number;          // conteo de eventos de baja señal
  hyperventilationEvents: number; // conteo de sobreoperar
  apneaTime: number;              // ticks en apnea
  totalO2Consumed: number;
  totalCO2Expelled: number;
  lastBreath: number;             // tick del último ciclo
}

export type BreathingRegime =
  | "eupnea"         // normal: mercado estable, ritmo óptimo
  | "tachypnea"      // rápido: volatilidad alta → detección acelerada
  | "bradypnea"      // lento: mercado flat → hold forzado
  | "hyperpnea"      // profundo: oportunidad grande detectada
  | "apnea"          // pausa: espera el momento exacto
  | "dyspnea"        // dificultad: drawdown severo → función deteriorada
  | "hypoxia"        // privación: señal insuficiente → búsqueda activa
  | "hyperventilation"; // sobreoperar: too many trades → agotamiento

export interface StressResponse {
  type: "calm" | "acute_stress" | "chronic_stress" | "exhaustion" | "recovery";
  cortisol: number;    // 0-1 (hormona del estrés)
  adrenaline: number;  // 0-1 (respuesta inmediata)
  dopamine: number;    // 0-1 (recompensa por trade exitoso)
  serotonin: number;   // 0-1 (estabilidad del estado de ánimo)
  norepinephrine: number; // 0-1 (concentración / enfoque)
}

export interface AgentRespiratoryProfile {
  agentId: string;
  state: RespiratoryState;
  fitnessModifier: number;    // modificador aplicado al fitness por estado resp.
  decisionSpeed: number;      // factor de velocidad de decisión
  signalSensitivity: number;  // capacidad de capturar señales débiles
  noiseResistance: number;    // resistencia a ruido del mercado
  stressCapacity: number;     // "VO₂ max" del agente (capacidad máx bajo estrés)
}

export interface MarketAirQuality {
  o2Concentration: number;    // calidad de la oportunidad (señal/ruido)
  co2Concentration: number;   // contaminación por volatilidad tóxica
  humidity: number;           // liquidez del mercado (0=seco=ilíquido)
  airPressure: number;        // presión del mercado (tendencia dominante)
  particulateMatter: number;  // ruido de alta frecuencia (HFT noise)
  toxicGases: number;         // eventos de cisne negro (flash crash, etc.)
}

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────

const agentRespiratoryProfiles = new Map<string, AgentRespiratoryProfile>();

function createDefaultRespiratoryState(tick: number): RespiratoryState {
  return {
    breathingRate: 15,       // 15 respiraciones/min = ritmo normal
    oxygenLevel: 0.95,
    co2Level: 0.05,
    lungCapacity: 0.5,
    tidalVolume: 0.4,
    respiratoryQuotient: 0.85,
    regime: "eupnea",
    stressResponse: {
      type: "calm",
      cortisol: 0.2,
      adrenaline: 0.1,
      dopamine: 0.5,
      serotonin: 0.7,
      norepinephrine: 0.4,
    },
    hypoxiaEvents: 0,
    hyperventilationEvents: 0,
    apneaTime: 0,
    totalO2Consumed: 0,
    totalCO2Expelled: 0,
    lastBreath: tick,
  };
}

// ─── CALIDAD DEL AIRE (ANÁLISIS DE MERCADO) ───────────────────────────────────

export function analyzeMarketAirQuality(
  priceHistory: number[],
  currentVolatility: number,
  volume: number
): MarketAirQuality {
  if (priceHistory.length < 5) {
    return { o2Concentration: 0.5, co2Concentration: 0.3, humidity: 0.5, airPressure: 0, particulateMatter: 0.2, toxicGases: 0 };
  }

  const recent = priceHistory.slice(-20);
  const returns = recent.slice(1).map((p, i) => (p - recent[i]) / recent[i]);

  // O₂ = señal clara (tendencia o reversión definida, no ruido)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const signalToNoise = Math.abs(mean) / (Math.sqrt(variance) + 1e-10);
  const o2Concentration = Math.min(1, signalToNoise * 10);

  // CO₂ = volatilidad tóxica (saltos bruscos, reversiones rápidas)
  const maxDrawdown = Math.max(0, ...returns.map(r => Math.abs(r)));
  const co2Concentration = Math.min(1, currentVolatility * 15 + maxDrawdown * 5);

  // Humedad = liquidez (volumen normalizado)
  const humidity = Math.min(1, volume / 1e8);

  // Presión = sesgo de tendencia (positivo = alcista)
  const airPressure = Math.tanh(mean * 100);

  // Material particulado = ruido HFT (varianza de varianza)
  const variances = [];
  for (let i = 0; i < returns.length - 3; i++) {
    const w = returns.slice(i, i + 3);
    const wVar = w.reduce((s, r) => s + r ** 2, 0) / 3;
    variances.push(wVar);
  }
  const metaVariance = variances.length > 0
    ? variances.reduce((a, b) => a + b, 0) / variances.length
    : 0;
  const particulateMatter = Math.min(1, metaVariance * 1000);

  // Gases tóxicos = detección de cisne negro (retorno > 4σ)
  const sigmaLevel = Math.sqrt(variance);
  const extremeReturns = returns.filter(r => Math.abs(r) > 4 * sigmaLevel).length;
  const toxicGases = Math.min(1, extremeReturns / returns.length * 5);

  return { o2Concentration, co2Concentration, humidity, airPressure, particulateMatter, toxicGases };
}

// ─── RESPIRACIÓN DEL AGENTE ────────────────────────────────────────────────

export function breathe(
  agentId: string,
  fitnessScore: number,
  capital: number,
  maxDrawdown: number,
  winRate: number,
  totalTrades: number,
  generation: number,
  airQuality: MarketAirQuality,
  currentTick: number
): AgentRespiratoryProfile {
  if (!agentRespiratoryProfiles.has(agentId)) {
    agentRespiratoryProfiles.set(agentId, {
      agentId,
      state: createDefaultRespiratoryState(currentTick),
      fitnessModifier: 1.0,
      decisionSpeed: 1.0,
      signalSensitivity: 0.5,
      noiseResistance: 0.5,
      stressCapacity: 0.5 + generation * 0.05,
    });
  }

  const profile = agentRespiratoryProfiles.get(agentId)!;
  const state = profile.state;

  // ── CICLO INSPIRATORIO (captura de O₂) ─────────────────────────────────────
  // O₂ inspirado = calidad de señal × capacidad pulmonar
  const o2Inspired = airQuality.o2Concentration * profile.state.lungCapacity;
  const co2Inspired = airQuality.co2Concentration * (1 - profile.stressCapacity);

  // ── CICLO ESPIRATORIO (expulsión de CO₂) ──────────────────────────────────
  // CO₂ espirarlo = trades tóxicos acumulados × eficiencia respiratoria
  const co2FromTrades = maxDrawdown * 0.5;
  const co2Expelled = Math.min(state.co2Level, co2FromTrades + state.respiratoryQuotient * 0.05);

  // ── ACTUALIZAR NIVELES DE GAS ─────────────────────────────────────────────
  state.oxygenLevel = Math.max(0, Math.min(1,
    state.oxygenLevel + o2Inspired * 0.1 - co2Inspired * 0.05 - 0.01
  ));
  state.co2Level = Math.max(0, Math.min(1,
    state.co2Level + co2FromTrades * 0.05 - co2Expelled
  ));
  state.totalO2Consumed += o2Inspired;
  state.totalCO2Expelled += co2Expelled;

  // ── DETERMINAR RÉGIMEN RESPIRATORIO ───────────────────────────────────────
  if (airQuality.toxicGases > 0.7 || maxDrawdown > 0.35) {
    state.regime = "dyspnea";
  } else if (state.oxygenLevel < 0.2 || airQuality.o2Concentration < 0.1) {
    state.regime = "hypoxia";
    state.hypoxiaEvents++;
  } else if (airQuality.co2Concentration > 0.7 && totalTrades > 50) {
    state.regime = "hyperventilation";
    state.hyperventilationEvents++;
  } else if (airQuality.o2Concentration > 0.7 && Math.abs(airQuality.airPressure) > 0.5) {
    state.regime = "hyperpnea"; // gran oportunidad detectada
  } else if (airQuality.o2Concentration < 0.2 && airQuality.co2Concentration < 0.2) {
    state.regime = "bradypnea";
    state.apneaTime++;
  } else if (airQuality.co2Concentration > 0.4) {
    state.regime = "tachypnea";
  } else if (state.co2Level < 0.1 && state.oxygenLevel > 0.8) {
    state.regime = "apnea"; // mercado en espera — mejor no moverse
  } else {
    state.regime = "eupnea";
  }

  // ── FRECUENCIA RESPIRATORIA (RITMO DE TRADING) ────────────────────────────
  state.breathingRate = computeBreathingRate(state.regime, fitnessScore, airQuality);

  // ── RESPUESTA AL ESTRÉS HORMONAL ──────────────────────────────────────────
  state.stressResponse = computeStressResponse(
    state.regime, maxDrawdown, winRate, capital, profile.stressCapacity
  );

  // ── COCIENTE RESPIRATORIO (EFICIENCIA) ────────────────────────────────────
  const o2Used = Math.max(0.01, o2Inspired);
  const co2Prod = Math.max(0.01, co2FromTrades);
  state.respiratoryQuotient = Math.min(2, o2Used / co2Prod);

  // ── ENTRENAMIENTO: Aumentar capacidad pulmonar bajo estrés ────────────────
  // Como el entrenamiento de altura — el estrés extremo AUMENTA la capacidad
  if (state.regime === "dyspnea" || state.regime === "hypoxia" || state.regime === "tachypnea") {
    state.lungCapacity = Math.min(1, state.lungCapacity + 0.001 * profile.stressCapacity);
  }

  // ── MODIFICADORES DE RENDIMIENTO ──────────────────────────────────────────
  profile.fitnessModifier = computeFitnessModifier(state);
  profile.decisionSpeed = computeDecisionSpeed(state);
  profile.signalSensitivity = computeSignalSensitivity(state, profile.stressCapacity);
  profile.noiseResistance = computeNoiseResistance(state, profile.stressCapacity);

  // Capacidad de estrés evoluciona con generación y experiencia
  profile.stressCapacity = Math.min(1,
    0.3 + generation * 0.04 + fitnessScore * 0.3 + state.lungCapacity * 0.2
  );

  state.lastBreath = currentTick;
  agentRespiratoryProfiles.set(agentId, profile);
  return profile;
}

// ─── CÁLCULOS FISIOLÓGICOS ────────────────────────────────────────────────────

function computeBreathingRate(
  regime: BreathingRegime,
  fitness: number,
  air: MarketAirQuality
): number {
  const baseRate: Record<BreathingRegime, number> = {
    eupnea: 15, tachypnea: 25, bradypnea: 8, hyperpnea: 30,
    apnea: 0, dyspnea: 35, hypoxia: 20, hyperventilation: 45
  };
  const fitnessModifier = 1 - fitness * 0.3; // agentes más fit respiran más eficientemente
  return Math.round(baseRate[regime] * fitnessModifier);
}

function computeStressResponse(
  regime: BreathingRegime,
  drawdown: number,
  winRate: number,
  capital: number,
  stressCapacity: number
): StressResponse {
  const capitalStress = Math.max(0, (10000 - capital) / 10000);
  const drawdownStress = drawdown;
  const winrateConf = winRate;

  // Cortisol: alto en pérdidas severas
  const cortisol = Math.min(1, capitalStress * 1.5 + drawdownStress * 2 - stressCapacity * 0.3);
  // Adrenalina: pico en régimen de taquipnea o disnea
  const adrenaline = (regime === "tachypnea" || regime === "dyspnea") ? Math.min(1, drawdownStress * 3) : 0.1;
  // Dopamina: alta cuando el agente gana
  const dopamine = Math.min(1, winrateConf * 0.8 + (1 - capitalStress) * 0.2);
  // Serotonina: estabilidad a largo plazo
  const serotonin = Math.max(0, 0.7 - cortisol * 0.5 + dopamine * 0.2);
  // Norepinefrina: enfoque y concentración
  const norepinephrine = Math.min(1, 0.4 + adrenaline * 0.4 - cortisol * 0.2);

  const type: StressResponse["type"] =
    cortisol > 0.7 && adrenaline > 0.5 ? "acute_stress" :
    cortisol > 0.5 ? "chronic_stress" :
    dopamine < 0.2 && serotonin < 0.2 ? "exhaustion" :
    cortisol < 0.2 && dopamine > 0.6 ? "recovery" : "calm";

  return { type, cortisol, adrenaline, dopamine, serotonin, norepinephrine };
}

function computeFitnessModifier(state: RespiratoryState): number {
  // Eupnea = máximo rendimiento
  // Hipoxia / Disnea = rendimiento reducido
  const regimeMultiplier: Record<BreathingRegime, number> = {
    eupnea: 1.05, tachypnea: 0.95, bradypnea: 0.85, hyperpnea: 1.15,
    apnea: 0.90, dyspnea: 0.60, hypoxia: 0.70, hyperventilation: 0.75
  };
  const oxygenBonus = state.oxygenLevel * 0.1;
  const co2Penalty = state.co2Level * 0.15;
  const hormoneBonus = state.stressResponse.dopamine * 0.05 - state.stressResponse.cortisol * 0.08;

  return Math.max(0.1, Math.min(1.5,
    regimeMultiplier[state.regime] + oxygenBonus - co2Penalty + hormoneBonus
  ));
}

function computeDecisionSpeed(state: RespiratoryState): number {
  // Norepinefrina alta = decisiones más rápidas
  // CO₂ alto = ralentización cognitiva
  const base = 1.0;
  const noreEffect = state.stressResponse.norepinephrine * 0.3;
  const co2Effect = -state.co2Level * 0.4;
  const oxyEffect = state.oxygenLevel * 0.2;
  const adrEffect = state.stressResponse.adrenaline > 0.7 ? 0.3 : 0; // rush de adrenalina
  return Math.max(0.2, Math.min(2.0, base + noreEffect + co2Effect + oxyEffect + adrEffect));
}

function computeSignalSensitivity(state: RespiratoryState, stressCapacity: number): number {
  // Hiperpnea = máxima sensibilidad a señales (ventilación completa)
  // Hiperventilación = sensibilidad caótica (demasiado ruido)
  const regimeSens: Record<BreathingRegime, number> = {
    eupnea: 0.7, tachypnea: 0.8, bradypnea: 0.4, hyperpnea: 0.95,
    apnea: 0.5, dyspnea: 0.3, hypoxia: 0.2, hyperventilation: 0.5
  };
  return Math.min(1, regimeSens[state.regime] + stressCapacity * 0.2);
}

function computeNoiseResistance(state: RespiratoryState, stressCapacity: number): number {
  // Cortisol alto = menos filtrado de ruido (errores bajo estrés)
  // Serotonina alta = mayor filtrado (calma cognitiva)
  const base = 0.5;
  const cortisolEffect = -state.stressResponse.cortisol * 0.3;
  const serotoninEffect = state.stressResponse.serotonin * 0.3;
  const capacityEffect = stressCapacity * 0.2;
  return Math.max(0.1, Math.min(1, base + cortisolEffect + serotoninEffect + capacityEffect));
}

// ─── ESCENARIO DE ESTRÉS EXTREMO ─────────────────────────────────────────────
/**
 * Simula un "interval training" cardiovascular:
 * Expone al agente a volatilidad máxima por N ticks, luego recuperación.
 * Los agentes que sobreviven salen más fuertes.
 */
export function applyExtremeSstressTest(
  agentId: string,
  intensityLevel: number, // 0-1
  duration: number        // ticks
): { survives: boolean; capacityGain: number; message: string } {
  const profile = agentRespiratoryProfiles.get(agentId);
  if (!profile) return { survives: false, capacityGain: 0, message: "Agente no encontrado" };

  const state = profile.state;
  const stressThreshold = profile.stressCapacity;

  // Verifica si el agente puede sobrevivir el estrés
  const survivalChance = stressThreshold * 0.7 + state.oxygenLevel * 0.2 + (1 - state.co2Level) * 0.1;
  const survives = survivalChance > intensityLevel * 0.5;

  if (survives) {
    // El estrés extremo expande la capacidad (supercompensación)
    const capacityGain = intensityLevel * 0.05 * (1 - profile.stressCapacity);
    profile.stressCapacity = Math.min(1, profile.stressCapacity + capacityGain);
    profile.state.lungCapacity = Math.min(1, state.lungCapacity + capacityGain * 0.5);
    agentRespiratoryProfiles.set(agentId, profile);
    return {
      survives: true,
      capacityGain,
      message: `Estrés extremo (${(intensityLevel * 100).toFixed(0)}%) superado. Capacidad +${(capacityGain * 100).toFixed(2)}%`
    };
  } else {
    // El agente entra en disnea severa
    state.regime = "dyspnea";
    state.co2Level = Math.min(1, state.co2Level + 0.3);
    state.oxygenLevel = Math.max(0, state.oxygenLevel - 0.4);
    return {
      survives: false,
      capacityGain: 0,
      message: `Colapso respiratorio. Estrés ${(intensityLevel * 100).toFixed(0)}% superó capacidad ${(stressThreshold * 100).toFixed(0)}%`
    };
  }
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

export function getAgentRespiratoryProfile(agentId: string): AgentRespiratoryProfile | undefined {
  return agentRespiratoryProfiles.get(agentId);
}

export function getRespiratorySystemStats() {
  const profiles = Array.from(agentRespiratoryProfiles.values());
  if (profiles.length === 0) {
    return {
      totalAgents: 0, avgOxygenLevel: 0, avgCo2Level: 0, avgLungCapacity: 0,
      regimeDistribution: {} as Record<BreathingRegime, number>,
      stressTypeDistribution: {} as Record<string, number>,
      totalHypoxiaEvents: 0, totalHyperventilationEvents: 0,
      avgFitnessModifier: 1, avgStressCapacity: 0
    };
  }

  const regimeDist: Record<string, number> = {};
  const stressDist: Record<string, number> = {};
  profiles.forEach(p => {
    regimeDist[p.state.regime] = (regimeDist[p.state.regime] || 0) + 1;
    stressDist[p.state.stressResponse.type] = (stressDist[p.state.stressResponse.type] || 0) + 1;
  });

  return {
    totalAgents: profiles.length,
    avgOxygenLevel: profiles.reduce((s, p) => s + p.state.oxygenLevel, 0) / profiles.length,
    avgCo2Level: profiles.reduce((s, p) => s + p.state.co2Level, 0) / profiles.length,
    avgLungCapacity: profiles.reduce((s, p) => s + p.state.lungCapacity, 0) / profiles.length,
    regimeDistribution: regimeDist,
    stressTypeDistribution: stressDist,
    totalHypoxiaEvents: profiles.reduce((s, p) => s + p.state.hypoxiaEvents, 0),
    totalHyperventilationEvents: profiles.reduce((s, p) => s + p.state.hyperventilationEvents, 0),
    avgFitnessModifier: profiles.reduce((s, p) => s + p.fitnessModifier, 0) / profiles.length,
    avgStressCapacity: profiles.reduce((s, p) => s + p.stressCapacity, 0) / profiles.length,
  };
}
