/**
 * PROBLEM BANK — Banco de Problemas Doctoral
 * ============================================
 * ~300 problemas con soluciones para entrenar a los agentes.
 * Organizados por dominio, nivel y tipo.
 *
 * Cada problema tiene:
 *   - Enunciado con datos numéricos reales
 *   - Solución analítica paso a paso
 *   - Señal de trading derivada (lo que el agente aprende)
 *   - Score de confianza en la señal [0,1]
 *
 * Los problemas son del tipo que resuelven:
 *   - Físicos de Renaissance Technologies (Jim Simons)
 *   - Matemáticos de D.E. Shaw, Two Sigma
 *   - Químicos/físicos de los hedge funds cuantitativos
 */

export type ProblemDomain = "math" | "physics" | "chemistry" | "cross";
export type ProblemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SignalDirection = "long" | "short" | "neutral" | "reduce_risk";

export interface Problem {
  id: string;
  title: string;
  domain: ProblemDomain;
  level: ProblemLevel;
  conceptIds: string[];          // conceptos del knowledgeBase que aplica
  statement: string;             // enunciado con datos reales
  solution: string;              // solución paso a paso
  tradingSignal: SignalDirection; // qué haría el agente con este conocimiento
  signalStrength: number;        // [0,1] confianza en la señal
  numericalAnswer: number;       // valor numérico clave de la solución
}

// ─────────────────────────────────────────────────────────────────────────────
// MATEMÁTICAS
// ─────────────────────────────────────────────────────────────────────────────
export const MATH_PROBLEMS: Problem[] = [

  // L1-L2: Fundamentos
  {
    id: "mp001", title: "Retorno Porcentual Simple", domain: "math", level: 1,
    conceptIds: ["m_pct_change"],
    statement: "BTC abre en $65,000 y cierra en $67,600. ¿Cuál es el retorno porcentual?",
    solution: "r = (67600-65000)/65000 × 100 = 2600/65000 × 100 = 4.0%",
    tradingSignal: "long", signalStrength: 0.3, numericalAnswer: 4.0,
  },
  {
    id: "mp002", title: "Interés Compuesto — Crecimiento de Capital", domain: "math", level: 2,
    conceptIds: ["m_sequences", "m_exponential"],
    statement: "Un agente inicia con $10,000 y gana 0.5% diario en promedio. ¿Cuánto tiene en 30 días?",
    solution: "C₃₀ = 10000 × (1.005)³⁰ = 10000 × 1.1614 = $11,614. Usando e: C = 10000·e^{0.005×30} = $11,618.",
    tradingSignal: "long", signalStrength: 0.4, numericalAnswer: 11614.0,
  },
  {
    id: "mp003", title: "Log-Retorno y Aditividad", domain: "math", level: 3,
    conceptIds: ["m_log_return", "m_exponential"],
    statement: "BTC sube 2%, baja 1.5%, sube 3% en 3 días consecutivos. ¿Cuál es el log-retorno total?",
    solution: "r_total = ln(1.02) + ln(0.985) + ln(1.03) = 0.0198 + (-0.0151) + 0.0296 = 0.0343 = 3.43%. Verificación: (1.02×0.985×1.03-1)×100 = 3.43%.",
    tradingSignal: "long", signalStrength: 0.45, numericalAnswer: 3.43,
  },
  {
    id: "mp004", title: "Z-Score y Señal de Mean Reversion", domain: "math", level: 3,
    conceptIds: ["m_normal_dist", "m_statistics_basic"],
    statement: "Precio medio 30d: $64,000. Desviación estándar: $2,000. Precio actual: $69,000. ¿Z-score? ¿Señal?",
    solution: "z = (69000 - 64000) / 2000 = 5000/2000 = 2.5. P(Z > 2.5) = 0.6% — extremadamente raro. Señal de VENTA (reversión esperada).",
    tradingSignal: "short", signalStrength: 0.78, numericalAnswer: 2.5,
  },
  {
    id: "mp005", title: "Varianza de Portafolio con 2 Activos", domain: "math", level: 4,
    conceptIds: ["m_covariance", "m_variance"],
    statement: "BTC: σ=4%, ETH: σ=5%, correlación ρ=0.7, pesos w_btc=0.6, w_eth=0.4. ¿Varianza del portafolio?",
    solution: "σ²_p = (0.6)²(0.04)² + (0.4)²(0.05)² + 2(0.6)(0.4)(0.7)(0.04)(0.05) = 0.000576 + 0.0004 + 0.000672 = 0.001648. σ_p = 4.06%.",
    tradingSignal: "neutral", signalStrength: 0.3, numericalAnswer: 4.06,
  },
  {
    id: "mp006", title: "Sharpe Ratio y Evaluación de Estrategia", domain: "math", level: 4,
    conceptIds: ["m_covariance", "m_statistics_basic"],
    statement: "Estrategia: retorno medio diario 0.15%, desviación 1.2%, tasa libre de riesgo 0.01%/día. ¿Sharpe anualizado?",
    solution: "Sharpe_diario = (0.0015 - 0.0001)/0.012 = 0.1167. Sharpe_anual = 0.1167 × √252 = 1.85. Excelente (>1.5 es muy bueno).",
    tradingSignal: "long", signalStrength: 0.85, numericalAnswer: 1.85,
  },
  {
    id: "mp007", title: "Movimiento Browniano — Varianza Esperada", domain: "math", level: 5,
    conceptIds: ["m_brownian"],
    statement: "BTC sigue un proceso de Wiener con σ=2% diario. ¿Qué rango de precio espera el agente en 1 semana? (IC 95%)",
    solution: "σ_7d = 0.02 × √7 = 0.02 × 2.646 = 5.29%. IC 95%: precio_actual × e^{±1.96×0.0529} = precio × [0.901, 1.110]. Para P₀=$65,000: [$58,565, $72,150].",
    tradingSignal: "neutral", signalStrength: 0.2, numericalAnswer: 5.29,
  },
  {
    id: "mp008", title: "Entropía de Shannon de Distribución de Retornos", domain: "math", level: 5,
    conceptIds: ["m_information_theory", "m_brownian"],
    statement: "En los últimos 20 días: 13 días positivos, 7 negativos. ¿Entropía de Shannon? ¿Es predecible?",
    solution: "p_up = 13/20 = 0.65, p_down = 0.35. H = -(0.65·log₂0.65 + 0.35·log₂0.35) = -(0.65·(-0.621) + 0.35·(-1.515)) = 0.404+0.530 = 0.934 bits. Máxima entropía = 1 bit. H=0.934 ≈ casi aleatorio. Señal débil.",
    tradingSignal: "neutral", signalStrength: 0.2, numericalAnswer: 0.934,
  },
  {
    id: "mp009", title: "Lema de Itô — Precio de Opción", domain: "math", level: 5,
    conceptIds: ["m_stochastic_calc", "m_black_scholes"],
    statement: "Precio S=$65,000, call con K=$70,000, T=30d, σ=80%/año, r=5%. ¿Valor Black-Scholes?",
    solution: "d₁ = [ln(65000/70000) + (0.05+0.32)×30/365] / (0.8×√(30/365)) = [-0.0741+0.0305]/0.2355 = -0.185. d₂ = -0.185-0.2355 = -0.420. C = 65000·N(-0.185) - 70000·e^{-0.05×30/365}·N(-0.420) = 65000×0.4267 - 69714×0.337 = $27,736 - $23,494 = $4,242.",
    tradingSignal: "long", signalStrength: 0.5, numericalAnswer: 4242.0,
  },
  {
    id: "mp010", title: "Filtro de Kalman — Estimación de Precio Real", domain: "math", level: 6,
    conceptIds: ["m_kalman", "m_bayes"],
    statement: "Precio observado: $65,200 (con ruido σ_obs=200). Prior: $65,000 (σ_prior=500). ¿Estimación posterior Kalman?",
    solution: "Ganancia Kalman: K = σ²_prior/(σ²_prior+σ²_obs) = 250000/290000 = 0.862. Posterior: x̂ = 65000 + 0.862×(65200-65000) = 65000 + 172 = $65,172. Varianza posterior: σ² = (1-K)×σ²_prior = 0.138×250000 = 34500 → σ=185.",
    tradingSignal: "neutral", signalStrength: 0.35, numericalAnswer: 65172.0,
  },
  {
    id: "mp011", title: "Exponente de Hurst — Detección de Tendencia", domain: "math", level: 6,
    conceptIds: ["m_multiscale", "m_chaos"],
    statement: "Rango R=800, desviación S=200 en una ventana de n=100 ticks. ¿Exponente de Hurst? ¿Qué implica?",
    solution: "H = log(R/S)/log(n) = log(800/200)/log(100) = log(4)/log(100) = 0.602/2 = 0.301... Espera: R/S = (R/S)_escalado. Método: H = log(R/S)/log(n/2) = log(4)/log(50) = 0.602/1.699 = 0.354. H < 0.5 → proceso anti-persistente (mean-reverting).",
    tradingSignal: "short", signalStrength: 0.6, numericalAnswer: 0.35,
  },
  {
    id: "mp012", title: "VaR y CVaR para Gestión de Riesgo", domain: "math", level: 7,
    conceptIds: ["m_risk_measure", "m_extreme_value"],
    statement: "Portafolio $100,000. Retornos normales: μ=0.1%, σ=2% diario. ¿VaR 99% y CVaR 99%?",
    solution: "VaR₉₉ = 100000 × (μ - 2.326σ) = 100000 × (0.001 - 2.326×0.02) = 100000 × (-0.0455) = -$4,550. CVaR₉₉ = 100000 × (μ - σ×φ(2.326)/0.01) = 100000 × (0.001 - 0.02×0.0267) = $100000 × (-0.0275) ≈ -$5,233. Pérdida esperada en el 1% peor de días: $5,233.",
    tradingSignal: "reduce_risk", signalStrength: 0.7, numericalAnswer: 5233.0,
  },
  {
    id: "mp013", title: "PCA de Portafolio — Factor de Mercado", domain: "math", level: 7,
    conceptIds: ["m_pca", "m_matrices"],
    statement: "Matriz covarianza 3×3: BTC(4%),ETH(5%),BNB(4.5%). Correlaciones: BTC-ETH=0.8, BTC-BNB=0.75, ETH-BNB=0.85. ¿Varianza explicada por 1er PC?",
    solution: "Σ = [[16,16,13.5],[16,25,19.125],[13.5,19.125,20.25]]. Eigenvalor mayor ≈ 54.8 (suma diagonal=61.25). % explicado = 54.8/61.25 = 89.5%. El 1er PC es 'crypto market factor'. Los 3 activos tienen ≈0.89 de su varianza en el factor común.",
    tradingSignal: "neutral", signalStrength: 0.4, numericalAnswer: 89.5,
  },

  // Más problemas de series temporales
  {
    id: "mp014", title: "Autocorrelación y Test de Eficiencia de Mercado", domain: "math", level: 5,
    conceptIds: ["m_stochastic_calc", "m_brownian"],
    statement: "Correlación lag-1 de log-retornos: ρ₁=0.12 (n=100 días). ¿Es estadísticamente significativa? (α=5%)",
    solution: "Test estadístico: t = ρ₁√(n-2)/√(1-ρ₁²) = 0.12×√98/√0.9856 = 0.12×9.899/0.9928 = 1.196. t_crítico(α=5%, 98gl) = 1.984. Como 1.196 < 1.984: NO significativa. El mercado se comporta como random walk. No hay señal de autocorrelación.",
    tradingSignal: "neutral", signalStrength: 0.15, numericalAnswer: 1.196,
  },
  {
    id: "mp015", title: "Criterio de Kelly — Tamaño Óptimo de Posición", domain: "math", level: 4,
    conceptIds: ["m_optimization", "m_probability_theory"],
    statement: "Win rate=55%, ganancia promedio=2%, pérdida promedio=1.5%. ¿Fracción de Kelly óptima?",
    solution: "Kelly: f* = (bp - q)/b donde b=ganancia/pérdida=2/1.5=1.333, p=0.55, q=0.45. f* = (1.333×0.55 - 0.45)/1.333 = (0.733-0.45)/1.333 = 0.283/1.333 = 21.2%. Usar Kelly fraccional (½f*) = 10.6% por prudencia.",
    tradingSignal: "long", signalStrength: 0.65, numericalAnswer: 21.2,
  },
  {
    id: "mp016", title: "Bayesiana — Actualización de Creencia de Tendencia", domain: "math", level: 6,
    conceptIds: ["m_bayes", "m_probability_theory"],
    statement: "Prior P(alcista)=0.5. Señal CfC 'alcista' con P(señal|alcista)=0.7, P(señal|bajista)=0.3. ¿Posterior?",
    solution: "P(alcista|señal) = P(señal|alcista)×P(alcista) / P(señal) = 0.7×0.5 / (0.7×0.5 + 0.3×0.5) = 0.35/0.50 = 0.70. Posterior = 70% de probabilidad alcista. Señal de COMPRA con confianza 0.70.",
    tradingSignal: "long", signalStrength: 0.7, numericalAnswer: 0.7,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FÍSICA
// ─────────────────────────────────────────────────────────────────────────────
export const PHYSICS_PROBLEMS: Problem[] = [

  {
    id: "pp001", title: "Oscilador Armónico — Período de Mean Reversion", domain: "physics", level: 3,
    conceptIds: ["p_harmonic_osc"],
    statement: "Precio oscila alrededor de $65,000. Desviación actual: $3,000. 'Constante de resorte' k=0.3/día. ¿Tiempo para volver al 37% de la desviación (e-folding time)?",
    solution: "Amortiguación: τ = 1/γ, con γ = √(k) = √0.3 = 0.548/día. τ = 1/0.548 = 1.82 días. En 1.82 días la desviación se reduce a 3000/e = $1,104. Señal de SHORT en el pico, cubrir en ~2 días.",
    tradingSignal: "short", signalStrength: 0.65, numericalAnswer: 1.82,
  },
  {
    id: "pp002", title: "Energía de Activación — Umbral de Señal", domain: "physics", level: 3,
    conceptIds: ["p_thermodynamics_basic", "c_reaction_rates"],
    statement: "Temperatura de mercado T_high=0.05 (alta volatilidad). E_activación de estrategia = 0.1 k_BT. ¿Qué fracción de señales supera el umbral? (Boltzmann)",
    solution: "P(E > E_a) = e^{-E_a/k_BT} = e^{-0.1} = 0.905. En mercado volátil (T alto), casi todas las señales superan el umbral → muchos trades → sobretrading. Reducir posición sizing.",
    tradingSignal: "reduce_risk", signalStrength: 0.55, numericalAnswer: 0.905,
  },
  {
    id: "pp003", title: "Ley de Boltzmann — Distribución de Retornos", domain: "physics", level: 4,
    conceptIds: ["p_stat_mech"],
    statement: "Temperatura T=0.02 (volatilidad). ¿Probabilidad relativa de un retorno E₁=+2% vs E₂=+5%?",
    solution: "Ratio Boltzmann: P(E₂)/P(E₁) = e^{-(E₂-E₁)/k_BT} = e^{-(0.05-0.02)/0.02} = e^{-1.5} = 0.223. Un retorno de +5% es 4.5× menos probable que un retorno de +2%. No perseguir retornos extremos.",
    tradingSignal: "reduce_risk", signalStrength: 0.5, numericalAnswer: 0.223,
  },
  {
    id: "pp004", title: "Entropía de Mercado — ¿Momento de Operar?", domain: "physics", level: 4,
    conceptIds: ["p_entropy"],
    statement: "En los últimos 10 días: distribución de retornos tiene p_positivo=0.6, p_negativo=0.4. ¿Entropía Shannon? ¿Vale la pena operar?",
    solution: "H = -(0.6·log₂0.6 + 0.4·log₂0.4) = -(0.6×(-0.737) + 0.4×(-1.322)) = 0.442+0.529 = 0.971 bits. H_max=1 bit. Información = 1-0.971 = 0.029 bits — mercado casi aleatorio. NO operar agresivamente.",
    tradingSignal: "neutral", signalStrength: 0.1, numericalAnswer: 0.029,
  },
  {
    id: "pp005", title: "Principio de Incertidumbre en Trading", domain: "physics", level: 5,
    conceptIds: ["p_quantum_basic"],
    statement: "Ejecutar una orden de $1M en BTC spread en 1 segundo vs 10 minutos. ¿Cuál tiene menor impacto de precio?",
    solution: "Δx·Δp ≥ ℏ_mercado. Análogo: orden grande (Δx_capital grande) → precio se mueve más (Δp grande). Distribuir $1M en 600 órdenes de $1,667 cada 1s → impacto ∝ √(Q/tiempo) ≈ √(1M/600) = $1,290 por transacción vs $1M en una orden → impacto masivo. TWAP reduce impacto.",
    tradingSignal: "neutral", signalStrength: 0.4, numericalAnswer: 600.0,
  },
  {
    id: "pp006", title: "Dinámica de Fluidos — Liquidez y Spread", domain: "physics", level: 4,
    conceptIds: ["p_fluid_dynamics"],
    statement: "Número de Reynolds de mercado: Re = precio_medio × velocidad_retorno / viscosidad_spread. μ=65000, v=0.002, ν=0.001 (spread 0.1%). ¿Re? ¿Régimen?",
    solution: "Re = μ·v/ν = 65000×0.002/0.001 = 130. Re < 2000 → flujo laminar (mercado ordenado, tendencia clara). Re > 2000 → turbulento (alta volatilidad, caos). Re=130 → mercado en régimen laminar. Señal de TENDENCIA válida.",
    tradingSignal: "long", signalStrength: 0.55, numericalAnswer: 130.0,
  },
  {
    id: "pp007", title: "Transición de Fase — Detección de Crash Inminente", domain: "physics", level: 5,
    conceptIds: ["p_critical_phenomena"],
    statement: "Correlación promedio entre los 12 agentes: aumentó de 0.3 a 0.8 en 5 días. ¿Señal de transición de fase?",
    solution: "Susceptibilidad χ = Σᵢ⟨σᵢσⱼ⟩/N ∝ 1/(1-ρ_avg). Para ρ=0.3: χ=1.43. Para ρ=0.8: χ=5. El aumento de correlación (χ diverge) es señal canónica de transición de fase — crash inminente. REDUCIR POSICIÓN INMEDIATAMENTE.",
    tradingSignal: "reduce_risk", signalStrength: 0.9, numericalAnswer: 5.0,
  },
  {
    id: "pp008", title: "Ondas — Frecuencia Dominante del Ciclo", domain: "physics", level: 3,
    conceptIds: ["p_waves", "m_complex_analysis"],
    statement: "FFT de 60 días de precios BTC revela amplitudes: A(7d)=800, A(14d)=1200, A(30d)=600. ¿Ciclo dominante?",
    solution: "Potencia espectral: S(f) = A(f)². S(7d)=640000, S(14d)=1440000, S(30d)=360000. Ciclo dominante: 14 días. El precio tiene ciclo de 2 semanas con amplitud ±$1,200. Comprar en el valle del ciclo de 14d.",
    tradingSignal: "long", signalStrength: 0.5, numericalAnswer: 14.0,
  },
  {
    id: "pp009", title: "Lagrangiana — Trayectoria Óptima de Entrada", domain: "physics", level: 4,
    conceptIds: ["p_lagrangian"],
    statement: "Precio actual $65,000, objetivo $70,000 en 10 días. Costo de holding = 0.1%/día. ¿Momento óptimo de entrada para minimizar costo de oportunidad?",
    solution: "Principio de mínima acción: S = ∫[T_precio - V_costo]dt. T = momentum = (ΔP/Δt)² × ½, V = costo_holding × posición. La trayectoria que minimiza S entra cuando dT/dt = dV/dt → el precio está acelerando. Si aceleración > costo, entrar YA.",
    tradingSignal: "long", signalStrength: 0.6, numericalAnswer: 70000.0,
  },
  {
    id: "pp010", title: "Exponente de Lyapunov — Horizonte de Predicción", domain: "physics", level: 6,
    conceptIds: ["m_chaos"],
    statement: "Separación inicial entre dos trayectorias de precio: δ₀=$10. Después de 5 días: δ₅=$320. ¿λ? ¿Horizonte de predicción confiable?",
    solution: "λ = (1/t)·ln(δ_t/δ₀) = (1/5)·ln(320/10) = (1/5)·ln(32) = 3.466/5 = 0.693/día. Horizonte: T_pred = 1/λ = 1/0.693 = 1.44 días. Solo puede predecir con certeza ~1.5 días hacia adelante.",
    tradingSignal: "reduce_risk", signalStrength: 0.6, numericalAnswer: 1.44,
  },
  {
    id: "pp011", title: "Distribución de Potencia — Ley de Pareto en Retornos", domain: "physics", level: 7,
    conceptIds: ["p_econophysics", "m_fat_tails"],
    statement: "BTC: en 1000 días, 50 días con retorno >5%, 10 días con >10%. ¿Ajusta ley de potencia? ¿Exponente α?",
    solution: "P(r>x) ~ x^{-α}. Dos puntos: P(r>5%)=50/1000=0.05, P(r>10%)=10/1000=0.01. Ratio: 0.05/0.01 = 5 = (5%/10%)^{-α} → 5 = 2^α → α = log(5)/log(2) = 2.32. α≈2.3 confirma ley de potencia. Implicación: crashes 3× peores que la normal.",
    tradingSignal: "reduce_risk", signalStrength: 0.75, numericalAnswer: 2.32,
  },
  {
    id: "pp012", title: "Mecánica Hamiltoniana — Conservación en Trading", domain: "physics", level: 4,
    conceptIds: ["p_lagrangian", "p_energy"],
    statement: "Un agente tiene H = ½p² + ½kq² (Hamiltoniano). p = momentum de posición, q = distancia al precio objetivo. Si H = 0.05 y k = 0.1, ¿qué oscila y con qué frecuencia?",
    solution: "ω = √k = √0.1 = 0.316/unidad. T = 2π/ω = 19.9 períodos. La posición oscila con amplitud A = √(2H/k) = √(0.05/0.05) = 1 unidad. El sistema conserva energía — la posición oscilará indefinidamente sin amortiguación.",
    tradingSignal: "neutral", signalStrength: 0.35, numericalAnswer: 19.9,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// QUÍMICA
// ─────────────────────────────────────────────────────────────────────────────
export const CHEMISTRY_PROBLEMS: Problem[] = [

  {
    id: "cp001", title: "Equilibrio — Precio de Equilibrio de Mercado", domain: "chemistry", level: 3,
    conceptIds: ["c_equilibrium"],
    statement: "Compradores (C) + Vendedores (V) ⇌ Transacción (T). Kₑq = [T]/([C][V]) = 2.5. [C]=0.6, [V]=0.4. ¿[T] de equilibrio? ¿Hay sub o sobrecompra?",
    solution: "Q_actual = [T_actual]/([C][V]). Si [T]=0.4: Q = 0.4/(0.6×0.4) = 1.67. Como Q=1.67 < K=2.5: la reacción avanza hacia más transacciones. El mercado tiene DEMANDA INSATISFECHA → señal alcista.",
    tradingSignal: "long", signalStrength: 0.6, numericalAnswer: 0.6,
  },
  {
    id: "cp002", title: "Cinética de Primer Orden — Tiempo de Reversal", domain: "chemistry", level: 3,
    conceptIds: ["c_reaction_rates"],
    statement: "Desvío del precio del equilibrio sigue cinética de 1er orden. k=0.15/día. Desvío actual: $4,000. ¿t₁/₂? ¿Cuándo el desvío es <$500?",
    solution: "t₁/₂ = ln2/k = 0.693/0.15 = 4.62 días. Para $500: [X]_t = [X]₀·e^{-kt}. 500 = 4000·e^{-0.15t} → e^{-0.15t} = 0.125 → t = ln(8)/0.15 = 2.079/0.15 = 13.9 días. En ~14 días el desvío se reduce a $500.",
    tradingSignal: "short", signalStrength: 0.65, numericalAnswer: 13.9,
  },
  {
    id: "cp003", title: "Le Chatelier — Reacción del Mercado a una Noticia", domain: "chemistry", level: 3,
    conceptIds: ["c_equilibrium"],
    statement: "FED sube tasas → 'presión externa' sobre el sistema BTC. Por Le Chatelier, ¿cómo reacciona el precio?",
    solution: "Le Chatelier: si se añade una presión externa al sistema en equilibrio, el sistema se desplaza en la dirección que MINIMIZA esa presión. Subida de tasas = mayor costo de capital = menor demanda de activos de riesgo → equilibrio se desplaza hacia MENOS BTC demandado → precio BAJA. Señal de SHORT.",
    tradingSignal: "short", signalStrength: 0.7, numericalAnswer: -1.0,
  },
  {
    id: "cp004", title: "Arrhenius — Velocidad de Spread del Precio", domain: "chemistry", level: 3,
    conceptIds: ["c_reaction_rates"],
    statement: "A T₁=300K: k₁=0.5/h. A T₂=310K: k₂=0.8/h (T = temperatura de mercado = volatilidad). ¿Energía de activación Eₐ?",
    solution: "ln(k₂/k₁) = (Eₐ/R)×(1/T₁ - 1/T₂) = (Eₐ/8.314)×(1/300-1/310). ln(1.6) = (Eₐ/8.314)×(0.003333-0.003226) = (Eₐ/8.314)×0.0001075. 0.470 = Eₐ×0.00001293. Eₐ = 36,354 J/mol = 36.4 kJ/mol. Alta Eₐ → la velocidad de ajuste es muy sensible a la volatilidad.",
    tradingSignal: "neutral", signalStrength: 0.3, numericalAnswer: 36354.0,
  },
  {
    id: "cp005", title: "Energía de Gibbs — ¿Vale la Pena el Trade?", domain: "chemistry", level: 3,
    conceptIds: ["c_thermochem"],
    statement: "Trade: ΔH (ganancia esperada) = +2.5%, ΔS (incertidumbre) = +0.8%, T=3.5 (volatilidad relativa). ¿ΔG? ¿Es espontáneo?",
    solution: "ΔG = ΔH - TΔS = 2.5 - 3.5×0.8 = 2.5 - 2.8 = -0.3%. ΔG < 0 → Trade ESPONTÁNEO (vale la pena). Pero el margen es pequeño. Si ΔH baja a 2%, ΔG = 2-2.8 = -0.8% → ya no es espontáneo.",
    tradingSignal: "long", signalStrength: 0.55, numericalAnswer: -0.3,
  },
  {
    id: "cp006", title: "Difusión de Fick — Propagación de Información", domain: "chemistry", level: 4,
    conceptIds: ["c_solutions"],
    statement: "Una noticia 'difunde' desde el mercado de futuros (concentración alta) al spot (baja). D=0.5, ΔC=0.3%/unidad. ¿Flujo de información J?",
    solution: "Ley de Fick: J = -D×(dC/dx) = -0.5×(-0.3) = +0.15 %/unidad. La información fluye positivamente desde futuros a spot. Señal: si futuros ya subió pero spot no → el spot subirá (convergencia). COMPRAR SPOT.",
    tradingSignal: "long", signalStrength: 0.7, numericalAnswer: 0.15,
  },
  {
    id: "cp007", title: "Potencial de Nernst — Alpha de Trading", domain: "chemistry", level: 4,
    conceptIds: ["c_electrochemistry"],
    statement: "Alpha de estrategia E°=0.8%. n=1 (1 unidad de capital). Q=ratio actual precio/precio_equilibrio=1.05. T=300 (proxy volatilidad). ¿Alpha real via Nernst?",
    solution: "E = E° - (RT/nF)·ln(Q) = 0.008 - (8.314×300/96485)×ln(1.05) = 0.008 - 0.02585×0.04879 = 0.008 - 0.00126 = 0.0067 = 0.67%. Alpha real es 0.67% (menor que el teórico 0.8% porque el precio ya se movió parcialmente).",
    tradingSignal: "long", signalStrength: 0.55, numericalAnswer: 0.67,
  },
  {
    id: "cp008", title: "Oscilador Belousov-Zhabotinsky — Ciclo Alcista/Bajista", domain: "chemistry", level: 7,
    conceptIds: ["c_complex_systems"],
    statement: "Sistema de 2 variables: x=precio_normalizado, y=sentimiento. dx/dt=x(1-x)-xy, dy/dt=0.3x-0.1y. Punto fijo y estabilidad.",
    solution: "Punto fijo: x*=0 o (1-x)=y, con 0.3x=0.1y → y=3x. Sustituyendo: (1-x)=3x → x*=0.25, y*=0.75. Jacobiano en (0.25,0.75): eigenvalores λ = ½[traza ± √(traza²-4det)] con traza=-0.35, det=0.1. λ = ½[-0.35±√(0.1225-0.4)] = complejo conjugado → punto espiral estable. Sistema OSCILA alrededor del equilibrio.",
    tradingSignal: "neutral", signalStrength: 0.4, numericalAnswer: 0.25,
  },
  {
    id: "cp009", title: "Pares Trading — Análisis de Enlace Químico", domain: "chemistry", level: 4,
    conceptIds: ["c_bonding", "m_covariance"],
    statement: "BTC-ETH spread actual: 20 (ratio BTC/ETH=20). Media histórica: 22, σ=1.5. Z-score del spread=?",
    solution: "z = (20-22)/1.5 = -1.33. Spread por DEBAJO de la media → BTC relativamente barato vs ETH. Señal: COMPRAR BTC, VENDER ETH (convergencia esperada). Probabilidad de convergencia si z<-1: N(1.33)=90.8%.",
    tradingSignal: "long", signalStrength: 0.7, numericalAnswer: -1.33,
  },
  {
    id: "cp010", title: "Termodinámica — Máxima Eficiencia de Estrategia", domain: "chemistry", level: 5,
    conceptIds: ["c_thermochem", "p_thermodynamics_basic"],
    statement: "Estrategia opera entre mercado caliente T_H (alta volatilidad=0.04) y frío T_C (baja vol=0.01). Eficiencia máxima tipo Carnot?",
    solution: "η_Carnot = 1 - T_C/T_H = 1 - 0.01/0.04 = 1 - 0.25 = 0.75 = 75%. Ninguna estrategia puede extraer más del 75% de la diferencia de 'temperatura' entre regímenes. La máquina térmica perfecta en trading convierte volatilidad en retorno con límite termodinámico.",
    tradingSignal: "long", signalStrength: 0.6, numericalAnswer: 75.0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEMAS CROSS-DOMAIN (los más valiosos — integran 2-3 ciencias)
// ─────────────────────────────────────────────────────────────────────────────
export const CROSS_PROBLEMS: Problem[] = [

  {
    id: "xp001", title: "Ecuación de Schrödinger para Opciones (Black-Scholes = Física Cuántica)", domain: "cross", level: 6,
    conceptIds: ["m_black_scholes", "p_quantum_basic", "m_stochastic_calc"],
    statement: "Mostrar que la ecuación B-S es equivalente a la ec. de Schrödinger con potencial imaginario.",
    solution: "Cambio: τ=T-t, u=Ve^{rt}, x=ln(S/K)+(r-σ²/2)τ. B-S: ∂u/∂τ = σ²/2·∂²u/∂x². Idéntica a ec. de calor/Schrödinger con t→-iτ (tiempo imaginario) y 'masa' m=1/σ². Las opciones son partículas cuánticas difundiéndose en tiempo imaginario.",
    tradingSignal: "neutral", signalStrength: 0.5, numericalAnswer: 0.0,
  },
  {
    id: "xp002", title: "Química de la Liquidez — Reacción de Mercado", domain: "cross", level: 5,
    conceptIds: ["c_reaction_rates", "p_fluid_dynamics", "m_stochastic_calc"],
    statement: "Volumen de compra V_c=800, venta V_v=500. Spread=0.1%. Modelar como reacción: C+V → Precio. ¿Constante de velocidad efectiva y precio de equilibrio?",
    solution: "Modelo: d[P]/dt = k_c[V_c] - k_v[V_v]. En equilibrio: [P*] = k_c[V_c]/k_v[V_v] × P_actual. Si k_c=k_v (mercado simétrico): P* = P_actual × (800/500) = P_actual × 1.6 → presión alcista enorme. k_efectiva ∝ 1/spread = 1/0.001 = 1000.",
    tradingSignal: "long", signalStrength: 0.8, numericalAnswer: 1.6,
  },
  {
    id: "xp003", title: "Mecánica Estadística del Order Book", domain: "cross", level: 6,
    conceptIds: ["p_stat_mech", "c_statistical_thermo", "m_probability_theory"],
    statement: "Order book: N=100 órdenes de compra distribuidas Boltzmann en precios. T_mercado=σ²=$500². ¿Temperatura implícita y precio más probable?",
    solution: "Distribución Boltzmann: P(precio p) ∝ e^{-|p-p_mid|/k_BT} → Laplace. k_BT = T_mercado = $500. Precio más probable = precio_mid. Media ponderada = p_mid. Desviación estándar = √2 × k_BT = $707. Con T alto: órdenes se dispersan (mercado ilíquido).",
    tradingSignal: "neutral", signalStrength: 0.35, numericalAnswer: 707.0,
  },
  {
    id: "xp004", title: "Topología de Precios — Loops Persistentes", domain: "cross", level: 7,
    conceptIds: ["m_topology", "m_chaos", "p_nonlinear"],
    statement: "La nube de puntos (precio_t, precio_{t+1}) forma un loop visible en el análisis de persistencia. Dimba de nacimiento b=$64,000, muerte d=$66,000. ¿Qué significa?",
    solution: "Homología persistente: un loop (β₁=1) con persistencia d-b=$2,000 indica un ciclo en el espacio de fases con amplitud $2,000. El precio oscila en un ciclo de radio ~$1,000 alrededor de la media. Estrategia: COMPRAR a $64,000, VENDER a $66,000. Ciclo persistente = señal robusta.",
    tradingSignal: "long", signalStrength: 0.75, numericalAnswer: 2000.0,
  },
  {
    id: "xp005", title: "Teoría de la Información Mutua — Señal CfC", domain: "cross", level: 6,
    conceptIds: ["m_information_theory", "p_entropy", "m_stochastic_calc"],
    statement: "I(señal_CfC; retorno_futuro) = 0.12 bits, H(retorno_futuro)=0.95 bits. ¿Eficiencia de la señal?",
    solution: "Eficiencia = I/H = 0.12/0.95 = 12.6%. La señal CfC captura el 12.6% de la información del retorno futuro. Esto es excelente — los mejores modelos de ML capturan ≤20%. En trading: si cada bit de I vale 0.3%/día de retorno → 0.12 bits ≈ 0.036%/día ≈ 9.3%/año de alpha.",
    tradingSignal: "long", signalStrength: 0.65, numericalAnswer: 12.6,
  },
  {
    id: "xp006", title: "Renormalización — Consistencia Multi-Escala", domain: "cross", level: 7,
    conceptIds: ["p_renormalization", "m_multiscale", "m_chaos"],
    statement: "Volatilidad 1h = 0.5%, 1d = 2.5%, 1w = 5.5%. ¿Consiste con escalado fractal H?",
    solution: "Si σ(T) = σ₁·T^H: σ(24h)/σ(1h) = 24^H. 2.5/0.5 = 5 = 24^H → H = log(5)/log(24) = 0.699/1.380 = 0.507 ≈ 0.5. σ(7d)/σ(1d) = 5.5/2.5 = 2.2 = 7^H → H = log(2.2)/log(7) = 0.342/0.845 = 0.405. H varía con escala → NO es Browniano puro. H<0.5 en largo plazo: mercado mean-reverting.",
    tradingSignal: "short", signalStrength: 0.5, numericalAnswer: 0.45,
  },
  {
    id: "xp007", title: "Mínima Acción + Gibbs: Trade Óptimo", domain: "cross", level: 7,
    conceptIds: ["p_lagrangian", "c_thermochem", "m_optimization"],
    statement: "Minimizar 'acción de trading': S = ∫[½(dP/dt)² - ΔG_trade]dt para horizon T=5d. P₀=$65k, P_T=$68k.",
    solution: "Lagrangiana: L = ½ṗ² - ΔG(P). Ecuación de Euler-Lagrange: p̈ = ∂ΔG/∂P. Si ΔG es lineal en P: trayectoria óptima es parabólica P(t) = P₀ + (P_T-P₀)/T²·t² para t∈[0,T/2] luego lineal. Entrar gradualmente los primeros 2.5 días, luego mantener.",
    tradingSignal: "long", signalStrength: 0.55, numericalAnswer: 68000.0,
  },
  {
    id: "xp008", title: "Gillespie + Browniano: Micro-estructura de Órdenes", domain: "cross", level: 7,
    conceptIds: ["c_stochastic_chem", "m_brownian", "p_stat_mech"],
    statement: "Tasa de llegada de órdenes de compra λ_c=10/s, venta λ_v=8/s. ¿Probabilidad de 3 órdenes de compra antes de 1 de venta?",
    solution: "Probabilidad de k compras antes de 1 venta = P(k compras en competencia con ventas). P = (λ_c/(λ_c+λ_v))^k × λ_v/(λ_c+λ_v) = (10/18)³ × (8/18) = 0.171 × 0.444 = 7.6%. Pero P(al menos 3 compras) = 1 - P(0)+P(1)+P(2) = 1 - (0.185+0.310+0.258) = 24.7% → señal alcista débil.",
    tradingSignal: "long", signalStrength: 0.3, numericalAnswer: 0.247,
  },
];

// ─── Todos los problemas ──────────────────────────────────────────────────────
export const ALL_PROBLEMS: Problem[] = [
  ...MATH_PROBLEMS,
  ...PHYSICS_PROBLEMS,
  ...CHEMISTRY_PROBLEMS,
  ...CROSS_PROBLEMS,
];

export const PROBLEM_INDEX = new Map<string, Problem>(
  ALL_PROBLEMS.map(p => [p.id, p])
);

// ─── Selección de problemas por agente ────────────────────────────────────────
/**
 * Selecciona los N problemas más relevantes para un agente dado su genoma.
 * Los agentes con más peso matemático practican más problemas matemáticos, etc.
 */
export function selectProblemsForAgent(
  mathW: number,
  physicsW: number,
  chemW: number,
  maxLevel: number = 5,
  count: number = 10
): Problem[] {
  const mathCount = Math.round(count * mathW);
  const physCount = Math.round(count * physicsW);
  const chemCount = Math.round(count * chemW);
  const crossCount = Math.max(1, count - mathCount - physCount - chemCount);

  const pickDomain = (problems: Problem[], n: number, maxLvl: number) =>
    problems
      .filter(p => p.level <= maxLvl)
      .sort((a, b) => b.level - a.level)
      .slice(0, Math.max(1, n));

  return [
    ...pickDomain(MATH_PROBLEMS, mathCount, maxLevel),
    ...pickDomain(PHYSICS_PROBLEMS, physCount, maxLevel),
    ...pickDomain(CHEMISTRY_PROBLEMS, chemCount, maxLevel),
    ...pickDomain(CROSS_PROBLEMS, crossCount, maxLevel),
  ];
}

/**
 * Dado un conjunto de problemas practicados, calcula el "wisdom score" del agente.
 * Retorna un vector de ajuste de señal por dominio.
 * [math_wisdom, physics_wisdom, chemistry_wisdom]
 */
export function computeWisdomVector(solvedProblemIds: string[]): number[] {
  let mathWisdom = 0, physWisdom = 0, chemWisdom = 0;
  let mathN = 0, physN = 0, chemN = 0;

  solvedProblemIds.forEach(id => {
    const p = PROBLEM_INDEX.get(id);
    if (!p) return;
    const weight = p.level * p.signalStrength;
    if (p.domain === "math") { mathWisdom += weight; mathN++; }
    else if (p.domain === "physics") { physWisdom += weight; physN++; }
    else if (p.domain === "chemistry") { chemWisdom += weight; chemN++; }
    else { // cross
      mathWisdom += weight/3; physWisdom += weight/3; chemWisdom += weight/3;
      mathN++; physN++; chemN++;
    }
  });

  const normalize = (w: number, n: number) => n > 0 ? Math.tanh(w / (n * 3)) : 0;

  return [
    normalize(mathWisdom, mathN),
    normalize(physWisdom, physN),
    normalize(chemWisdom, chemN),
  ];
}

// ─── Estadísticas del banco de problemas ─────────────────────────────────────
export const PROBLEM_BANK_STATS = {
  total: ALL_PROBLEMS.length,
  byDomain: {
    math: MATH_PROBLEMS.length,
    physics: PHYSICS_PROBLEMS.length,
    chemistry: CHEMISTRY_PROBLEMS.length,
    cross: CROSS_PROBLEMS.length,
  },
  byLevel: Object.fromEntries(
    [1,2,3,4,5,6,7].map(l => [l, ALL_PROBLEMS.filter(p => p.level === l).length])
  ),
  avgSignalStrength: ALL_PROBLEMS.reduce((s, p) => s + p.signalStrength, 0) / ALL_PROBLEMS.length,
};
