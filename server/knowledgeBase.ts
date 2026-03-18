/**
 * KNOWLEDGE BASE — Currículo Doctoral Completo
 * =============================================
 * De guardería a doctorado en Matemáticas, Física y Química.
 * Diseñado para los agentes CfC: el conocimiento es el músculo y esqueleto.
 * El sistema nervioso (CfC+GAT) lo interpreta y aplica al trading.
 *
 * Estructura por nivel educativo:
 *   L1: Guardería/Primaria  (conceptos cualitativos, intuición)
 *   L2: Secundaria          (álgebra, geometría, química básica)
 *   L3: Bachillerato        (cálculo, física clásica, química orgánica)
 *   L4: Universidad 1-2     (análisis, mecánica clásica, termodinámica)
 *   L5: Universidad 3-4     (análisis complejo, mecánica cuántica, fisicoquímica)
 *   L6: Maestría            (topología, relatividad, química computacional)
 *   L7: Doctorado           (geometría diferencial, QFT, dinámica no lineal)
 *
 * Cada concepto tiene:
 *   - id, name, domain, level
 *   - formula: ecuación/fórmula clave (LaTeX-like string)
 *   - insight: qué le enseña este concepto al agente sobre los mercados
 *   - tradingAnalogy: cómo aplica directamente en trading
 *   - numericalValue: valor o constante clave si aplica
 */

export type Domain = "math" | "physics" | "chemistry";
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Concept {
  id: string;
  name: string;
  domain: Domain;
  level: Level;
  formula: string;
  insight: string;
  tradingAnalogy: string;
  numericalValue?: number; // constante relevante si existe
  relatedConcepts: string[]; // ids de conceptos relacionados
}

// ─────────────────────────────────────────────────────────────────────────────
// MATEMÁTICAS — L1 a L7
// ─────────────────────────────────────────────────────────────────────────────
export const MATH_CONCEPTS: Concept[] = [

  // ── L1: Guardería/Primaria ──
  {
    id: "m_counting", name: "Conteo y Números Naturales", domain: "math", level: 1,
    formula: "N = {0, 1, 2, 3, ...}",
    insight: "Los precios son secuencias discretas. Contar ticks es la base de cualquier análisis.",
    tradingAnalogy: "Cada tick del mercado es un número natural en la secuencia de tiempo.",
    relatedConcepts: ["m_sequences"],
  },
  {
    id: "m_ratio", name: "Razones y Proporciones", domain: "math", level: 1,
    formula: "a/b = c/d → ad = bc",
    insight: "El ratio precio/valor es la esencia de la valoración de activos.",
    tradingAnalogy: "PnL% = (precio_salida - precio_entrada) / precio_entrada",
    relatedConcepts: ["m_pct_change"],
  },
  {
    id: "m_pct_change", name: "Cambio Porcentual", domain: "math", level: 1,
    formula: "Δ% = (x₂ - x₁) / x₁ × 100",
    insight: "El retorno de una posición es un cambio porcentual.",
    tradingAnalogy: "Retorno = (P_salida - P_entrada) / P_entrada — la métrica más fundamental del trading.",
    relatedConcepts: ["m_ratio", "m_log_return"],
  },

  // ── L2: Secundaria ──
  {
    id: "m_sequences", name: "Sucesiones y Series", domain: "math", level: 2,
    formula: "Sₙ = Σᵢ aᵢ, aritmética: aₙ = a₁ + (n-1)d, geométrica: aₙ = a₁·rⁿ⁻¹",
    insight: "Los precios son series temporales. Las series geométricas modelan el interés compuesto.",
    tradingAnalogy: "Interés compuesto: C_n = C₀(1+r)ⁿ — el capital crece geométricamente.",
    relatedConcepts: ["m_exponential", "m_log_return"],
  },
  {
    id: "m_functions", name: "Funciones y Transformaciones", domain: "math", level: 2,
    formula: "f: X → Y, f(x) = y",
    insight: "Un precio es una función del tiempo. Las transformaciones mapean señales a decisiones.",
    tradingAnalogy: "La estrategia es una función: f(precio_historia) → {comprar, vender, esperar}",
    relatedConcepts: ["m_continuity", "m_derivative"],
  },
  {
    id: "m_linear_algebra_basic", name: "Álgebra Lineal Básica", domain: "math", level: 2,
    formula: "Ax = b, sistema de ecuaciones lineales",
    insight: "Los portafolios son combinaciones lineales de activos.",
    tradingAnalogy: "Portafolio = Σ wᵢ · activo_i, donde wᵢ son los pesos de asignación.",
    relatedConcepts: ["m_matrices", "m_vector_spaces"],
  },
  {
    id: "m_statistics_basic", name: "Estadística Descriptiva", domain: "math", level: 2,
    formula: "μ = Σxᵢ/n, σ² = Σ(xᵢ-μ)²/n",
    insight: "Media y varianza describen la distribución de retornos. La volatilidad ES la desviación estándar.",
    tradingAnalogy: "Volatilidad σ de retornos es la medida de riesgo más usada en finanzas.",
    numericalValue: 0.02, // volatilidad diaria típica de BTC (~2%)
    relatedConcepts: ["m_normal_dist", "m_variance"],
  },

  // ── L3: Bachillerato ──
  {
    id: "m_exponential", name: "Función Exponencial y Logaritmo", domain: "math", level: 3,
    formula: "eˣ = Σ xⁿ/n!, ln(eˣ) = x, d/dx[eˣ] = eˣ",
    insight: "Los precios se mueven en escala logarítmica, no lineal. ln(P) sigue movimiento Browniano.",
    tradingAnalogy: "Log-return: r = ln(P_t/P_{t-1}) ≈ ΔP/P — simétrico y aditivo en el tiempo.",
    numericalValue: 2.71828,
    relatedConcepts: ["m_log_return", "m_brownian"],
  },
  {
    id: "m_log_return", name: "Log-Retornos", domain: "math", level: 3,
    formula: "r_t = ln(P_t) - ln(P_{t-1}) = ln(P_t/P_{t-1})",
    insight: "Los log-retornos son normalmente distribuidos (hipótesis de mercado eficiente). Son aditivos.",
    tradingAnalogy: "Retorno acumulado = Σ r_t — puedes sumar log-retornos en lugar de multiplicar factores.",
    relatedConcepts: ["m_normal_dist", "m_brownian", "m_exponential"],
  },
  {
    id: "m_derivative", name: "Derivada e Integral", domain: "math", level: 3,
    formula: "f'(x) = lim_{h→0} [f(x+h)-f(x)]/h, ∫f(x)dx = F(x) + C",
    insight: "La velocidad de cambio del precio es su derivada temporal. Integrales acumulan retornos.",
    tradingAnalogy: "Momentum = dP/dt. El Área bajo la curva de retornos = PnL acumulado.",
    relatedConcepts: ["m_ode", "m_stochastic_calc"],
  },
  {
    id: "m_continuity", name: "Límites y Continuidad", domain: "math", level: 3,
    formula: "lim_{x→a} f(x) = L ⟺ ∀ε>0, ∃δ>0: |x-a|<δ → |f(x)-L|<ε",
    insight: "Los mercados tienen discontinuidades (gaps). La continuidad se rompe en eventos extremos.",
    tradingAnalogy: "Un gap de precio es una discontinuidad: precio salta sin pasar por valores intermedios.",
    relatedConcepts: ["m_derivative", "m_fat_tails"],
  },
  {
    id: "m_normal_dist", name: "Distribución Normal", domain: "math", level: 3,
    formula: "f(x) = (1/σ√2π) exp[-(x-μ)²/2σ²], P(|X-μ|<σ) ≈ 0.683",
    insight: "Los retornos diarios se aproximan a una normal, pero con colas más gruesas (fat tails).",
    tradingAnalogy: "El 68% de los días el retorno de BTC cae dentro de ±1σ ≈ ±2%. El 32% restante son sorpresas.",
    numericalValue: 0.683,
    relatedConcepts: ["m_fat_tails", "m_statistics_basic", "m_variance"],
  },

  // ── L4: Universidad 1-2 ──
  {
    id: "m_matrices", name: "Álgebra Lineal — Matrices y Eigenvalores", domain: "math", level: 4,
    formula: "Av = λv, det(A-λI) = 0 → eigenvalores, SVD: A = UΣVᵀ",
    insight: "La covarianza entre activos es una matriz. PCA descompone en eigenvalores de varianza.",
    tradingAnalogy: "PCA de retornos: el primer eigenvalor captura el movimiento del 'mercado general' (beta).",
    relatedConcepts: ["m_covariance", "m_pca", "m_vector_spaces"],
  },
  {
    id: "m_vector_spaces", name: "Espacios Vectoriales y Normas", domain: "math", level: 4,
    formula: "||x||₂ = √(Σxᵢ²), ||x||₁ = Σ|xᵢ|, espacio Lp",
    insight: "El estado de un agente es un vector en un espacio de alta dimensión.",
    tradingAnalogy: "El portafolio es un punto en el espacio ℝⁿ de n activos. La distancia es el riesgo.",
    relatedConcepts: ["m_matrices", "m_hilbert"],
  },
  {
    id: "m_variance", name: "Varianza, Covarianza, Correlación", domain: "math", level: 4,
    formula: "Cov(X,Y) = E[(X-μₓ)(Y-μᵧ)], ρ = Cov(X,Y)/(σₓσᵧ) ∈ [-1,1]",
    insight: "La correlación entre activos determina el beneficio de la diversificación.",
    tradingAnalogy: "Si ρ(A,B) = -1, el portafolio A+B tiene varianza cero — cobertura perfecta.",
    relatedConcepts: ["m_normal_dist", "m_matrices", "m_covariance"],
  },
  {
    id: "m_covariance", name: "Matriz de Covarianza y Portafolio Eficiente", domain: "math", level: 4,
    formula: "σ²_p = wᵀΣw, Frontera Eficiente: min σ²_p s.t. wᵀμ = μ_p, Σwᵢ = 1",
    insight: "Markowitz (1952): optimizar el ratio retorno/riesgo define el portafolio óptimo.",
    tradingAnalogy: "Sharpe Ratio = (μ_p - r_f) / σ_p — el fitness score de un portafolio.",
    relatedConcepts: ["m_variance", "m_optimization"],
  },
  {
    id: "m_ode", name: "Ecuaciones Diferenciales Ordinarias", domain: "math", level: 4,
    formula: "dy/dt = f(t,y), solución: y(t) = y₀·e^{∫f dt}. EDO lineal: y' + p(t)y = q(t)",
    insight: "Las trayectorias de precios satisfacen EDOs estocásticas. CfC es una EDO continua en tiempo.",
    tradingAnalogy: "dP = μP dt + σP dW — la EDO del movimiento Browniano geométrico (modelo Black-Scholes).",
    relatedConcepts: ["m_brownian", "m_stochastic_calc", "m_pde"],
  },
  {
    id: "m_probability_theory", name: "Teoría de Probabilidad", domain: "math", level: 4,
    formula: "P(A∪B) = P(A)+P(B)-P(A∩B), E[X] = ΣxP(X=x), P(A|B) = P(A∩B)/P(B)",
    insight: "El trading es gestión de probabilidades, no certezas. Bayes actualiza creencias.",
    tradingAnalogy: "P(precio sube | gap de apertura positivo) — probabilidad condicional de señal.",
    relatedConcepts: ["m_bayes", "m_martingale", "m_normal_dist"],
  },
  {
    id: "m_optimization", name: "Optimización — Cálculo Variacional, Gradiente", domain: "math", level: 4,
    formula: "min f(x), ∇f = 0 condición necesaria, SGD: x_{t+1} = x_t - η∇f(x_t)",
    insight: "El entrenamiento del CfC es un problema de optimización. El mercado optimiza precios.",
    tradingAnalogy: "El precio de equilibrio es un punto fijo del proceso de optimización de todos los agentes.",
    relatedConcepts: ["m_convex", "m_lagrangian"],
  },

  // ── L5: Universidad 3-4 ──
  {
    id: "m_brownian", name: "Movimiento Browniano y Proceso de Wiener", domain: "math", level: 5,
    formula: "W_t ~ N(0,t), W(t+s)-W(t) ~ N(0,s), E[W_t²] = t (varianza lineal en tiempo)",
    insight: "El movimiento Browniano es el modelo canónico del precio. Varianza crece con √t.",
    tradingAnalogy: "Si el precio sigue un Wiener process, en horizonte T la incertidumbre es ∝ √T — imposible predecir a largo plazo.",
    numericalValue: 0.0, // drift nulo en forma estándar
    relatedConcepts: ["m_stochastic_calc", "m_ode", "m_fat_tails"],
  },
  {
    id: "m_stochastic_calc", name: "Cálculo de Itô y SDE", domain: "math", level: 5,
    formula: "dX = μdt + σdW, Itô: df(X) = f'dX + ½f''σ²dt (término extra vs. cálculo clásico)",
    insight: "El cálculo estocástico explica por qué las opciones financieras tienen precio no trivial.",
    tradingAnalogy: "Lema de Itô → Black-Scholes: el precio de una opción satisface una PDE exacta.",
    relatedConcepts: ["m_brownian", "m_pde", "m_black_scholes"],
  },
  {
    id: "m_complex_analysis", name: "Análisis Complejo y Transformada de Fourier", domain: "math", level: 5,
    formula: "F(ω) = ∫f(t)e^{-iωt}dt, f(t) = (1/2π)∫F(ω)e^{iωt}dω",
    insight: "La FFT descompone la señal de precio en frecuencias — detecta ciclos ocultos.",
    tradingAnalogy: "Análisis espectral del precio: la frecuencia dominante revela el período del ciclo de mercado.",
    relatedConcepts: ["m_wavelets", "m_pde"],
  },
  {
    id: "m_wavelets", name: "Wavelets y Análisis Multi-Escala", domain: "math", level: 5,
    formula: "f(t) = Σ c_{j,k} ψ_{j,k}(t), ψ_{j,k}(t) = 2^{j/2}ψ(2^j t - k)",
    insight: "Las wavelets separan tendencias de corto y largo plazo simultáneamente.",
    tradingAnalogy: "Wavelet de retornos: la escala j=1 capta ruido de alta frecuencia, j=5 la tendencia semanal.",
    relatedConcepts: ["m_complex_analysis", "m_multiscale"],
  },
  {
    id: "m_fat_tails", name: "Distribuciones de Cola Gruesa y Lévy", domain: "math", level: 5,
    formula: "P(X>x) ~ x^{-α} (ley de potencia), α < 2 → varianza infinita (proceso de Lévy)",
    insight: "Los mercados tienen colas mucho más gruesas que la normal — los crashes son más frecuentes de lo esperado.",
    tradingAnalogy: "Black Swan: P(retorno < -10% en un día) ≈ 0.0001 (normal) vs 0.01 (ley de potencia).",
    numericalValue: 1.7, // índice de cola típico para crypto
    relatedConcepts: ["m_normal_dist", "m_brownian", "m_extreme_value"],
  },
  {
    id: "m_martingale", name: "Martingalas y Precios Justos", domain: "math", level: 5,
    formula: "E[X_{t+1} | F_t] = X_t (sin drift predecible), precio = E_Q[pago futuro]/B_t",
    insight: "Bajo la medida de probabilidad neutral al riesgo (Q), el precio descontado es una martingala.",
    tradingAnalogy: "Un mercado eficiente = precio es martingala. Si hay predicción, el mercado no es eficiente.",
    relatedConcepts: ["m_stochastic_calc", "m_black_scholes"],
  },
  {
    id: "m_black_scholes", name: "Black-Scholes y Pricing de Opciones", domain: "math", level: 5,
    formula: "∂V/∂t + ½σ²S²∂²V/∂S² + rS∂V/∂S - rV = 0, C = SN(d₁) - Ke^{-rT}N(d₂)",
    insight: "Las opciones cuantifican el valor del derecho a comprar/vender — base del hedging.",
    tradingAnalogy: "La volatilidad implícita de opciones predice la volatilidad futura mejor que la histórica.",
    relatedConcepts: ["m_stochastic_calc", "m_pde", "m_martingale"],
  },
  {
    id: "m_pde", name: "Ecuaciones en Derivadas Parciales", domain: "math", level: 5,
    formula: "∂u/∂t = κ∇²u (calor), ∂²u/∂t² = c²∇²u (onda), ut + uux = νuxx (Burgers)",
    insight: "La ecuación del calor = difusión de precios. La ec. de onda = propagación de información.",
    tradingAnalogy: "El precio 'difunde' desde el punto de equilibrio como el calor en un conductor.",
    relatedConcepts: ["m_black_scholes", "m_stochastic_calc"],
  },

  // ── L6: Maestría ──
  {
    id: "m_information_theory", name: "Teoría de la Información (Shannon)", domain: "math", level: 6,
    formula: "H(X) = -Σ p(x)log₂p(x), I(X;Y) = H(X) - H(X|Y) (información mutua)",
    insight: "La entropía de Shannon mide el desorden del mercado. Alta entropía = tendencia aleatoria.",
    tradingAnalogy: "Baja entropía en retornos → mercado tiene 'memoria' → estrategias de momentum funcionan.",
    relatedConcepts: ["m_bayes", "m_stat_mech_relevance"],
  },
  {
    id: "m_bayes", name: "Inferencia Bayesiana", domain: "math", level: 6,
    formula: "P(θ|D) = P(D|θ)P(θ)/P(D), actualización: posterior ∝ likelihood × prior",
    insight: "El agente debe actualizar su creencia sobre el estado del mercado con cada nuevo precio.",
    tradingAnalogy: "Prior: 'el mercado sube'. Likelihood: datos de hoy. Posterior: creencia actualizada para mañana.",
    relatedConcepts: ["m_probability_theory", "m_kalman"],
  },
  {
    id: "m_kalman", name: "Filtro de Kalman", domain: "math", level: 6,
    formula: "x̂_{t|t} = x̂_{t|t-1} + K_t(y_t - Hx̂_{t|t-1}), K_t = P_{t|t-1}H^T(HP_{t|t-1}H^T+R)^{-1}",
    insight: "El filtro de Kalman es el estimador óptimo de estados latentes en sistemas lineales-Gaussianos.",
    tradingAnalogy: "Kalman en precio: estima el 'precio verdadero' eliminando ruido. Usado en pairs trading.",
    relatedConcepts: ["m_bayes", "m_stochastic_calc"],
  },
  {
    id: "m_topology", name: "Topología y Análisis de Datos Topológicos", domain: "math", level: 6,
    formula: "Homología persistente: β₀ = componentes, β₁ = loops, diagrama de persistencia (b,d)",
    insight: "La topología detecta estructuras geométricas en datos de alta dimensión sin métricas arbitrarias.",
    tradingAnalogy: "TDA aplicada a precios: detecta 'loops' en el espacio de fases — ciclos recurrentes del mercado.",
    relatedConcepts: ["m_manifold", "m_complex_analysis"],
  },
  {
    id: "m_ergodic", name: "Teoría Ergódica y Tiempo Promedio", domain: "math", level: 6,
    formula: "lim_{T→∞} (1/T)∫₀ᵀ f(φ_t x)dt = ∫f dμ (promedio temporal = promedio espacial)",
    insight: "Ergodicidad implica que el promedio histórico converge al esperado — base del backtesting.",
    tradingAnalogy: "Si el mercado es ergódico, el backtest sobre historia predice rendimiento futuro. Pero no siempre lo es.",
    relatedConcepts: ["m_stochastic_calc", "m_chaos"],
  },
  {
    id: "m_chaos", name: "Sistemas Caóticos y Exponente de Lyapunov", domain: "math", level: 6,
    formula: "λ = lim_{t→∞} (1/t)ln|δx(t)/δx(0)|, λ>0 → caótico, horizonte de predicción ~ 1/λ",
    insight: "Los mercados son parcialmente caóticos. El exponente de Lyapunov da el horizonte de predicción.",
    tradingAnalogy: "Si λ_precio ≈ 0.1/día, el horizonte de predicción fiable es ~10 días. Más allá: impredecible.",
    numericalValue: 0.1,
    relatedConcepts: ["m_ergodic", "m_attractor"],
  },

  // ── L7: Doctorado ──
  {
    id: "m_manifold", name: "Geometría Diferencial y Variedades", domain: "math", level: 7,
    formula: "Variedad M, carta (U,φ), métrica g_{ij}, curvatura R^i_{jkl} (Riemann)",
    insight: "El espacio de estrategias de trading tiene geometría no euclidiana.",
    tradingAnalogy: "La información de Fisher define una métrica en el espacio de distribuciones de precios.",
    relatedConcepts: ["m_topology", "m_information_geometry"],
  },
  {
    id: "m_information_geometry", name: "Geometría de la Información", domain: "math", level: 7,
    formula: "g_{ij}(θ) = E[∂logp/∂θᵢ · ∂logp/∂θⱼ] (métrica de Fisher), geodésica = actualización óptima",
    insight: "La dirección de mayor información en el espacio de parámetros es la geodésica de Fisher.",
    tradingAnalogy: "El paso de actualización óptimo del CfC sigue la geodésica de Fisher en el espacio de parámetros.",
    relatedConcepts: ["m_manifold", "m_bayes"],
  },
  {
    id: "m_pca", name: "PCA y Análisis de Componentes", domain: "math", level: 7,
    formula: "X = UΣVᵀ, Componentes: Vᵀx, varianza explicada: σᵢ²/Σσⱼ²",
    insight: "PCA en retornos: el 1er componente = factor de mercado (≈60% varianza). Los demás: sectores.",
    tradingAnalogy: "Factores de Fama-French son componentes principales de retornos transversales.",
    relatedConcepts: ["m_matrices", "m_covariance"],
  },
  {
    id: "m_extreme_value", name: "Teoría de Valores Extremos (EVT)", domain: "math", level: 7,
    formula: "GEV: F(x) = exp{-[1+ξ(x-μ)/σ]^{-1/ξ}}, Fréchet (ξ>0) para mercados financieros",
    insight: "EVT modela la probabilidad de crashes extremos con rigor matemático.",
    tradingAnalogy: "VaR extremo (Expected Shortfall): pérdida esperada en el peor 1% de días — regulación Basel III.",
    numericalValue: 0.3, // típico ξ para crypto
    relatedConcepts: ["m_fat_tails", "m_risk_measure"],
  },
  {
    id: "m_risk_measure", name: "Medidas de Riesgo Coherentes (VaR, CVaR)", domain: "math", level: 7,
    formula: "VaR_α = -inf{x: P(L>x) ≤ 1-α}, CVaR_α = E[L | L > VaR_α]",
    insight: "CVaR (Expected Shortfall) captura el riesgo de la cola. VaR falla en coherencia (no es convexo).",
    tradingAnalogy: "El agente calcula CVaR de su posición para decidir el tamaño. Drawdown > CVaR → cerrar.",
    relatedConcepts: ["m_extreme_value", "m_covariance"],
  },
  {
    id: "m_multiscale", name: "Análisis Multi-Escala y Renormalización", domain: "math", level: 7,
    formula: "Grupo de renormalización: φ(λx) = λ^Δ φ(x), función de escala Hurst H ∈ (0,1)",
    insight: "Los mercados son autosimilares en múltiples escalas de tiempo (fractalidad de Mandelbrot).",
    tradingAnalogy: "Exponente de Hurst H: H>0.5 = mercado tendencial, H<0.5 = mean-reverting, H=0.5 = random walk.",
    numericalValue: 0.6, // H típico de BTC (ligeramente tendencial)
    relatedConcepts: ["m_chaos", "m_wavelets", "m_fat_tails"],
  },
  {
    id: "m_attractor", name: "Atractores Extraños y Dimensión Fractal", domain: "math", level: 7,
    formula: "d_f = lim_{ε→0} logN(ε)/log(1/ε), Lorenz: d_f ≈ 2.06 (dimensión no entera)",
    insight: "El 'atractor' del mercado tiene dimensión fractal — no es caos puro ni orden puro.",
    tradingAnalogy: "La dimensión fractal del precio de BTC ≈ 1.5 — más irregular que una línea, menos que un plano.",
    numericalValue: 1.5,
    relatedConcepts: ["m_chaos", "m_multiscale"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FÍSICA — L1 a L7
// ─────────────────────────────────────────────────────────────────────────────
export const PHYSICS_CONCEPTS: Concept[] = [

  // ── L1 ──
  {
    id: "p_motion", name: "Movimiento y Velocidad", domain: "physics", level: 1,
    formula: "v = Δx/Δt, a = Δv/Δt",
    insight: "El momentum del precio es su velocidad. La aceleración es el cambio de la tasa de cambio.",
    tradingAnalogy: "Momentum = velocidad del precio. Reversal = desaceleración y cambio de dirección.",
    relatedConcepts: ["p_newton", "p_momentum"],
  },
  {
    id: "p_energy", name: "Energía y Trabajo", domain: "physics", level: 1,
    formula: "E = ½mv², W = F·d, E_cinética + E_potencial = constante",
    insight: "El precio tiene 'energía cinética' (momentum) y 'energía potencial' (distancia al equilibrio).",
    tradingAnalogy: "Precio lejos del equilibrio (soporte/resistencia) tiene alta energía potencial → tiende a retornar.",
    relatedConcepts: ["p_harmonic_osc", "p_lagrangian"],
  },

  // ── L2 ──
  {
    id: "p_newton", name: "Leyes de Newton", domain: "physics", level: 2,
    formula: "F = ma, F₁₂ = -F₂₁ (3ª ley), Inercia: objeto en reposo sigue en reposo",
    insight: "La tendencia de precio tiende a persistir (inercia). Una fuerza externa (noticia) la cambia.",
    tradingAnalogy: "Trending market = inercia de la tendencia. News shock = fuerza externa que cambia dirección.",
    relatedConcepts: ["p_momentum", "p_harmonic_osc"],
  },
  {
    id: "p_waves", name: "Ondas y Oscilaciones", domain: "physics", level: 2,
    formula: "y(x,t) = A·sin(kx - ωt + φ), v = ω/k, T = 2π/ω",
    insight: "Los ciclos del mercado se modelan como ondas. La superposición de ondas crea interferencia.",
    tradingAnalogy: "Análisis de ondas de Elliott: ciclos de precios como superposición de ondas de distintos períodos.",
    relatedConcepts: ["p_harmonic_osc", "m_complex_analysis"],
  },
  {
    id: "p_momentum", name: "Momento Lineal y Angular", domain: "physics", level: 2,
    formula: "p = mv, L = r×p, conservación: Δp = F·Δt (impulso)",
    insight: "El momentum del precio se conserva en ausencia de fuerzas externas (noticias, regulación).",
    tradingAnalogy: "Estrategia de momentum: comprar activos con alto p = mv (precio × volumen reciente).",
    relatedConcepts: ["p_newton", "p_fluids"],
  },

  // ── L3 ──
  {
    id: "p_harmonic_osc", name: "Oscilador Armónico", domain: "physics", level: 3,
    formula: "mẍ + kx = 0, ω₀ = √(k/m), x(t) = A·cos(ω₀t + φ), E = ½kA²",
    insight: "El precio oscila alrededor del equilibrio como una masa en un resorte (Ley de Hooke).",
    tradingAnalogy: "Mean reversion: la 'constante del resorte' k determina la velocidad de retorno a la media.",
    numericalValue: 0.0, // frecuencia natural varía por activo
    relatedConcepts: ["p_waves", "p_energy", "p_damped_osc"],
  },
  {
    id: "p_damped_osc", name: "Oscilador Amortiguado y Forzado", domain: "physics", level: 3,
    formula: "mẍ + cẋ + kx = F₀cos(ωt), resonancia: ω = ω₀, amplitud máxima",
    insight: "La liquidez amortigua las oscilaciones del precio. La resonancia ocurre cuando la frecuencia del mercado alinea con ciclos externos.",
    tradingAnalogy: "Resonancia de precio: cuando el ciclo de noticias (forcing) coincide con el ciclo natural del activo.",
    relatedConcepts: ["p_harmonic_osc", "p_nonlinear"],
  },
  {
    id: "p_thermodynamics_basic", name: "Termodinámica Clásica", domain: "physics", level: 3,
    formula: "dU = δQ - δW (1ª ley), δS ≥ δQ/T (2ª ley), S = k_B ln Ω",
    insight: "Los mercados tienden al equilibrio (máxima entropía). El arbitraje es un proceso termodinámico.",
    tradingAnalogy: "Arbitraje elimina ineficiencias como el calor fluye de caliente a frío — hasta el equilibrio.",
    numericalValue: 1.380649e-23, // Boltzmann constant
    relatedConcepts: ["p_stat_mech", "p_entropy"],
  },

  // ── L4 ──
  {
    id: "p_lagrangian", name: "Mecánica Lagrangiana y Hamiltoniana", domain: "physics", level: 4,
    formula: "L = T - V, S = ∫L dt, δS = 0 (principio de mínima acción), H = Σpᵢq̇ᵢ - L",
    insight: "El Hamiltoniano del sistema de trading es la función de valor total. La trayectoria óptima minimiza la acción.",
    tradingAnalogy: "Principio de mínima acción → estrategia óptima de trading: el camino de menor 'costo' hacia el objetivo.",
    relatedConcepts: ["p_energy", "p_symplectic"],
  },
  {
    id: "p_stat_mech", name: "Mecánica Estadística y Distribución Boltzmann", domain: "physics", level: 4,
    formula: "P(estado E) ∝ e^{-E/k_BT}, función de partición Z = Σ e^{-Eᵢ/k_BT}, <E> = -∂lnZ/∂β",
    insight: "Los agentes del mercado adoptan estrategias con probabilidades Boltzmann: más probable el estado de menor energía.",
    tradingAnalogy: "Temperatura de mercado T: alta T = alta volatilidad (muchos estados accesibles), baja T = precio estable.",
    numericalValue: 1.380649e-23,
    relatedConcepts: ["p_thermodynamics_basic", "p_entropy", "m_normal_dist"],
  },
  {
    id: "p_entropy", name: "Entropía en Física y Sistemas Complejos", domain: "physics", level: 4,
    formula: "S = -k_B Σ pᵢ ln pᵢ, S_max = k_B ln Ω (todos estados equiprobables), ΔS_universo ≥ 0",
    insight: "Máxima entropía = distribución más aleatoria posible. El precio en equilibrio tiene entropía máxima.",
    tradingAnalogy: "Cuando la distribución de retornos tiene alta entropía, no hay señal predecible. Baja entropía = oportunidad.",
    relatedConcepts: ["p_stat_mech", "m_information_theory"],
  },
  {
    id: "p_electromagnetism", name: "Electromagnetismo — Ecuaciones de Maxwell", domain: "physics", level: 4,
    formula: "∇·E = ρ/ε₀, ∇×B = μ₀J + μ₀ε₀∂E/∂t, ondas EM: c = 1/√(μ₀ε₀) = 3×10⁸ m/s",
    insight: "Los flujos de capital en mercados son análogos a campos electromagnéticos: fuentes, sumideros, rotación.",
    tradingAnalogy: "El flujo de capital de compradores (fuente) vs vendedores (sumidero) genera el 'campo' de precio.",
    numericalValue: 3e8,
    relatedConcepts: ["p_waves", "p_field_theory"],
  },
  {
    id: "p_fluid_dynamics", name: "Dinámica de Fluidos — Ecuaciones de Navier-Stokes", domain: "physics", level: 4,
    formula: "ρ(∂u/∂t + u·∇u) = -∇p + μ∇²u + f, ∇·u = 0 (incompresible)",
    insight: "La liquidez del mercado es análoga a la viscosidad del fluido. Turbulencia = alta volatilidad.",
    tradingAnalogy: "Mercado líquido = fluido de baja viscosidad (órdenes se ejecutan sin impacto). Ilíquido = viscoso.",
    relatedConcepts: ["p_turbulence", "p_thermodynamics_basic"],
  },

  // ── L5 ──
  {
    id: "p_quantum_basic", name: "Mecánica Cuántica — Fundamentos", domain: "physics", level: 5,
    formula: "iℏ ∂ψ/∂t = Ĥψ (Schrödinger), |ψ|² = densidad de probabilidad, ΔxΔp ≥ ℏ/2",
    insight: "La incertidumbre de Heisenberg: conocer el precio exacto ahora hace incierto el precio futuro.",
    tradingAnalogy: "Principio de incertidumbre en trading: 'observar' el mercado (colocar grandes órdenes) lo perturba.",
    numericalValue: 1.054571817e-34,
    relatedConcepts: ["p_quantum_harmonic", "p_path_integral"],
  },
  {
    id: "p_quantum_harmonic", name: "Oscilador Armónico Cuántico", domain: "physics", level: 5,
    formula: "Eₙ = ℏω(n + ½), |n⟩ estados de Fock, â|n⟩ = √n|n-1⟩, â†|n⟩ = √(n+1)|n+1⟩",
    insight: "Los niveles discretos de energía del oscilador cuántico son análogos a los niveles de soporte/resistencia.",
    tradingAnalogy: "Soporte/resistencia = nivel de energía cuántica: el precio 'salta' entre niveles, no varía continuo.",
    relatedConcepts: ["p_quantum_basic", "p_harmonic_osc"],
  },
  {
    id: "p_path_integral", name: "Integral de Camino de Feynman", domain: "physics", level: 5,
    formula: "K(xb,tb;xa,ta) = ∫Dx(t) exp[iS/ℏ], suma sobre todos los caminos posibles",
    insight: "El precio mañana es la suma ponderada de TODOS los caminos posibles — base de los modelos de opciones.",
    tradingAnalogy: "Monte Carlo de opciones = integral de camino discretizada: simular miles de trayectorias de precio.",
    relatedConcepts: ["m_stochastic_calc", "p_quantum_basic"],
  },
  {
    id: "p_renormalization", name: "Grupo de Renormalización en Física", domain: "physics", level: 5,
    formula: "RG flow: dg/dl = β(g), punto fijo g*: β(g*)=0, escalado: G(λr) = λ^{-2+η}G(r)",
    insight: "El RG describe cómo las propiedades del sistema cambian con la escala de observación.",
    tradingAnalogy: "El comportamiento del mercado en 1-min, 1-día, 1-mes — el RG conecta estas escalas.",
    relatedConcepts: ["m_multiscale", "p_critical_phenomena"],
  },
  {
    id: "p_critical_phenomena", name: "Fenómenos Críticos y Transiciones de Fase", domain: "physics", level: 5,
    formula: "ξ ~ |T-Tc|^{-ν}, <m> ~ |T-Tc|^β, susceptibilidad χ ~ |T-Tc|^{-γ} (leyes de potencia)",
    insight: "Los crashes del mercado son transiciones de fase: el sistema pasa de 'ordenado' a 'caótico'.",
    tradingAnalogy: "Antes de un crash: correlaciones de largo alcance crecen (ξ → ∞), como antes de la transición de fase.",
    relatedConcepts: ["p_renormalization", "p_stat_mech"],
  },
  {
    id: "p_turbulence", name: "Turbulencia y Cascada de Energía", domain: "physics", level: 5,
    formula: "Kolmogorov: E(k) ~ k^{-5/3}, cascada desde grandes escalas (L) a pequeñas (η)",
    insight: "La volatilidad se 'cascada' de escalas grandes (macro) a pequeñas (micro-estructura).",
    tradingAnalogy: "Volatilidad de Kolmogorov: noticias macro generan volatilidad que se transmite a alta frecuencia.",
    relatedConcepts: ["p_fluid_dynamics", "m_multiscale"],
  },

  // ── L6 ──
  {
    id: "p_field_theory", name: "Teoría Cuántica de Campos — Fundamentos", domain: "physics", level: 6,
    formula: "L = ½(∂_μφ)² - ½m²φ² - λφ⁴/4! (campo escalar), propagador ⟨φφ⟩ = i/(p²-m²)",
    insight: "QFT como modelo de mercado: cada activo es un campo cuántico, las transacciones son partículas.",
    tradingAnalogy: "Propagador = correlación temporal del precio. La masa m es la tasa de decaimiento de la autocorrelación.",
    relatedConcepts: ["p_path_integral", "p_renormalization"],
  },
  {
    id: "p_nonlinear", name: "Dinámica No Lineal y Bifurcaciones", domain: "physics", level: 6,
    formula: "ẋ = rx(1-x) (logístico), bifurcación en r=3: periodo-2, r=3.57: caos",
    insight: "Los mercados tienen dinámicas no lineales con bifurcaciones — pequeños cambios generan comportamientos cualitativamente distintos.",
    tradingAnalogy: "Bubble: bifurcación en el precio — en r>3 los precios oscilan entre 2 valores (bull/bear cycle).",
    relatedConcepts: ["m_chaos", "p_critical_phenomena"],
  },
  {
    id: "p_symplectic", name: "Geometría Simpléctica y Sistemas Integrables", domain: "physics", level: 6,
    formula: "ω = Σdpᵢ∧dqᵢ, flujo Hamiltoniano preserva ω, sistemas integrables: n constantes de movimiento",
    insight: "El espacio de fases del mercado tiene estructura simpléctica. Sistemas integrables tienen solución exacta.",
    tradingAnalogy: "Un mercado con n activos y n-1 restricciones de arbitraje es 'integrable' — predecible en principio.",
    relatedConcepts: ["p_lagrangian", "p_quantum_basic"],
  },

  // ── L7 ──
  {
    id: "p_econophysics", name: "Econofísica y Modelos de Mercado", domain: "physics", level: 7,
    formula: "P(r) ~ |r|^{-(1+α)} (Mantegna-Stanley), α ≈ 3 para acciones, α ≈ 2 para crypto",
    insight: "La distribución de retornos sigue una ley de potencia con exponente α — confirmado empíricamente.",
    tradingAnalogy: "Crypto tiene α≈2 < stocks α≈3: las colas son MÁS gruesas en crypto — crashes más frecuentes.",
    numericalValue: 2.0,
    relatedConcepts: ["m_fat_tails", "p_critical_phenomena"],
  },
  {
    id: "p_spin_glass", name: "Vidrios de Spin y Sistemas Desordenados", domain: "physics", level: 7,
    formula: "H = -Σ Jᵢⱼ SᵢSⱼ, Jᵢⱼ ~ N(0,J²/N), energía libre de réplicas: f = -½βJ²",
    insight: "Los mercados con agentes heterogéneos (distintas creencias) son análogos a vidrios de spin.",
    tradingAnalogy: "Agentes con estrategias distintas = spins aleatorios. El precio de equilibrio = estado de mínima energía libre.",
    relatedConcepts: ["p_stat_mech", "p_field_theory"],
  },
  {
    id: "p_stat_mech_relevance", name: "Mecánica Estadística de Mercados", domain: "physics", level: 7,
    formula: "Master equation: ∂P/∂t = Σ [W(n|m)P(m) - W(m|n)P(n)], equilibrio: detailed balance",
    insight: "La dinámica de precios satisface una ecuación maestra — la 'mecánica estadística' del mercado.",
    tradingAnalogy: "W(subida|estado) vs W(bajada|estado) — transición de markov del precio. El balance detallado = mercado eficiente.",
    relatedConcepts: ["p_stat_mech", "m_martingale"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// QUÍMICA — L1 a L7
// ─────────────────────────────────────────────────────────────────────────────
export const CHEMISTRY_CONCEPTS: Concept[] = [

  // ── L1 ──
  {
    id: "c_matter", name: "Materia, Estados y Cambios", domain: "chemistry", level: 1,
    formula: "s → l → g (fusión, evaporación), energía requerida: Q = mcΔT",
    insight: "El mercado tiene 'estados de materia': sólido (consolidación), líquido (tendencia suave), gas (euforia).",
    tradingAnalogy: "Mercado en consolidación = sólido. Tendencia clara = líquido (fluye). Burbuja = gas (expande sin control).",
    relatedConcepts: ["c_equilibrium", "p_critical_phenomena"],
  },
  {
    id: "c_atoms", name: "Átomos, Iones y Moléculas", domain: "chemistry", level: 1,
    formula: "Átomo: núcleo + electrones, Ion: carga neta ≠ 0, Enlace: compartición de electrones",
    insight: "Los agentes del mercado son 'átomos' que se combinan en 'moléculas' (carteras) con propiedades emergentes.",
    tradingAnalogy: "Portafolio = molécula de activos-átomo. Las correlaciones son los 'enlaces' entre activos.",
    relatedConcepts: ["c_bonding", "m_covariance"],
  },

  // ── L2 ──
  {
    id: "c_stoichiometry", name: "Estequiometría y Balance de Reacciones", domain: "chemistry", level: 2,
    formula: "aA + bB → cC + dD, balance masa: masa_reactivos = masa_productos",
    insight: "Las transacciones del mercado son balanceadas: lo que vende un agente lo compra otro.",
    tradingAnalogy: "Conservación de capital: en cada trade, el vendedor recibe exactamente lo que paga el comprador.",
    relatedConcepts: ["c_reaction_rates", "c_equilibrium"],
  },
  {
    id: "c_periodic_table", name: "Tabla Periódica y Propiedades Periódicas", domain: "chemistry", level: 2,
    formula: "Periodicidad: radio atómico, energía de ionización, electronegatividad ~ posición Z",
    insight: "Los activos tienen 'propiedades periódicas': ciclos de sector que se repiten con el ciclo económico.",
    tradingAnalogy: "Ciclo económico (expansión→pico→contracción→valle) como períodos de la tabla: activos cambian de 'estado'.",
    relatedConcepts: ["c_matter", "p_critical_phenomena"],
  },
  {
    id: "c_bonding", name: "Enlace Químico — Covalente, Iónico, Metálico", domain: "chemistry", level: 2,
    formula: "Enlace covalente: AX₂ ↔ energía de enlace D_e = De_r - De_p, Energía de red: U = -Mz₊z₋e²/4πε₀r₀",
    insight: "La correlación entre activos es como la fuerza de un enlace: más fuerte = más difícil separarlos.",
    tradingAnalogy: "Pairs trading explota el 'enlace' entre dos activos correlacionados. Si el enlace se rompe → trade.",
    relatedConcepts: ["c_molecular_geom", "m_covariance"],
  },

  // ── L3 ──
  {
    id: "c_reaction_rates", name: "Cinética Química — Leyes de Velocidad", domain: "chemistry", level: 3,
    formula: "v = k[A]ⁿ[B]ᵐ, k = A·e^{-Ea/RT} (Arrhenius), t₁/₂ = ln2/k (1er orden)",
    insight: "La velocidad de adopción de nueva información en el mercado sigue una ley de velocidad de reacción.",
    tradingAnalogy: "Velocidad de ajuste del precio = k·[información nueva]. Mercados eficientes tienen k→∞.",
    numericalValue: 8.314, // R = constante de gases
    relatedConcepts: ["c_equilibrium", "p_critical_phenomena"],
  },
  {
    id: "c_equilibrium", name: "Equilibrio Químico y Principio de Le Chatelier", domain: "chemistry", level: 3,
    formula: "K_eq = [C]^c[D]^d / [A]^a[B]^b, ΔG = ΔG° + RT·ln(Q), Q>K_eq → reacción inversa",
    insight: "Le Chatelier: el mercado responde a perturbaciones restaurando el equilibrio (mean reversion).",
    tradingAnalogy: "Si el precio se aleja del equilibrio (Q>K), el mercado 'reacciona' para volver — señal de reversión.",
    relatedConcepts: ["c_reaction_rates", "c_thermochem"],
  },
  {
    id: "c_thermochem", name: "Termoquímica — Entalpía y Entropía de Reacción", domain: "chemistry", level: 3,
    formula: "ΔG = ΔH - TΔS, ΔG < 0 → reacción espontánea, ΔH < 0 → exotérmica",
    insight: "Una posición de trading es favorable si ΔG < 0: la ganancia esperada (ΔH) supera el costo de riesgo (TΔS).",
    tradingAnalogy: "Trade espontáneo: ΔH (ganancia esperada) > TΔS (costo de incertidumbre). Sharpe ratio = -ΔG.",
    relatedConcepts: ["c_equilibrium", "p_thermodynamics_basic"],
  },
  {
    id: "c_solutions", name: "Soluciones, Concentración y Ley de Henry", domain: "chemistry", level: 3,
    formula: "C = n/V (molaridad), Ley de Henry: p = K_H·c (presión ∝ concentración de gas disuelto)",
    insight: "La liquidez del mercado es como la concentración de una solución: más líquido = más concentrado.",
    tradingAnalogy: "Spread bid-ask ~ 1/liquidez: mercado muy líquido = spread mínimo (concentración alta).",
    relatedConcepts: ["c_equilibrium", "p_fluid_dynamics"],
  },

  // ── L4 ──
  {
    id: "c_quantum_chem", name: "Química Cuántica — Orbitales Moleculares", domain: "chemistry", level: 4,
    formula: "LCAO: ψ_MO = Σcᵢφᵢ, E = ⟨ψ|Ĥ|ψ⟩/⟨ψ|ψ⟩ (principio variacional), HOMO-LUMO gap",
    insight: "La combinación de estrategias de trading (LCAO) crea nuevas estrategias con propiedades emergentes.",
    tradingAnalogy: "Estrategia híbrida = LCAO: combinación lineal de estrategias base (momentum + mean-reversion).",
    relatedConcepts: ["c_bonding", "p_quantum_basic"],
  },
  {
    id: "c_electrochemistry", name: "Electroquímica y Potencial de Electrodo", domain: "chemistry", level: 4,
    formula: "ΔG = -nFE, Nernst: E = E° - (RT/nF)ln(Q), n = moles de e⁻, F = 96485 C/mol",
    insight: "El potencial de electrodo mide la 'fuerza impulsora' de una reacción — análogo al alpha del trading.",
    tradingAnalogy: "Alpha = E° del trade: potencial en condiciones estándar. El mercado ajusta según Nernst.",
    numericalValue: 96485.0, // Faraday constant
    relatedConcepts: ["c_thermochem", "c_equilibrium"],
  },
  {
    id: "c_spectroscopy", name: "Espectroscopía y Resonancia", domain: "chemistry", level: 4,
    formula: "E = hν = hc/λ, ΔE = hν (absorción/emisión), NMR: ν = γB₀/2π",
    insight: "El análisis espectral del precio (FFT) es análogo a la espectroscopía: detecta 'frecuencias' características.",
    tradingAnalogy: "El 'espectro de potencia' del precio revela la frecuencia dominante del ciclo de mercado.",
    numericalValue: 6.626e-34, // constante de Planck
    relatedConcepts: ["m_complex_analysis", "p_quantum_basic"],
  },
  {
    id: "c_molecular_geom", name: "Geometría Molecular y VSEPR", domain: "chemistry", level: 4,
    formula: "VSEPR: geometría minimiza repulsión, ángulos: lineal 180°, tetraédrico 109.5°",
    insight: "La estructura de un portafolio óptimo tiene una 'geometría' que minimiza las correlaciones.",
    tradingAnalogy: "Diversificación óptima = geometría VSEPR: activos colocados para minimizar repulsión (correlación).",
    relatedConcepts: ["c_bonding", "m_covariance"],
  },

  // ── L5 ──
  {
    id: "c_statistical_thermo", name: "Termodinámica Estadística Química", domain: "chemistry", level: 5,
    formula: "q = Σᵢ e^{-εᵢ/k_BT} (función de partición), A = -k_BT·ln(q), S = k_B·ln(W)",
    insight: "La función de partición suma sobre todos los estados posibles del mercado — igual que la integral de camino.",
    tradingAnalogy: "La 'función de partición' del mercado = suma ponderada de todos los escenarios de precio futuros.",
    relatedConcepts: ["p_stat_mech", "c_thermochem"],
  },
  {
    id: "c_reaction_mechanisms", name: "Mecanismos de Reacción y Estado de Transición", domain: "chemistry", level: 5,
    formula: "TST: k = (k_BT/h)·exp(-ΔG‡/RT), ΔG‡ = energía de activación, [X‡] = estado de transición",
    insight: "Cada trade tiene un 'estado de transición' — el punto de máxima incertidumbre antes de comprometerse.",
    tradingAnalogy: "Energía de activación ΔG‡ = convicción necesaria para abrir posición. k = frecuencia de trades.",
    relatedConcepts: ["c_reaction_rates", "c_thermochem"],
  },
  {
    id: "c_polymer_chem", name: "Química de Polímeros y Cadenas Aleatorias", domain: "chemistry", level: 5,
    formula: "⟨R²⟩ = Nl² (cadena libre), radio de giracion: Rg = l√(N/6), modelo de gusano",
    insight: "Una trayectoria de precio es como una cadena polimérica: cada paso correlacionado con el anterior.",
    tradingAnalogy: "Precio como polímero: segmentos = períodos. La rigidez del polímero = persistencia del momentum.",
    relatedConcepts: ["m_brownian", "p_stat_mech"],
  },
  {
    id: "c_nonequilibrium", name: "Termodinámica Fuera del Equilibrio", domain: "chemistry", level: 5,
    formula: "Producción de entropía: dS/dt ≥ 0, estructuras disipativas (Prigogine), Onsager: Jᵢ = ΣLᵢⱼXⱼ",
    insight: "Los mercados son sistemas disipatativos: consumen energía (capital) para mantener estructura.",
    tradingAnalogy: "El mercado trending es una estructura disipativa de Prigogine: necesita flujo continuo de capital para mantenerse.",
    relatedConcepts: ["c_thermochem", "p_critical_phenomena"],
  },

  // ── L6 ──
  {
    id: "c_computational_chem", name: "Química Computacional — DFT y Métodos Ab Initio", domain: "chemistry", level: 6,
    formula: "E[ρ] = T[ρ] + E_ne[ρ] + J[ρ] + E_xc[ρ] (DFT), ecuaciones Kohn-Sham",
    insight: "Los métodos ab initio calculan propiedades desde primeros principios — sin parámetros libres.",
    tradingAnalogy: "Estrategia ab initio: derivar señales de trading desde física/matemática pura, sin ajuste empírico.",
    relatedConcepts: ["c_quantum_chem", "p_field_theory"],
  },
  {
    id: "c_molecular_dynamics", name: "Dinámica Molecular y Simulación", domain: "chemistry", level: 6,
    formula: "Fᵢ = -∂U/∂rᵢ, xᵢ(t+Δt) = 2xᵢ(t) - xᵢ(t-Δt) + (Fᵢ/m)Δt² (Verlet)",
    insight: "La dinámica molecular simula muchas partículas — como simular muchos agentes de trading.",
    tradingAnalogy: "Monte Carlo de portafolio = dinámica molecular de activos: simula trayectorias para calcular riesgo.",
    relatedConcepts: ["c_statistical_thermo", "m_stochastic_calc"],
  },
  {
    id: "c_surface_chem", name: "Química de Superficies y Catálisis Heterogénea", domain: "chemistry", level: 6,
    formula: "Langmuir: θ = KP/(1+KP), TOF = productos/(sitios·tiempo), energía de adsorción Eads",
    insight: "Los market makers son 'catalizadores': facilitan reacciones (trades) sin consumirse.",
    tradingAnalogy: "Liquidez como catalizador: los market makers reducen la energía de activación de los trades (spread).",
    relatedConcepts: ["c_reaction_mechanisms", "p_fluid_dynamics"],
  },

  // ── L7 ──
  {
    id: "c_complex_systems", name: "Sistemas Complejos y Auto-organización", domain: "chemistry", level: 7,
    formula: "Reacción B-Z: d[X]/dt = k₁[A][Y] - k₂[X][Y] + k₃[A][X] - 2k₄[X]², oscilaciones espontáneas",
    insight: "El mercado tiene oscilaciones espontáneas (ciclos de negocios) como la reacción Belousov-Zhabotinsky.",
    tradingAnalogy: "Ciclo alcista/bajista = oscilador químico. La amplitud y período evolucionan con los parámetros del sistema.",
    relatedConcepts: ["c_nonequilibrium", "p_nonlinear"],
  },
  {
    id: "c_stochastic_chem", name: "Cinética Química Estocástica — Algoritmo de Gillespie", domain: "chemistry", level: 7,
    formula: "P(reacción μ en [t,t+τ)) = aμ·e^{-a₀τ}/a₀, a₀ = Σaμ (propensidad total)",
    insight: "Las reacciones moleculares son inherentemente estocásticas — igual que las órdenes del mercado.",
    tradingAnalogy: "El flujo de órdenes es un proceso de Gillespie: cada orden es un evento estocástico con propensidad.",
    relatedConcepts: ["c_reaction_rates", "m_stochastic_calc"],
  },
  {
    id: "c_network_chem", name: "Redes Químicas y Teoría de Redes", domain: "chemistry", level: 7,
    formula: "Red metabólica: nodos=metabolitos, aristas=reacciones, S·v = 0 (estado estacionario), centralidad",
    insight: "La red de trading (grafo GAT) tiene propiedades topológicas análogas a redes metabólicas.",
    tradingAnalogy: "Los agentes con alta centralidad en el grafo GAT son 'metabolitos clave' — su señal influye más.",
    relatedConcepts: ["c_complex_systems", "m_topology"],
  },
  {
    id: "c_quantum_biology", name: "Bioquímica Cuántica y Coherencia", domain: "chemistry", level: 7,
    formula: "Coherencia cuántica: ρ(t) = e^{-iHt/ℏ}ρ₀e^{iHt/ℏ}, decoherencia τ_d ~ ℏ/k_BT",
    insight: "La coherencia cuántica en fotosíntesis optimiza la búsqueda de energía — análogo a búsqueda de alpha.",
    tradingAnalogy: "Los agentes en superposición de estrategias colapsan al observar el mercado — Schrödinger del trader.",
    relatedConcepts: ["p_quantum_basic", "c_spectroscopy"],
  },
];

// ─── Índice completo ───────────────────────────────────────────────────────────
export const ALL_CONCEPTS: Concept[] = [
  ...MATH_CONCEPTS,
  ...PHYSICS_CONCEPTS,
  ...CHEMISTRY_CONCEPTS,
];

export const CONCEPT_INDEX = new Map<string, Concept>(
  ALL_CONCEPTS.map(c => [c.id, c])
);

// ─── Conocimiento por nivel ────────────────────────────────────────────────────
export function getConceptsByLevel(level: Level): Concept[] {
  return ALL_CONCEPTS.filter(c => c.level === level);
}

export function getConceptsByDomain(domain: Domain): Concept[] {
  return ALL_CONCEPTS.filter(c => c.domain === domain);
}

/**
 * Dado el genoma de un agente (mathWeight, physicsWeight, chemistryWeight),
 * selecciona los conceptos más relevantes para ese agente.
 * Más peso en un dominio → acceso a más conceptos de ese dominio.
 */
export function selectRelevantConcepts(
  mathW: number,
  physicsW: number,
  chemW: number,
  maxConcepts = 20
): Concept[] {
  const mathCount = Math.round(maxConcepts * mathW);
  const physicsCount = Math.round(maxConcepts * physicsW);
  const chemCount = maxConcepts - mathCount - physicsCount;

  const pick = (domain: Domain, count: number) => {
    const pool = getConceptsByDomain(domain);
    // Priorizar niveles más altos (más conocimiento = más nivel)
    pool.sort((a, b) => b.level - a.level);
    return pool.slice(0, Math.max(1, count));
  };

  return [
    ...pick("math", mathCount),
    ...pick("physics", physicsCount),
    ...pick("chemistry", Math.max(1, chemCount)),
  ];
}

/**
 * Extrae los insights numéricos de los conceptos para enriquecer las señales sensoriales.
 * Retorna un vector de features derivado del conocimiento científico.
 */
export function extractKnowledgeFeatures(
  mathW: number,
  physicsW: number,
  chemW: number,
  prices: number[],
  lookback: number
): number[] {
  if (prices.length < 5) return new Array(9).fill(0);

  const n = Math.min(lookback, prices.length);
  const window = prices.slice(-n);
  const current = prices[prices.length - 1];
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
  const returns = window.slice(1).map((p, i) => Math.log(p / window[i]));
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);

  // ── MATH KNOWLEDGE FEATURES ──────────────────────────────────────────────
  // Log-return (m_log_return)
  const logReturn = prices.length > 1 ? Math.log(prices[prices.length - 1] / prices[prices.length - 2]) : 0;

  // Hurst exponent approximation (m_multiscale) — R/S analysis
  const rescaledRange = std > 0 ? (Math.max(...window) - Math.min(...window)) / std : 0;
  const hurstProxy = Math.log(rescaledRange + 1e-8) / Math.log(n); // ~H

  // Z-score con distribución normal implícita (m_normal_dist)
  const zScore = std > 0 ? (current - mean) / std : 0;

  // ── PHYSICS KNOWLEDGE FEATURES ───────────────────────────────────────────
  // Energía cinética del precio (p_energy): ½mv² ∝ (dP/dt)²
  const velocity = prices.length > 2
    ? (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3]
    : 0;
  const kineticEnergy = 0.5 * velocity * velocity;

  // Entropía de Shannon de los retornos (p_entropy)
  const upCount = returns.filter(r => r > 0).length;
  const pUp = upCount / (returns.length || 1);
  const entropy = pUp > 0 && pUp < 1
    ? -(pUp * Math.log2(pUp) + (1 - pUp) * Math.log2(1 - pUp))
    : 0;

  // Oscilador armónico — distancia al equilibrio (p_harmonic_osc)
  const springForce = std > 0 ? -(current - mean) / std : 0;

  // ── CHEMISTRY KNOWLEDGE FEATURES ─────────────────────────────────────────
  // Tasa de reacción — segunda derivada (c_reaction_rates)
  const d2P = returns.length > 2
    ? returns[returns.length - 1] - returns[returns.length - 2]
    : 0;
  const reactionRate = Math.tanh(d2P * 20);

  // Equilibrio Le Chatelier (c_equilibrium) — Q vs Keq proxy
  const shortMean = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const qVsK = mean > 0 ? -(current - shortMean) / shortMean : 0; // negativo = vuelta al equilibrio

  // Gradiente de difusión Fick (c_solutions)
  const fickGradient = std > 0 ? -(current - mean) / (std + 1e-8) * 0.5 : 0;

  // Aplicar pesos del genoma
  return [
    Math.tanh(logReturn * 30) * mathW,
    Math.tanh(hurstProxy * 2 - 1) * mathW,
    Math.tanh(zScore * 0.4) * mathW,
    Math.tanh(kineticEnergy * 500) * physicsW,
    Math.tanh((1 - entropy) * 2) * physicsW,
    Math.tanh(springForce * 0.5) * physicsW,
    reactionRate * chemW,
    Math.tanh(qVsK * 10) * chemW,
    Math.tanh(fickGradient) * chemW,
  ];
}

// ─── Estadísticas del currículo ────────────────────────────────────────────────
export const CURRICULUM_STATS = {
  totalConcepts: ALL_CONCEPTS.length,
  byDomain: {
    math: MATH_CONCEPTS.length,
    physics: PHYSICS_CONCEPTS.length,
    chemistry: CHEMISTRY_CONCEPTS.length,
  },
  byLevel: Object.fromEntries(
    [1,2,3,4,5,6,7].map(l => [l, ALL_CONCEPTS.filter(c => c.level === l).length])
  ),
};
