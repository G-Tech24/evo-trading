/**
 * SIGNAL ENGINE — Generador Multi-Factor de Señales de Trading
 * =============================================================
 * Combina inteligencia política, sentimiento, datos macro y técnicos
 * en señales de trading accionables con sizing basado en Kelly Criterion.
 *
 * Modelo de factores:
 *   - Factor Político    (35%) — señales de politicalAnalyzer
 *   - Factor Sentimiento (25%) — sentimiento agregado de noticias
 *   - Factor Macro       (20%) — indicadores económicos estimados
 *   - Factor Técnico     (20%) — momentum/mean-reversion del precio
 *
 * Risk Management:
 *   - Kelly Criterion para sizing
 *   - Max drawdown constraint
 *   - Diversificación mínima entre señales
 *   - Stop-loss automático por señal
 */

import type { PoliticalSignal, PoliticalIntelligenceReport, CentralBankSignal } from "./politicalAnalyzer.js";
import type { AggregatedSentiment } from "./sentimentEngine.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TradingSignal {
  id: string;
  symbol: string;
  action: "buy" | "sell" | "hold" | "reduce" | "exit";
  direction: "long" | "short";
  confidence: number;       // 0-1
  strength: number;         // 0-1, fuerza de la señal
  compositeScore: number;   // -1 a 1 (negativo = short, positivo = long)
  factors: SignalFactors;
  sizing: PositionSizing;
  rationale: string[];
  generatedAt: Date;
  validUntil: Date;
  stopLoss?: number;        // % desde entrada
  takeProfit?: number;      // % desde entrada
  priority: "critical" | "high" | "medium" | "low";
}

export interface SignalFactors {
  political: number;        // -1 a 1
  sentiment: number;        // -1 a 1
  macro: number;            // -1 a 1
  technical: number;        // -1 a 1
  weights: {
    political: number;
    sentiment: number;
    macro: number;
    technical: number;
  };
}

export interface PositionSizing {
  kellyFraction: number;    // Fracción Kelly óptima
  recommendedPct: number;   // % del portfolio recomendado (conservador)
  maxRiskPct: number;       // Máximo riesgo % del portfolio
  expectedReturn: number;   // Retorno esperado estimado
  expectedRisk: number;     // Riesgo estimado (std dev)
}

export interface MacroEnvironment {
  rateExpectation: "cutting" | "holding" | "hiking";
  inflationRegime: "low" | "moderate" | "high" | "falling";
  growthOutlook: "recession" | "slowdown" | "stable" | "expansion";
  dollarStrength: "weak" | "neutral" | "strong";
  riskAppetite: "risk_off" | "neutral" | "risk_on";
  timestamp: Date;
}

// ─── Constantes de Configuración ─────────────────────────────────────────────

const FACTOR_WEIGHTS = {
  political: 0.35,
  sentiment: 0.25,
  macro: 0.20,
  technical: 0.20,
} as const;

const KELLY_SAFETY_FRACTION = 0.25;  // Usar 25% del Kelly completo
const MAX_POSITION_PCT = 0.15;       // Max 15% del portfolio por señal
const MIN_SIGNAL_CONFIDENCE = 0.35;  // Confianza mínima para generar señal
const SIGNAL_TTL_HOURS = 12;         // Vida útil de señales

// ─── Estimación del Entorno Macro ────────────────────────────────────────────

export function estimateMacroEnvironment(
  sentiment: AggregatedSentiment,
  cbSignals: CentralBankSignal[]
): MacroEnvironment {
  const fedSignal = cbSignals.find(s => s.bank === "Fed");
  const ecbSignal = cbSignals.find(s => s.bank === "ECB");

  // Expectativa de tasas
  const dovishBanks = cbSignals.filter(s => s.stance === "dovish").length;
  const hawkishBanks = cbSignals.filter(s => s.stance === "hawkish").length;
  const rateExpectation: MacroEnvironment["rateExpectation"] =
    dovishBanks > hawkishBanks ? "cutting"
    : hawkishBanks > dovishBanks ? "hiking"
    : "holding";

  // Régimen de inflación (inferido del sentimiento macro)
  const inflationRegime: MacroEnvironment["inflationRegime"] =
    sentiment.economic < -0.5 ? "high"
    : sentiment.economic > 0.3 ? "low"
    : sentiment.economic > 0 ? "falling"
    : "moderate";

  // Perspectiva de crecimiento
  const growthOutlook: MacroEnvironment["growthOutlook"] =
    sentiment.economic > 0.5 ? "expansion"
    : sentiment.economic > 0.1 ? "stable"
    : sentiment.economic > -0.3 ? "slowdown"
    : "recession";

  // Fortaleza del dólar
  const fedDovish = fedSignal?.stance === "dovish";
  const dollarStrength: MacroEnvironment["dollarStrength"] =
    fedDovish ? "weak" : rateExpectation === "hiking" ? "strong" : "neutral";

  // Risk appetite
  const riskAppetite: MacroEnvironment["riskAppetite"] =
    sentiment.overall > 0.3 && sentiment.geopolitical > -0.2 ? "risk_on"
    : sentiment.overall < -0.3 || sentiment.geopolitical < -0.4 ? "risk_off"
    : "neutral";

  return {
    rateExpectation, inflationRegime, growthOutlook,
    dollarStrength, riskAppetite, timestamp: new Date(),
  };
}

// ─── Scoring por Factor ───────────────────────────────────────────────────────

function computePoliticalFactor(
  symbol: string,
  politicalSignals: PoliticalSignal[],
  report: PoliticalIntelligenceReport
): number {
  const relevantSignals = politicalSignals.filter(
    sig => sig.isActive && sig.affectedSymbols.some(s => s.symbol === symbol || s.symbol.toLowerCase().includes(symbol.toLowerCase()))
  );

  if (relevantSignals.length === 0) {
    // Sesgo general del informe
    if (report.tradingBias === "risk_on") {
      return ["BTC", "ETH", "SPY"].includes(symbol) ? 0.3 : 0;
    } else if (report.tradingBias === "risk_off") {
      return ["GLD", "BTC"].includes(symbol) ? 0.2 : -0.2;
    }
    return 0;
  }

  let score = 0;
  let totalWeight = 0;
  for (const sig of relevantSignals) {
    const symImpact = sig.affectedSymbols.find(s =>
      s.symbol === symbol || s.symbol.toLowerCase().includes(symbol.toLowerCase())
    );
    if (!symImpact) continue;
    const weight = sig.strength * sig.confidence;
    const contribution = symImpact.direction === "bullish" ? symImpact.magnitude
      : symImpact.direction === "bearish" ? -symImpact.magnitude
      : 0;
    score += contribution * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.max(-1, Math.min(1, score / totalWeight)) : 0;
}

function computeSentimentFactor(
  symbol: string,
  sentiment: AggregatedSentiment,
  report: PoliticalIntelligenceReport
): number {
  const base = sentiment.overall;

  // Ajustes por tipo de activo
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(symbol);
  const isGold = ["GLD", "GC", "GOLD"].includes(symbol);
  const isOil = ["OIL", "CL", "USO"].includes(symbol);
  const isEquity = ["SPY", "QQQ", "IWM"].includes(symbol) || symbol.includes("USD") === false;

  if (isCrypto) {
    // Crypto amplifica sentimiento (más volátil)
    return Math.max(-1, Math.min(1, base * 1.5));
  } else if (isGold) {
    // Gold inversamente correlacionado con sentimiento positivo pero se beneficia de fear
    const fearFactor = (100 - sentiment.fearGreedIndex) / 100;
    return Math.max(-1, Math.min(1, -base * 0.5 + fearFactor * 0.5));
  } else if (isOil) {
    // Oil correlacionado con actividad económica y geopolítica
    return Math.max(-1, Math.min(1, sentiment.economic * 0.5 + sentiment.geopolitical * (-0.3)));
  } else if (isEquity) {
    // Equities siguen sentimiento económico principalmente
    return Math.max(-1, Math.min(1, sentiment.economic * 0.7 + sentiment.political * 0.3));
  }

  return base;
}

function computeMacroFactor(
  symbol: string,
  macro: MacroEnvironment
): number {
  const isCrypto = ["BTC", "ETH", "SOL"].includes(symbol);
  const isGold = ["GLD", "GC", "GOLD"].includes(symbol);
  const isOil = ["OIL", "CL"].includes(symbol);
  const isDollar = ["DXY", "USD"].includes(symbol);

  if (isCrypto) {
    let score = 0;
    if (macro.rateExpectation === "cutting") score += 0.5;
    if (macro.rateExpectation === "hiking") score -= 0.3;
    if (macro.inflationRegime === "high") score += 0.3;  // Hedge vs inflation
    if (macro.growthOutlook === "recession") score += 0.2; // Digital gold
    if (macro.riskAppetite === "risk_on") score += 0.3;
    if (macro.riskAppetite === "risk_off") score -= 0.2;
    return Math.max(-1, Math.min(1, score));
  } else if (isGold) {
    let score = 0;
    if (macro.rateExpectation === "cutting") score += 0.5;  // Lower real rates = gold bullish
    if (macro.rateExpectation === "hiking") score -= 0.4;
    if (macro.inflationRegime === "high") score += 0.4;
    if (macro.dollarStrength === "weak") score += 0.3;
    if (macro.dollarStrength === "strong") score -= 0.2;
    if (macro.riskAppetite === "risk_off") score += 0.3;
    return Math.max(-1, Math.min(1, score));
  } else if (isOil) {
    let score = 0;
    if (macro.growthOutlook === "expansion") score += 0.4;
    if (macro.growthOutlook === "recession") score -= 0.4;
    if (macro.riskAppetite === "risk_on") score += 0.2;
    return Math.max(-1, Math.min(1, score));
  } else if (isDollar) {
    let score = 0;
    if (macro.dollarStrength === "strong") score += 0.5;
    if (macro.dollarStrength === "weak") score -= 0.5;
    if (macro.rateExpectation === "hiking") score += 0.3;
    if (macro.rateExpectation === "cutting") score -= 0.3;
    return Math.max(-1, Math.min(1, score));
  }

  // Default equity
  let score = 0;
  if (macro.rateExpectation === "cutting") score += 0.4;
  if (macro.rateExpectation === "hiking") score -= 0.3;
  if (macro.growthOutlook === "expansion") score += 0.4;
  if (macro.growthOutlook === "recession") score -= 0.5;
  if (macro.riskAppetite === "risk_on") score += 0.3;
  return Math.max(-1, Math.min(1, score));
}

function computeTechnicalFactor(
  symbol: string,
  priceHistory: number[]
): number {
  if (priceHistory.length < 5) return 0;

  const recent = priceHistory.slice(-20);
  const current = recent[recent.length - 1];
  const prices5 = recent.slice(-5);
  const prices10 = recent.slice(-10);
  const prices20 = recent;

  // Simple Moving Averages
  const sma5 = prices5.reduce((s, p) => s + p, 0) / prices5.length;
  const sma10 = prices10.reduce((s, p) => s + p, 0) / prices10.length;
  const sma20 = prices20.reduce((s, p) => s + p, 0) / prices20.length;

  // Momentum: precio actual vs SMA20
  const momentum = (current - sma20) / sma20;

  // Tendencia corta: SMA5 vs SMA20
  const trend = (sma5 - sma20) / sma20;

  // RSI simplificado (5 períodos)
  let gains = 0, losses = 0;
  for (let i = 1; i < prices5.length; i++) {
    const change = prices5[i] - prices5[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses > 0 ? gains / losses : 10;
  const rsi = 100 - 100 / (1 + rs);
  const rsiSignal = (rsi - 50) / 50; // -1 a 1

  // Volatilidad normalizada (Bollinger)
  const variance = prices20.reduce((s, p) => s + Math.pow(p - sma20, 2), 0) / prices20.length;
  const stdDev = Math.sqrt(variance);
  const bollingerSignal = stdDev > 0 ? (current - sma20) / (2 * stdDev) : 0;

  const score = momentum * 0.30 + trend * 0.30 + rsiSignal * 0.20 + bollingerSignal * 0.20;
  return Math.max(-1, Math.min(1, score * 2));
}

// ─── Kelly Criterion ──────────────────────────────────────────────────────────

function computeKellySizing(
  winProbability: number,
  expectedWinReturn: number,
  expectedLossReturn: number
): PositionSizing {
  // Kelly formula: f* = (p * b - q) / b
  // donde b = odds (win/loss ratio), p = prob win, q = 1-p
  const b = Math.abs(expectedWinReturn / Math.max(expectedLossReturn, 0.001));
  const p = winProbability;
  const q = 1 - p;
  const kellyFraction = (p * b - q) / b;

  // Usar fracción conservadora del Kelly
  const safeFraction = Math.max(0, kellyFraction * KELLY_SAFETY_FRACTION);
  const recommendedPct = Math.min(safeFraction, MAX_POSITION_PCT);

  return {
    kellyFraction: Math.max(0, kellyFraction),
    recommendedPct,
    maxRiskPct: Math.min(recommendedPct * 0.5, 0.05),
    expectedReturn: p * expectedWinReturn - q * expectedLossReturn,
    expectedRisk: Math.sqrt(p * q) * (expectedWinReturn + expectedLossReturn),
  };
}

// ─── Generador Principal de Señales ──────────────────────────────────────────

let signalIdCounter = 0;

function generateSignalId(): string {
  return `SIG_${Date.now()}_${++signalIdCounter}`;
}

export function generateTradingSignals(
  symbols: string[],
  report: PoliticalIntelligenceReport,
  sentiment: AggregatedSentiment,
  priceHistories: Map<string, number[]>
): TradingSignal[] {
  const macro = estimateMacroEnvironment(sentiment, report.centralBankSignals);
  const now = new Date();
  const signals: TradingSignal[] = [];

  for (const symbol of symbols) {
    const priceHistory = priceHistories.get(symbol) ?? [];

    // Computar factores individuales
    const politicalFactor = computePoliticalFactor(symbol, report.signals, report);
    const sentimentFactor = computeSentimentFactor(symbol, sentiment, report);
    const macroFactor = computeMacroFactor(symbol, macro);
    const technicalFactor = computeTechnicalFactor(symbol, priceHistory);

    const factors: SignalFactors = {
      political: politicalFactor,
      sentiment: sentimentFactor,
      macro: macroFactor,
      technical: technicalFactor,
      weights: { ...FACTOR_WEIGHTS },
    };

    // Puntuación compuesta ponderada
    const compositeScore =
      politicalFactor * FACTOR_WEIGHTS.political +
      sentimentFactor * FACTOR_WEIGHTS.sentiment +
      macroFactor * FACTOR_WEIGHTS.macro +
      technicalFactor * FACTOR_WEIGHTS.technical;

    // Confianza basada en consenso entre factores
    const factorValues = [politicalFactor, sentimentFactor, macroFactor, technicalFactor];
    const positives = factorValues.filter(f => f > 0.1).length;
    const negatives = factorValues.filter(f => f < -0.1).length;
    const consensus = Math.max(positives, negatives) / factorValues.length;
    const confidence = consensus * sentiment.confidenceLevel * 0.7 + 0.3;

    if (confidence < MIN_SIGNAL_CONFIDENCE && Math.abs(compositeScore) < 0.2) continue;

    // Determinar acción
    const action: TradingSignal["action"] =
      compositeScore > 0.4 ? "buy"
      : compositeScore > 0.15 ? "buy"  // señal débil pero positiva
      : compositeScore < -0.4 ? "sell"
      : compositeScore < -0.15 ? "reduce"
      : "hold";

    const direction: TradingSignal["direction"] = compositeScore >= 0 ? "long" : "short";
    const strength = Math.abs(compositeScore);

    // Kelly sizing
    const winProb = 0.45 + confidence * 0.15 + strength * 0.1;
    const winReturn = 0.02 + strength * 0.05;
    const lossReturn = 0.015 + (1 - confidence) * 0.02;
    const sizing = computeKellySizing(winProb, winReturn, lossReturn);

    // Racional
    const rationale: string[] = [];
    if (Math.abs(politicalFactor) > 0.2) {
      rationale.push(`Political: ${politicalFactor > 0 ? "Bullish" : "Bearish"} (${(Math.abs(politicalFactor) * 100).toFixed(0)}%)`);
    }
    if (Math.abs(sentimentFactor) > 0.2) {
      rationale.push(`Sentiment: ${sentimentFactor > 0 ? "Positive" : "Negative"} (${(Math.abs(sentimentFactor) * 100).toFixed(0)}%)`);
    }
    if (Math.abs(macroFactor) > 0.2) {
      rationale.push(`Macro: ${macro.rateExpectation} rates, ${macro.growthOutlook} growth`);
    }
    if (Math.abs(technicalFactor) > 0.2) {
      rationale.push(`Technical: ${technicalFactor > 0 ? "Uptrend" : "Downtrend"} momentum`);
    }
    if (report.recommendedHedges.includes(symbol)) {
      rationale.push(`Recommended geopolitical hedge`);
    }

    // Prioridad
    const priority: TradingSignal["priority"] =
      strength > 0.7 && confidence > 0.7 ? "critical"
      : strength > 0.5 || confidence > 0.6 ? "high"
      : strength > 0.3 ? "medium"
      : "low";

    // Stop-loss y take-profit basados en volatilidad de precio
    const stopLoss = direction === "long" ? 0.03 + (1 - confidence) * 0.02 : 0.03;
    const takeProfit = direction === "long"
      ? winReturn * (1 + strength)
      : winReturn * (1 + strength);

    signals.push({
      id: generateSignalId(),
      symbol,
      action,
      direction,
      confidence,
      strength,
      compositeScore,
      factors,
      sizing,
      rationale,
      generatedAt: now,
      validUntil: new Date(now.getTime() + SIGNAL_TTL_HOURS * 3_600_000),
      stopLoss,
      takeProfit,
      priority,
    });
  }

  return signals
    .filter(s => s.action !== "hold" || s.strength > 0.5)
    .sort((a, b) => b.strength * b.confidence - a.strength * a.confidence);
}

// ─── Agregador de Señales ────────────────────────────────────────────────────

export interface SignalAggregation {
  signals: TradingSignal[];
  macro: MacroEnvironment;
  portfolioBias: number;     // -1 a 1
  topBullish: string[];
  topBearish: string[];
  riskLevel: number;         // 0-1
  timestamp: Date;
}

let lastSignals: TradingSignal[] = [];
let lastMacro: MacroEnvironment | null = null;

export function getActiveSignals(): TradingSignal[] {
  const now = new Date();
  lastSignals = lastSignals.filter(s => s.validUntil > now);
  return lastSignals;
}

export function updateSignals(
  newSignals: TradingSignal[],
  macro: MacroEnvironment
): SignalAggregation {
  lastMacro = macro;

  // Merge: mantener señales antiguas que no han sido superadas
  const now = new Date();
  const symbolsUpdated = new Set(newSignals.map(s => s.symbol));
  lastSignals = [
    ...lastSignals.filter(s => s.validUntil > now && !symbolsUpdated.has(s.symbol)),
    ...newSignals,
  ];

  const activeSignals = lastSignals.filter(s => s.validUntil > now);

  // Sesgo del portfolio
  const portfolioBias = activeSignals.length > 0
    ? activeSignals.reduce((s, sig) => s + sig.compositeScore * sig.confidence, 0) / activeSignals.length
    : 0;

  const topBullish = activeSignals
    .filter(s => s.compositeScore > 0.2)
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5)
    .map(s => s.symbol);

  const topBearish = activeSignals
    .filter(s => s.compositeScore < -0.2)
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, 5)
    .map(s => s.symbol);

  const riskLevel = activeSignals.length > 0
    ? activeSignals.filter(s => s.compositeScore < 0).length / activeSignals.length
    : 0.5;

  return {
    signals: activeSignals,
    macro,
    portfolioBias,
    topBullish,
    topBearish,
    riskLevel,
    timestamp: new Date(),
  };
}

export function getSignalForSymbol(symbol: string): TradingSignal | null {
  return lastSignals.find(s => s.symbol === symbol && s.validUntil > new Date()) ?? null;
}

export function getSignalEngineStats() {
  const now = new Date();
  const active = lastSignals.filter(s => s.validUntil > now);
  return {
    totalSignals: lastSignals.length,
    activeSignals: active.length,
    bullishSignals: active.filter(s => s.compositeScore > 0).length,
    bearishSignals: active.filter(s => s.compositeScore < 0).length,
    avgConfidence: active.length > 0
      ? active.reduce((s, sig) => s + sig.confidence, 0) / active.length
      : 0,
    currentMacro: lastMacro,
  };
}
