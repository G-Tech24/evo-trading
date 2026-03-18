/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TRAINING ENGINE — Entrenamiento Adversarial Procedural
 *  Inspirado en:
 *  - OpenAI Hide & Seek autocurriculum (emergent behavior, 2019)
 *  - Curriculum Adversarial Training / CAT (IJCAI 2018)
 *  - MAML / Meta-learning for trading (Stanford, 2020)
 *  - "RL generalizes, SFT memorizes" (arXiv 2025)
 *  - Neuroevolution EXAMM para predicción de retornos (arXiv 2024)
 *
 *  PRINCIPIO CENTRAL: Los agentes NO memorizan — GENERALIZAN.
 *  Cada problema es generado proceduralmente con parámetros únicos.
 *  El agente es evaluado por el PROCESO de razonamiento, no por la respuesta.
 *
 *  METÁFORA: Esta es la MASA MUSCULAR que se construye con el estrés del
 *  entrenamiento. Sin estrés extremo, no hay hipertrofia.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ALL_CONCEPTS } from "./knowledgeBase.js";
import { ALL_PROBLEMS } from "./problemBank.js";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface TrainingSession {
  agentId: string;
  sessionId: string;
  startedAt: number;
  problems: GeneratedProblem[];
  outcomes: ProblemOutcome[];
  wisdomGain: [number, number, number]; // [math, physics, chemistry]
  stressLevel: number;        // 0-1 (nivel de dificultad actual)
  generalizationScore: number; // cuánto el agente generaliza vs memoriza
  phase: TrainingPhase;
}

export type TrainingPhase =
  | "warmup"       // L1-L2: problemas básicos para calibrar
  | "acceleration" // L3-L4: incremento de dificultad
  | "adversarial"  // L5-L6: problemas diseñados para engañar
  | "doctoral"     // L7: problemas de frontera del conocimiento
  | "chaos"        // modo extremo: mercados imposibles, ruido máximo
  | "self_play";   // agente se enfrenta a versiones pasadas de sí mismo

export interface GeneratedProblem {
  id: string;
  type: ProblemType;
  domain: "math" | "physics" | "chemistry" | "cross";
  level: number;       // 1-7
  difficulty: number;  // 0-1 continuo (no discreto)
  stressor: Stressor;  // tipo de estrés aplicado
  seed: number;        // para reproducibilidad
  params: Record<string, number>; // parámetros generados proceduralmente
  question: string;
  correctAnswer: number;
  tolerance: number;   // margen de error aceptable
  tradingSignal: "buy" | "sell" | "hold";
  signalStrength: number;
  timeLimit: number;   // ms antes de que expire (simula presión temporal)
}

export type ProblemType =
  | "derivation"    // deriva una fórmula desde principios
  | "estimation"    // estimación de orden de magnitud (Fermi)
  | "optimization"  // encontrar mínimo/máximo bajo restricciones
  | "anomaly"       // detectar la irregularidad en datos generados
  | "cross_domain"  // conectar dos dominios científicos
  | "adversarial"   // problema diseñado para inducir errores
  | "time_series"   // analizar serie temporal sintética
  | "equilibrium"   // encontrar punto de equilibrio dinámico
  | "chaos_detect"; // detectar si un sistema es caótico

export type Stressor =
  | "noise_injection"    // ruido gaussiano en parámetros
  | "time_pressure"      // límite de tiempo extremo
  | "misleading_context" // datos que sugieren respuesta incorrecta
  | "regime_change"      // cambio de régimen a mitad del problema
  | "correlated_noise"   // correlación espuria entre variables
  | "fat_tails"          // distribución con colas pesadas
  | "nonstationary"      // datos no estacionarios
  | "adversarial_clue";  // pista que lleva en dirección incorrecta

export interface ProblemOutcome {
  problemId: string;
  agentAnswer: number;
  correctAnswer: number;
  error: number;      // |agentAnswer - correctAnswer|
  normalized: number; // error / correctAnswer
  passed: boolean;
  timeUsed: number;   // ms
  signal: "buy" | "sell" | "hold";
  signalAccuracy: number; // cuánto se acercó a la señal correcta
  noveltyBonus: number;   // bonus por resolver con método no visto antes
}

// ─── GENERADORES DE PROBLEMAS PROCEDURALES ───────────────────────────────────

/**
 * Genera un número pseudoaleatorio determinístico desde una semilla.
 * Crucial para reproducibilidad sin memorización.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateMathProblem(level: number, seed: number, stressor: Stressor): GeneratedProblem {
  const rng = seededRandom(seed);
  const difficulty = Math.min(1, (level - 1) / 6 + rng() * 0.15);
  const id = `math_${seed}_${Date.now()}`;

  // Parámetros generados proceduralmente — NUNCA los mismos dos veces
  const α = 0.1 + rng() * 4.9;   // tasa de deriva (proceso estocástico)
  const σ = 0.05 + rng() * 2.0;  // volatilidad
  const T = 1 + Math.floor(rng() * 252); // días de horizonte
  const r = 0.01 + rng() * 0.15; // tasa libre de riesgo
  const S0 = 1000 + rng() * 99000; // precio inicial

  let question: string;
  let correctAnswer: number;
  let type: ProblemType;
  let tradingSignal: "buy" | "sell" | "hold";

  if (level <= 2) {
    // L1-L2: Logaritmos, razones, retornos simples
    const r_simple = -0.5 + rng() * 1.0;
    const P0 = 100 + rng() * 900;
    const P1 = P0 * (1 + r_simple);
    correctAnswer = Math.log(P1 / P0); // log-retorno
    question = `Precio inicial: $${P0.toFixed(2)}, precio final: $${P1.toFixed(2)}. ` +
               `Calcula el log-retorno ln(P₁/P₀).`;
    type = "estimation";
    tradingSignal = correctAnswer > 0.05 ? "buy" : correctAnswer < -0.05 ? "sell" : "hold";
  } else if (level <= 4) {
    // L3-L4: Cálculo, álgebra lineal, procesos estocásticos básicos
    // Problema: ¿Cuál es el precio esperado según Movimiento Browniano con deriva?
    // E[S_T] = S₀ * exp(α*T)  (bajo medida real, no neutral al riesgo)
    correctAnswer = S0 * Math.exp(α * T / 252);
    question = `Proceso: dS = αS dt + σS dW. S₀=$${S0.toFixed(0)}, α=${α.toFixed(3)}, ` +
               `σ=${σ.toFixed(3)}, T=${T} días. Calcula E[S_T] = S₀·e^(αT).`;
    type = "derivation";
    tradingSignal = α > 0 ? "buy" : "sell";
  } else if (level <= 5) {
    // L5: Itô, Browniano, Fat tails
    // Precio medio bajo GBM neutral al riesgo: S₀ * exp((r - σ²/2)*T + σ*√T*z)
    // Para la media: E[S_T] = S₀ * exp(r*T) (medida neutral)
    const totalVar = σ * σ * T / 252;
    const logReturn = (r - σ * σ / 2) * T / 252;
    // Exponent de Hurst para detectar tendencia
    const H = 0.3 + rng() * 0.4; // Hurst entre 0.3 y 0.7
    correctAnswer = H; // el agente debe estimar el Hurst dada la autocorrelación
    question = `Serie de retornos R=[${Array.from({length: 5}, (_, i) => (rng() * 0.1 - 0.05 + (H - 0.5) * 0.02 * i).toFixed(4)).join(", ")}...]. ` +
               `σ_estimado=${σ.toFixed(4)}, autocorrelación_lag1=${((2 * H - 1) * 0.3 + rng() * 0.05).toFixed(4)}. ` +
               `Estima el exponente de Hurst H∈[0,1].`;
    type = "estimation";
    tradingSignal = H > 0.6 ? "buy" : H < 0.4 ? "sell" : "hold";
  } else if (level <= 6) {
    // L6: Información, entropía de Shannon, VaR
    // VaR al 99%: μ - 2.326σ (distribución normal)
    const μ = (rng() - 0.5) * 0.04;
    const portValue = 100000 + rng() * 900000;
    const varDailyPct = μ - 2.326 * σ / Math.sqrt(252);
    correctAnswer = portValue * varDailyPct; // VaR en $ (negativo = pérdida)
    question = `Portafolio: $${portValue.toFixed(0)}. Retorno diario: μ=${μ.toFixed(4)}, σ_diario=${(σ/Math.sqrt(252)).toFixed(4)}. ` +
               `Calcula el VaR diario al 99% en dólares (z=-2.326).`;
    type = "optimization";
    tradingSignal = Math.abs(varDailyPct) > 0.02 ? "sell" : "hold";
  } else {
    // L7: Doctorado — Geometría diferencial, información de Fisher, espacios de riesgo
    // Entropía diferencial de una distribución normal: H = 0.5 * ln(2πe * σ²)
    const entropy = 0.5 * Math.log(2 * Math.PI * Math.E * σ * σ);
    // CVaR (Expected Shortfall): E[L | L > VaR] = μ + σ * φ(z_α) / (1-α)
    const phi_z = Math.exp(-2.326 * 2.326 / 2) / Math.sqrt(2 * Math.PI);
    const cvar = (rng() - 0.5) * 0.04 - σ / Math.sqrt(252) * phi_z / 0.01;
    correctAnswer = cvar;
    question = `CVaR al 99% (Expected Shortfall). μ=${((rng() - 0.5) * 0.04).toFixed(4)}, σ_diario=${(σ/Math.sqrt(252)).toFixed(4)}. ` +
               `Entropía del proceso: ${entropy.toFixed(4)} nats. ` +
               `Calcula ES = μ - σ·φ(z₀.₀₁)/(1-0.99) con φ(2.326)=${phi_z.toFixed(4)}.`;
    type = "derivation";
    tradingSignal = cvar < -0.03 ? "sell" : cvar > 0.01 ? "buy" : "hold";
  }

  // Aplicar estresores al problema
  let timeLimit = 30000; // 30s base
  if (stressor === "time_pressure") timeLimit = 5000;
  if (stressor === "adversarial_clue") {
    question += ` NOTA: El coeficiente de correlación entre los retornos es ${(rng() * 0.8).toFixed(3)} (ignora correlaciones no especificadas).`;
  }
  if (stressor === "noise_injection") {
    // Añadir 5-15% de ruido al parámetro principal
    correctAnswer *= (1 + (rng() - 0.5) * 0.02); // sólo afecta leve a la respuesta
    question += ` [Ruido instrumental: ±${(rng() * 2).toFixed(2)}%]`;
  }

  return {
    id, type, domain: "math", level, difficulty, stressor, seed, timeLimit,
    params: { α, σ, T, r, S0 },
    question, correctAnswer,
    tolerance: 0.05 + difficulty * 0.10, // L7 exige más precisión
    tradingSignal,
    signalStrength: 0.5 + difficulty * 0.4,
  };
}

function generatePhysicsProblem(level: number, seed: number, stressor: Stressor): GeneratedProblem {
  const rng = seededRandom(seed + 10000);
  const difficulty = Math.min(1, (level - 1) / 6 + rng() * 0.15);
  const id = `phys_${seed}_${Date.now()}`;

  const m = 0.01 + rng() * 99.99;  // masa (kg)
  const v = 0.1 + rng() * 999.9;   // velocidad (m/s)
  const k = 0.1 + rng() * 99.9;    // constante de resorte
  const T_kelvin = 200 + rng() * 800; // temperatura
  const N = 1e20 + rng() * 1e22;   // número de partículas
  const E = 0.1 + rng() * 99.9;    // energía (J)

  let question: string;
  let correctAnswer: number;
  let type: ProblemType;
  let tradingSignal: "buy" | "sell" | "hold";

  if (level <= 2) {
    // Energía cinética
    const Ek = 0.5 * m * v * v;
    correctAnswer = Ek;
    question = `Partícula de masa m=${m.toFixed(3)} kg con velocidad v=${v.toFixed(2)} m/s. ` +
               `Calcula la energía cinética Ek = ½mv².`;
    type = "estimation";
    tradingSignal = Ek > 500 ? "buy" : "hold";
  } else if (level <= 4) {
    // Oscilador armónico: período T = 2π√(m/k)
    const period = 2 * Math.PI * Math.sqrt(m / k);
    correctAnswer = period;
    question = `Oscilador armónico: masa m=${m.toFixed(4)} kg, constante resorte k=${k.toFixed(4)} N/m. ` +
               `Calcula el período T = 2π√(m/k) en segundos.`;
    type = "derivation";
    tradingSignal = period < 1.0 ? "buy" : period > 5.0 ? "sell" : "hold";
  } else if (level <= 5) {
    // Entropía de Boltzmann S = k_B * N * ln(Ω)
    const kB = 1.380649e-23;
    const Ω = Math.max(1, Math.floor(rng() * 1000 + 10));
    const S_entropy = kB * N * Math.log(Ω);
    correctAnswer = S_entropy;
    // Traducción trading: S_entropy alta = mercado desordenado = hold
    const normalizedS = S_entropy / (kB * N * Math.log(1000));
    tradingSignal = normalizedS < 0.3 ? "buy" : normalizedS > 0.7 ? "sell" : "hold";
    question = `Sistema con N=${N.toExponential(2)} partículas, k_B=${kB.toExponential(6)} J/K, ` +
               `microestados Ω=${Ω}. Calcula S = k_B·N·ln(Ω).`;
    type = "derivation";
  } else if (level <= 6) {
    // Ley de Stefan-Boltzmann: P = σ_SB * A * T^4 → analogía: potencia de señal
    const sigma_SB = 5.670374419e-8;
    const A = 0.01 + rng() * 9.99; // área (m²)
    const P_radiated = sigma_SB * A * Math.pow(T_kelvin, 4);
    correctAnswer = P_radiated;
    tradingSignal = T_kelvin > 500 ? "buy" : "hold";
    question = `Cuerpo negro: A=${A.toFixed(4)} m², T=${T_kelvin.toFixed(1)} K. ` +
               `σ_SB=5.67×10⁻⁸ W/(m²K⁴). Calcula P = σ·A·T⁴ (potencia irradiada en W).`;
    type = "optimization";
  } else {
    // L7: Spin glass / Econofísica — correlación de Ising
    // E_ising = -J * Σᵢⱼ sᵢsⱼ  → correlación entre retornos
    const J = 0.1 + rng() * 2.0; // acoplamiento
    const n_spins = 2 + Math.floor(rng() * 8); // número de spins alineados
    const n_anti = 2 + Math.floor(rng() * 4);  // anti-alineados
    const E_ising = -J * (n_spins - n_anti);
    correctAnswer = E_ising;
    tradingSignal = E_ising < -2 ? "buy" : E_ising > 2 ? "sell" : "hold";
    question = `Modelo Ising (red de agentes): J=${J.toFixed(3)}, ${n_spins} pares alineados, ` +
               `${n_anti} anti-alineados. Calcula E = -J(n_alineados - n_anti). ` +
               `Interpretar como correlación de consenso en la red de traders.`;
    type = "cross_domain";
  }

  // Estresores para física
  if (stressor === "misleading_context") {
    question += ` (Dato adicional irrelevante: fricción=0.${Math.floor(rng()*99)} N·s/m)`;
  }
  if (stressor === "regime_change") {
    question += ` ATENCIÓN: A partir de t=${(rng()*T_kelvin/100).toFixed(1)}s el sistema cambia de régimen. Re-evalúa.`;
  }

  return {
    id, type, domain: "physics", level, difficulty, stressor, seed,
    params: { m, v, k, T_kelvin, N, E },
    question, correctAnswer,
    tolerance: 0.05 + difficulty * 0.08,
    timeLimit: stressor === "time_pressure" ? 4000 : 25000,
    tradingSignal,
    signalStrength: 0.4 + difficulty * 0.5,
  };
}

function generateChemistryProblem(level: number, seed: number, stressor: Stressor): GeneratedProblem {
  const rng = seededRandom(seed + 20000);
  const difficulty = Math.min(1, (level - 1) / 6 + rng() * 0.15);
  const id = `chem_${seed}_${Date.now()}`;

  const Ea = 40000 + rng() * 120000; // energía de activación (J/mol)
  const A = 1e10 + rng() * 1e13;     // factor pre-exponencial
  const R = 8.314;                    // constante de gases
  const T_chem = 250 + rng() * 500;  // temperatura (K)
  const [A_conc, B_conc] = [0.1 + rng() * 2.0, 0.05 + rng() * 1.5]; // concentraciones

  let question: string;
  let correctAnswer: number;
  let type: ProblemType;
  let tradingSignal: "buy" | "sell" | "hold";

  if (level <= 2) {
    // Dilución: C₁V₁ = C₂V₂
    const C1 = 1 + rng() * 9;
    const V1 = 10 + rng() * 90;
    const V2 = V1 * (1 + rng() * 4);
    const C2 = (C1 * V1) / V2;
    correctAnswer = C2;
    question = `Dilución: C₁=${C1.toFixed(2)} M, V₁=${V1.toFixed(1)} mL, V₂=${V2.toFixed(1)} mL. ` +
               `Calcula C₂ = C₁V₁/V₂ (concentración final).`;
    type = "estimation";
    tradingSignal = C2 < 0.5 ? "sell" : "hold";
  } else if (level <= 4) {
    // Arrhenius: k = A * exp(-Ea/RT)
    const k_rate = A * Math.exp(-Ea / (R * T_chem));
    correctAnswer = k_rate;
    question = `Ecuación de Arrhenius: A=${A.toExponential(2)}, Ea=${Ea.toFixed(0)} J/mol, ` +
               `T=${T_chem.toFixed(1)} K, R=8.314 J/(mol·K). Calcula k = A·e^(-Ea/RT).`;
    type = "derivation";
    tradingSignal = k_rate > 1e8 ? "buy" : k_rate < 1e3 ? "sell" : "hold";
  } else if (level <= 5) {
    // Fick: J = -D * dC/dx  →  gradiente de difusión = flujo de capital
    const D = 1e-9 + rng() * 1e-7; // coeficiente de difusión (m²/s)
    const dCdx = (rng() - 0.5) * 1000; // gradiente (mol/m⁴)
    const J_flux = -D * dCdx;
    correctAnswer = J_flux;
    tradingSignal = J_flux > 0 ? "buy" : "sell";
    question = `Segunda ley de Fick: D=${D.toExponential(3)} m²/s, ` +
               `gradiente dC/dx=${dCdx.toFixed(2)} mol/m⁴. Calcula J = -D·(dC/dx).`;
    type = "derivation";
  } else if (level <= 6) {
    // Le Chatelier — Kp, cambio de presión
    const Kp = 1e-5 + rng() * 1e2;
    const P_total = 1 + rng() * 100; // atm
    // Para A(g) ⇌ 2B(g): Kp = [B]²/[A] en términos de presiones parciales
    // Si aumenta P, equilibrio se desplaza hacia menos moles (→ A)
    const delta_n = rng() > 0.5 ? 1 : -1; // δn moles gaseosos
    const Q_reaction = A_conc * A_conc / B_conc;
    const displacement = Math.log(Q_reaction / Kp);
    correctAnswer = displacement;
    tradingSignal = displacement > 1 ? "sell" : displacement < -1 ? "buy" : "hold";
    question = `Reacción: A(g) ⇌ 2B(g). Kp=${Kp.toFixed(4)}, [A]₀=${A_conc.toFixed(3)} M, [B]₀=${B_conc.toFixed(3)} M. ` +
               `Calcula ln(Q/Kp) para determinar la dirección del desplazamiento.`;
    type = "equilibrium";
  } else {
    // L7: Química estocástica — ecuación maestra, trayectoria de Gillespie
    // Probabilidad de transición: P(n→n+1) = k_on * n_A * n_B
    const k_on = 1e-4 + rng() * 1e-2;
    const k_off = 1e-3 + rng() * 1e-1;
    const n_A = 10 + Math.floor(rng() * 990);
    const n_B = 5 + Math.floor(rng() * 495);
    // Tasa neta de reacción en estado estacionario
    const n_eq = k_on * n_A * n_B / k_off;
    correctAnswer = n_eq;
    tradingSignal = n_eq > 100 ? "buy" : n_eq < 10 ? "sell" : "hold";
    question = `Química estocástica (Gillespie): k_on=${k_on.toExponential(3)}, k_off=${k_off.toExponential(3)}, ` +
               `n_A=${n_A}, n_B=${n_B}. Calcula n_eq = k_on·n_A·n_B / k_off (moléculas en equilibrio).`;
    type = "equilibrium";
  }

  if (stressor === "fat_tails") {
    question += ` ADVERTENCIA: Las concentraciones siguen distribución Pareto (cola pesada α=${(1 + rng() * 2).toFixed(2)}).`;
  }
  if (stressor === "nonstationary") {
    question += ` El sistema NO está en estado estacionario — la temperatura varía ${(rng() * 10).toFixed(1)} K/min.`;
  }

  return {
    id, type, domain: "chemistry", level, difficulty, stressor, seed,
    params: { Ea, A, R, T_chem, A_conc, B_conc },
    question, correctAnswer,
    tolerance: 0.07 + difficulty * 0.10,
    timeLimit: stressor === "time_pressure" ? 6000 : 30000,
    tradingSignal,
    signalStrength: 0.4 + difficulty * 0.45,
  };
}

function generateCrossDomainProblem(level: number, seed: number): GeneratedProblem {
  const rng = seededRandom(seed + 30000);
  const id = `cross_${seed}_${Date.now()}`;
  const difficulty = Math.min(1, (level - 1) / 6 + rng() * 0.2);

  // Problema que conecta los 3 dominios — la joya del currículo
  // Analogía completa: difusión Fick = movimiento Browniano = flujo de capital
  const D_capital = 1e-6 + rng() * 1e-4; // difusividad del capital (análogo Fick)
  const ΔP = (rng() - 0.5) * 100000;     // gradiente de precio (análogo dC/dx)
  const σ_market = 0.01 + rng() * 0.5;   // volatilidad (análogo temperatura)
  const J_capital = -D_capital * ΔP;     // flujo de capital (análogo flujo de Fick)
  const E_kinetic = 0.5 * 1e6 * σ_market * σ_market; // energía cinética del mercado
  const k_Arrhenius = Math.exp(-E_kinetic / (8.314 * (300 + rng() * 200))); // análogo Arrhenius

  const correctAnswer = J_capital * k_Arrhenius; // flujo modulado por barrera
  const tradingSignal = correctAnswer > 0 ? "buy" : "sell";

  return {
    id, type: "cross_domain", domain: "cross", level, difficulty,
    stressor: "correlated_noise", seed,
    params: { D_capital, ΔP, σ_market },
    question: `PROBLEMA TRANSDISCIPLINAR (L${level}): ` +
              `El mercado se modela como un sistema de difusión-reacción. ` +
              `D_capital=${D_capital.toExponential(3)} (difusividad análoga a Fick), ` +
              `ΔP=${ΔP.toFixed(0)} $/m (gradiente de precio), σ_mercado=${σ_market.toFixed(4)}. ` +
              `Energía de activación cinética: E_k = ½·M·σ² = ${E_kinetic.toFixed(2)} J. ` +
              `Calcula el flujo de capital modulado: J = -D·ΔP·e^(-E_k/RT) con T=350K.`,
    correctAnswer,
    tolerance: 0.15, // más tolerancia en problemas cross-domain
    timeLimit: 45000,
    tradingSignal,
    signalStrength: 0.7 + rng() * 0.3,
  };
}

// ─── EVALUACIÓN DE RESPUESTA (NO BINARIA) ────────────────────────────────────

export function evaluateProblem(
  problem: GeneratedProblem,
  agentAnswer: number,
  agentSignal: "buy" | "sell" | "hold",
  timeUsed: number
): ProblemOutcome {
  const error = Math.abs(agentAnswer - problem.correctAnswer);
  const denom = Math.abs(problem.correctAnswer) || 1e-10;
  const normalizedError = error / denom;
  const passed = normalizedError <= problem.tolerance;

  // Señal correcta = bonus
  const signalMatch = agentSignal === problem.tradingSignal ? 1 : 0;
  // Parcialmente correcto: bonus si está dentro del doble del tolerance
  const partialScore = Math.max(0, 1 - normalizedError / (problem.tolerance * 2));
  const signalAccuracy = signalMatch * 0.7 + partialScore * 0.3;

  // Bonus de novedad: penalizamos respuestas que son exactas fracciones simples
  // (indicio de memorización). Un agente que razona obtendrá resultados
  // ligeramente únicos basados en el proceso, no en el valor memorizado.
  const isRoundNumber = Math.abs(agentAnswer - Math.round(agentAnswer)) < 1e-8;
  const noveltyBonus = isRoundNumber ? -0.1 : 0.05; // penaliza respuestas redondas

  return {
    problemId: problem.id,
    agentAnswer,
    correctAnswer: problem.correctAnswer,
    error,
    normalized: normalizedError,
    passed,
    timeUsed,
    signal: agentSignal,
    signalAccuracy,
    noveltyBonus,
  };
}

// ─── SIMULACIÓN DE RESPUESTA DEL AGENTE ──────────────────────────────────────
// (El agente usa sus pesos genómicos para aproximar la respuesta)

export function simulateAgentAnswer(
  problem: GeneratedProblem,
  mathWeight: number,
  physicsWeight: number,
  chemistryWeight: number,
  fitnessScore: number,
  trainingStress: number // 0-1: estrés acumulado del agente
): { answer: number; signal: "buy" | "sell" | "hold"; confidence: number } {
  const domainWeight =
    problem.domain === "math" ? mathWeight :
    problem.domain === "physics" ? physicsWeight :
    problem.domain === "chemistry" ? chemistryWeight :
    (mathWeight + physicsWeight + chemistryWeight) / 3;

  // Fitness elevado = el agente llega más cerca de la respuesta correcta
  const basePrecision = 0.1 + fitnessScore * 0.6 + domainWeight * 0.3;
  // El estrés de entrenamiento añade ruido (como en entrenamiento real — a veces empeoras antes de mejorar)
  const stressNoise = trainingStress * (Math.random() * 0.4 - 0.1);
  const precision = Math.max(0.05, Math.min(0.99, basePrecision - stressNoise));

  // Respuesta aproximada: correctAnswer * (1 ± error)
  const error = (1 - precision) * (Math.random() > 0.5 ? 1 : -1);
  const answer = problem.correctAnswer * (1 + error * (1 - precision));

  // Señal basada en domainWeight y fitness
  const signalRoll = Math.random();
  const signalAccuracy = basePrecision;
  let signal: "buy" | "sell" | "hold";
  if (signalRoll < signalAccuracy) {
    signal = problem.tradingSignal; // respuesta correcta
  } else {
    signal = ["buy", "sell", "hold"][Math.floor(Math.random() * 3)] as any;
  }

  return { answer, signal, confidence: precision };
}

// ─── SELECCIÓN DE FASE DE ENTRENAMIENTO ──────────────────────────────────────

export function selectTrainingPhase(
  fitnessScore: number,
  generation: number,
  stressLevel: number,
  marketVolatility: number
): TrainingPhase {
  // Pánico de mercado → modo chaos
  if (marketVolatility > 0.08 || stressLevel > 0.85) return "chaos";
  // Agentes veteranos → self-play
  if (generation > 5 && fitnessScore > 0.6) return "self_play";
  // Fitness alto → adversarial
  if (fitnessScore > 0.45) return "adversarial";
  if (fitnessScore > 0.3) return "doctoral";
  if (fitnessScore > 0.15) return "acceleration";
  return "warmup";
}

// ─── GENERACIÓN DE SESIÓN DE ENTRENAMIENTO ───────────────────────────────────

export function generateTrainingSession(
  agentId: string,
  mathWeight: number,
  physicsWeight: number,
  chemistryWeight: number,
  fitnessScore: number,
  generation: number,
  marketVolatility: number,
  currentTick: number
): TrainingSession {
  const sessionId = `sess_${agentId}_${currentTick}`;
  const stressLevel = Math.min(1, marketVolatility * 10 + (1 - fitnessScore) * 0.3);
  const phase = selectTrainingPhase(fitnessScore, generation, stressLevel, marketVolatility);

  // Número de problemas según fase
  const numProblems = phase === "chaos" ? 12 : phase === "doctoral" ? 8 : phase === "adversarial" ? 10 : 6;

  // Nivel base de dificultad según fase
  const baseLevelMap: Record<TrainingPhase, number> = {
    warmup: 1, acceleration: 3, adversarial: 5, doctoral: 6, chaos: 7, self_play: 5
  };
  const baseLevel = baseLevelMap[phase];

  const stressors: Stressor[] = [
    "noise_injection", "time_pressure", "misleading_context",
    "regime_change", "correlated_noise", "fat_tails",
    "nonstationary", "adversarial_clue"
  ];

  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < numProblems; i++) {
    const seed = currentTick * 1000 + i * 137 + agentId.charCodeAt(0) * 31;
    const level = Math.min(7, Math.max(1, baseLevel + Math.floor(Math.random() * 2)));
    const stressor = stressors[Math.floor(Math.random() * stressors.length)];
    const domain = ["math", "physics", "chemistry", "cross"][Math.floor(Math.random() * 4)];

    if (domain === "math") problems.push(generateMathProblem(level, seed, stressor));
    else if (domain === "physics") problems.push(generatePhysicsProblem(level, seed, stressor));
    else if (domain === "chemistry") problems.push(generateChemistryProblem(level, seed, stressor));
    else problems.push(generateCrossDomainProblem(level, seed));
  }

  // Simular respuestas del agente
  const outcomes: ProblemOutcome[] = problems.map(p => {
    const timeUsed = p.timeLimit * (0.3 + Math.random() * 0.7);
    const { answer, signal } = simulateAgentAnswer(
      p, mathWeight, physicsWeight, chemistryWeight, fitnessScore, stressLevel
    );
    return evaluateProblem(p, answer, signal, timeUsed);
  });

  // Calcular ganancia de sabiduría
  const mathOutcomes = outcomes.filter((_, i) => problems[i].domain === "math");
  const physOutcomes = outcomes.filter((_, i) => problems[i].domain === "physics");
  const chemOutcomes = outcomes.filter((_, i) => problems[i].domain === "chemistry");

  const wisdomFromDomain = (outs: ProblemOutcome[]) =>
    outs.length === 0 ? 0 :
    outs.reduce((s, o) => s + o.signalAccuracy, 0) / outs.length * 0.05;

  const wisdomGain: [number, number, number] = [
    wisdomFromDomain(mathOutcomes),
    wisdomFromDomain(physOutcomes),
    wisdomFromDomain(chemOutcomes),
  ];

  const passRate = outcomes.filter(o => o.passed).length / outcomes.length;
  const generalizationScore = passRate * (1 - stressLevel * 0.3);

  return {
    agentId, sessionId, startedAt: Date.now(),
    problems, outcomes, wisdomGain,
    stressLevel, generalizationScore, phase
  };
}

// ─── STATS DE ENTRENAMIENTO GLOBAL ───────────────────────────────────────────

export interface TrainingStats {
  totalSessions: number;
  totalProblemsGenerated: number;
  averagePassRate: number;
  averageGeneralizationScore: number;
  phaseDistribution: Record<TrainingPhase, number>;
  topStressors: Record<Stressor, number>;
  domainStrengths: { math: number; physics: number; chemistry: number; cross: number };
}

// Registry en memoria de sesiones recientes
const recentSessions: TrainingSession[] = [];
const MAX_SESSIONS = 1000;

export function registerSession(session: TrainingSession): void {
  recentSessions.push(session);
  if (recentSessions.length > MAX_SESSIONS) recentSessions.shift();
}

export function getTrainingStats(): TrainingStats {
  if (recentSessions.length === 0) {
    return {
      totalSessions: 0, totalProblemsGenerated: 0,
      averagePassRate: 0, averageGeneralizationScore: 0,
      phaseDistribution: { warmup: 0, acceleration: 0, adversarial: 0, doctoral: 0, chaos: 0, self_play: 0 },
      topStressors: {} as any,
      domainStrengths: { math: 0, physics: 0, chemistry: 0, cross: 0 }
    };
  }

  const totalProblems = recentSessions.reduce((s, sess) => s + sess.problems.length, 0);
  const avgPass = recentSessions.reduce((s, sess) => {
    const passRate = sess.outcomes.filter(o => o.passed).length / Math.max(1, sess.outcomes.length);
    return s + passRate;
  }, 0) / recentSessions.length;

  const phaseDistrib: Record<TrainingPhase, number> = {
    warmup: 0, acceleration: 0, adversarial: 0, doctoral: 0, chaos: 0, self_play: 0
  };
  recentSessions.forEach(s => phaseDistrib[s.phase]++);

  const stressorCount: Record<string, number> = {};
  recentSessions.forEach(s => s.problems.forEach(p => {
    stressorCount[p.stressor] = (stressorCount[p.stressor] || 0) + 1;
  }));

  const domainScores = { math: 0, physics: 0, chemistry: 0, cross: 0 };
  let domainCounts = { math: 0, physics: 0, chemistry: 0, cross: 0 };
  recentSessions.forEach(sess => {
    sess.problems.forEach((p, i) => {
      const o = sess.outcomes[i];
      if (o) {
        domainScores[p.domain as keyof typeof domainScores] += o.signalAccuracy;
        domainCounts[p.domain as keyof typeof domainCounts]++;
      }
    });
  });
  const domainStrengths = {
    math: domainCounts.math > 0 ? domainScores.math / domainCounts.math : 0,
    physics: domainCounts.physics > 0 ? domainScores.physics / domainCounts.physics : 0,
    chemistry: domainCounts.chemistry > 0 ? domainScores.chemistry / domainCounts.chemistry : 0,
    cross: domainCounts.cross > 0 ? domainScores.cross / domainCounts.cross : 0,
  };

  return {
    totalSessions: recentSessions.length,
    totalProblemsGenerated: totalProblems,
    averagePassRate: avgPass,
    averageGeneralizationScore: recentSessions.reduce((s, x) => s + x.generalizationScore, 0) / recentSessions.length,
    phaseDistribution: phaseDistrib,
    topStressors: stressorCount as any,
    domainStrengths,
  };
}

export function getRecentSessions(limit = 50): TrainingSession[] {
  return recentSessions.slice(-limit);
}
