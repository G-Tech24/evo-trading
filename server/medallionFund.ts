/**
 * MEDALLION FUND — Motor de Trading Autónomo con Inteligencia Política
 * =====================================================================
 * Inspirado en el Medallion Fund de Renaissance Technologies:
 *   - Jim Simons, 1988-presente: retorno anualizado ~66% bruto
 *   - Modelos cuantitativos + datos alternativos + velocidad
 *
 * Este módulo implementa:
 *   1. Recopilación autónoma de noticias políticas/económicas
 *   2. Análisis NLP de sentimiento en tiempo real
 *   3. Generación de señales multi-factor
 *   4. Ejecución autónoma de trades vía Alpaca
 *   5. Gestión de portfolio con Kelly Criterion
 *   6. Reporte de performance en tiempo real
 *
 * Ciclo de operación (cada 15 min):
 *   Fetch noticias → Analizar sentimiento → Clasificar eventos políticos
 *   → Generar señales → Calcular sizing → Ejecutar trades → Actualizar portfolio
 */

import { fetchAllFeeds, getRecentArticles, type NewsArticle } from "./newsAggregator.js";
import { analyzeArticlesBatch, aggregateSentiment, type AggregatedSentiment } from "./sentimentEngine.js";
import {
  generateIntelligenceReport, generatePoliticalSignals, updateGeopoliticalRisks,
  getGeopoliticalRisks, type PoliticalIntelligenceReport,
} from "./politicalAnalyzer.js";
import {
  generateTradingSignals, updateSignals, getActiveSignals, getSignalEngineStats,
  estimateMacroEnvironment, type TradingSignal, type SignalAggregation,
} from "./signalEngine.js";
import { submitOrder, isBrokerConnected, getAccountInfo } from "./alpacaBroker.js";
import { storage } from "./storage.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MedallionPosition {
  symbol: string;
  qty: number;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  signalId: string;
  openedAt: Date;
  stopLoss?: number;
  takeProfit?: number;
}

export interface MedallionTrade {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  qty: number;
  price: number;
  signal: string;
  rationale: string;
  executedAt: Date;
  pnl?: number;
  pnlPct?: number;
}

export interface MedallionPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPct: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  bestTrade?: MedallionTrade;
  worstTrade?: MedallionTrade;
  startCapital: number;
  currentCapital: number;
  openPositions: number;
}

export interface MedallionCycleResult {
  cycleId: number;
  timestamp: Date;
  duration: number;          // ms
  articlesProcessed: number;
  signalsGenerated: number;
  tradesExecuted: number;
  intelligenceReport: PoliticalIntelligenceReport;
  sentimentSnapshot: AggregatedSentiment;
  signalAggregation: SignalAggregation;
  errors: string[];
}

export interface MedallionFundState {
  isRunning: boolean;
  isPaused: boolean;
  cycleCount: number;
  lastCycle?: MedallionCycleResult;
  performance: MedallionPerformance;
  positions: MedallionPosition[];
  tradeHistory: MedallionTrade[];
  activeSignals: TradingSignal[];
  intelligenceReport?: PoliticalIntelligenceReport;
  sentimentSnapshot?: AggregatedSentiment;
  priceHistories: Map<string, number[]>;
  config: MedallionConfig;
}

export interface MedallionConfig {
  enabled: boolean;
  symbols: string[];
  cycleIntervalMs: number;    // default 15 min
  maxPositions: number;       // max 5 posiciones simultáneas
  maxPositionSizePct: number; // max 15% del portfolio por posición
  minConfidence: number;      // confianza mínima para operar
  minSignalStrength: number;  // fuerza mínima de señal
  newsWindowMinutes: number;  // ventana de análisis de noticias (120 min)
  enableLiveTrading: boolean; // false = solo análisis/logging
  stopLossDefault: number;    // 3% default
  takeProfitDefault: number;  // 6% default
  riskPerTrade: number;       // 1-2% del portfolio por trade
}

// ─── Estado Global del Fondo ──────────────────────────────────────────────────

const DEFAULT_CONFIG: MedallionConfig = {
  enabled: true,
  symbols: (process.env.ALPACA_SYMBOLS ?? "BTC/USD,ETH/USD").split(",").map(s => s.trim()),
  cycleIntervalMs: 15 * 60 * 1000, // 15 minutos
  maxPositions: 5,
  maxPositionSizePct: 0.15,
  minConfidence: 0.40,
  minSignalStrength: 0.25,
  newsWindowMinutes: 120,
  enableLiveTrading: process.env.MEDALLION_LIVE === "true",
  stopLossDefault: 0.03,
  takeProfitDefault: 0.06,
  riskPerTrade: 0.015,
};

const fundState: MedallionFundState = {
  isRunning: false,
  isPaused: false,
  cycleCount: 0,
  performance: {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    totalPnl: 0, totalPnlPct: 0, sharpeRatio: 0, maxDrawdown: 0,
    avgWin: 0, avgLoss: 0, startCapital: 100_000, currentCapital: 100_000,
    openPositions: 0,
  },
  positions: [],
  tradeHistory: [],
  activeSignals: [],
  priceHistories: new Map(),
  config: { ...DEFAULT_CONFIG },
};

let cycleTimer: NodeJS.Timeout | null = null;
let cycleIdCounter = 0;

// ─── Historial de Precios ─────────────────────────────────────────────────────

function updatePriceHistory(symbol: string, price: number): void {
  const history = fundState.priceHistories.get(symbol) ?? [];
  history.push(price);
  if (history.length > 200) history.splice(0, history.length - 200);
  fundState.priceHistories.set(symbol, history);
}

function initializePriceHistoryFromStorage(): void {
  const ticks = storage.getRecentTicks(100);
  for (const tick of ticks) {
    if (tick.price) updatePriceHistory(tick.symbol, tick.price);
  }
}

// ─── Ejecución de Trades ──────────────────────────────────────────────────────

async function executeTrade(
  signal: TradingSignal,
  portfolioValue: number,
  errors: string[]
): Promise<MedallionTrade | null> {
  const { config } = fundState;

  try {
    // Verificar posición existente
    const existingPosition = fundState.positions.find(p => p.symbol === signal.symbol);
    if (existingPosition && signal.action === "hold") return null;

    // Calcular tamaño de posición
    const positionSizePct = Math.min(
      signal.sizing.recommendedPct,
      config.maxPositionSizePct,
      config.riskPerTrade / (signal.stopLoss ?? config.stopLossDefault)
    );
    const notionalValue = portfolioValue * positionSizePct;

    // Precio actual
    const currentPriceHistory = fundState.priceHistories.get(signal.symbol) ?? [];
    const currentPrice = currentPriceHistory[currentPriceHistory.length - 1] ?? 0;
    if (currentPrice <= 0) {
      errors.push(`No price data for ${signal.symbol}`);
      return null;
    }

    const qty = notionalValue / currentPrice;
    if (qty < 0.001) {
      errors.push(`Calculated qty too small for ${signal.symbol}: ${qty}`);
      return null;
    }

    const action: "buy" | "sell" = signal.action === "buy" ? "buy"
      : signal.action === "sell" || signal.action === "exit" ? "sell"
      : signal.action === "reduce" ? "sell"
      : "buy";

    const rationale = signal.rationale.join(" | ");

    // Log de decisión de trading
    const tradeLog = `[Medallion] ${action.toUpperCase()} ${qty.toFixed(6)} ${signal.symbol} @ ~$${currentPrice.toFixed(2)} | Score: ${signal.compositeScore.toFixed(3)} | Confidence: ${(signal.confidence * 100).toFixed(0)}% | ${rationale}`;
    console.log(tradeLog);
    storage.addEvent({ type: "medallion_trade", message: tradeLog });

    // Ejecutar si está habilitado
    if (config.enableLiveTrading && isBrokerConnected()) {
      try {
        await submitOrder(
          "medallion_fund",
          signal.symbol,
          action,
          notionalValue,
          rationale
        );
      } catch (brokerErr) {
        errors.push(`Broker error for ${signal.symbol}: ${(brokerErr as Error).message}`);
      }
    }

    // Registrar trade
    const trade: MedallionTrade = {
      id: `MED_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbol: signal.symbol,
      action,
      qty,
      price: currentPrice,
      signal: signal.id,
      rationale,
      executedAt: new Date(),
    };

    fundState.tradeHistory.push(trade);
    if (fundState.tradeHistory.length > 500) fundState.tradeHistory.splice(0, 100);

    // Actualizar posición
    if (action === "buy") {
      const existing = fundState.positions.find(p => p.symbol === signal.symbol);
      if (existing) {
        // Promedio de entrada
        const totalQty = existing.qty + qty;
        existing.entryPrice = (existing.entryPrice * existing.qty + currentPrice * qty) / totalQty;
        existing.qty = totalQty;
      } else {
        fundState.positions.push({
          symbol: signal.symbol,
          qty,
          side: "long",
          entryPrice: currentPrice,
          currentPrice,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          signalId: signal.id,
          openedAt: new Date(),
          stopLoss: currentPrice * (1 - (signal.stopLoss ?? config.stopLossDefault)),
          takeProfit: currentPrice * (1 + (signal.takeProfit ?? config.takeProfitDefault)),
        });
      }
    } else if (action === "sell") {
      const posIdx = fundState.positions.findIndex(p => p.symbol === signal.symbol);
      if (posIdx >= 0) {
        const pos = fundState.positions[posIdx];
        const pnl = (currentPrice - pos.entryPrice) * Math.min(qty, pos.qty);
        const pnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice;

        trade.pnl = pnl;
        trade.pnlPct = pnlPct;

        // Actualizar performance
        fundState.performance.totalPnl += pnl;
        if (pnl > 0) {
          fundState.performance.winningTrades++;
          fundState.performance.avgWin = (fundState.performance.avgWin * (fundState.performance.winningTrades - 1) + pnl) / fundState.performance.winningTrades;
          if (!fundState.performance.bestTrade || pnl > (fundState.performance.bestTrade.pnl ?? -Infinity)) {
            fundState.performance.bestTrade = trade;
          }
        } else {
          fundState.performance.losingTrades++;
          fundState.performance.avgLoss = (fundState.performance.avgLoss * (fundState.performance.losingTrades - 1) + Math.abs(pnl)) / fundState.performance.losingTrades;
          if (!fundState.performance.worstTrade || pnl < (fundState.performance.worstTrade.pnl ?? Infinity)) {
            fundState.performance.worstTrade = trade;
          }
        }

        pos.qty -= qty;
        if (pos.qty < 0.0001) fundState.positions.splice(posIdx, 1);
      }
    }

    fundState.performance.totalTrades++;
    const wins = fundState.performance.winningTrades;
    const total = fundState.performance.totalTrades;
    fundState.performance.winRate = total > 0 ? wins / total : 0;

    return trade;
  } catch (err) {
    errors.push(`Trade execution error: ${(err as Error).message}`);
    return null;
  }
}

// ─── Monitoreo de Posiciones Abiertas ────────────────────────────────────────

function monitorOpenPositions(errors: string[]): void {
  const { config } = fundState;

  for (const pos of fundState.positions) {
    const history = fundState.priceHistories.get(pos.symbol) ?? [];
    const currentPrice = history[history.length - 1];
    if (!currentPrice) continue;

    pos.currentPrice = currentPrice;
    pos.unrealizedPnl = (currentPrice - pos.entryPrice) * pos.qty;
    pos.unrealizedPnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice;

    // Stop-loss automático
    if (pos.stopLoss && currentPrice <= pos.stopLoss) {
      const msg = `[Medallion] STOP-LOSS triggered for ${pos.symbol} @ $${currentPrice.toFixed(2)} (SL: $${pos.stopLoss.toFixed(2)}, PnL: ${(pos.unrealizedPnlPct * 100).toFixed(2)}%)`;
      console.log(msg);
      storage.addEvent({ type: "medallion_stoploss", message: msg });
      // Crear señal de salida
      const exitSignal: TradingSignal = {
        id: `EXIT_SL_${Date.now()}`,
        symbol: pos.symbol,
        action: "exit",
        direction: "long",
        confidence: 1.0,
        strength: 1.0,
        compositeScore: -1,
        factors: { political: 0, sentiment: 0, macro: 0, technical: -1, weights: { political: 0, sentiment: 0, macro: 0, technical: 1 } },
        sizing: { kellyFraction: 0, recommendedPct: 1, maxRiskPct: 0, expectedReturn: 0, expectedRisk: 0 },
        rationale: ["Stop-loss triggered"],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 60_000),
        priority: "critical",
      };
      executeTrade(exitSignal, fundState.performance.currentCapital, errors);
    }

    // Take-profit automático
    if (pos.takeProfit && currentPrice >= pos.takeProfit) {
      const msg = `[Medallion] TAKE-PROFIT triggered for ${pos.symbol} @ $${currentPrice.toFixed(2)} (TP: $${pos.takeProfit.toFixed(2)}, PnL: +${(pos.unrealizedPnlPct * 100).toFixed(2)}%)`;
      console.log(msg);
      storage.addEvent({ type: "medallion_takeprofit", message: msg });
      const exitSignal: TradingSignal = {
        id: `EXIT_TP_${Date.now()}`,
        symbol: pos.symbol,
        action: "exit",
        direction: "long",
        confidence: 1.0,
        strength: 1.0,
        compositeScore: -0.5,
        factors: { political: 0, sentiment: 0, macro: 0, technical: 1, weights: { political: 0, sentiment: 0, macro: 0, technical: 1 } },
        sizing: { kellyFraction: 0, recommendedPct: 1, maxRiskPct: 0, expectedReturn: 0, expectedRisk: 0 },
        rationale: ["Take-profit triggered"],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 60_000),
        priority: "high",
      };
      executeTrade(exitSignal, fundState.performance.currentCapital, errors);
    }
  }

  fundState.performance.openPositions = fundState.positions.length;
}

// ─── Ciclo Principal de Inteligencia ─────────────────────────────────────────

async function runIntelligenceCycle(): Promise<MedallionCycleResult> {
  const cycleId = ++cycleIdCounter;
  const startTime = Date.now();
  const errors: string[] = [];
  let articlesProcessed = 0;
  let signalsGenerated = 0;
  let tradesExecuted = 0;

  console.log(`[Medallion] Starting intelligence cycle #${cycleId}...`);

  // === FASE 1: Recopilación de Noticias ===
  let articles: NewsArticle[] = [];
  try {
    const rawArticles = await fetchAllFeeds();
    const recentArticles = getRecentArticles(rawArticles, fundState.config.newsWindowMinutes);
    articles = analyzeArticlesBatch(recentArticles);
    articlesProcessed = articles.length;
    console.log(`[Medallion] Cycle #${cycleId}: Analyzed ${articlesProcessed} articles`);
  } catch (err) {
    errors.push(`News fetch error: ${(err as Error).message}`);
    console.error(`[Medallion] News fetch failed:`, err);
  }

  // === FASE 2: Análisis de Sentimiento ===
  const sentimentSnapshot = aggregateSentiment(articles);
  console.log(`[Medallion] Sentiment: ${sentimentSnapshot.overall.toFixed(3)} | Fear/Greed: ${sentimentSnapshot.fearGreedIndex} | Political: ${sentimentSnapshot.political.toFixed(3)}`);

  // === FASE 3: Análisis Político ===
  const intelligenceReport = generateIntelligenceReport(articles, sentimentSnapshot);
  console.log(`[Medallion] Political signals: ${intelligenceReport.signals.length} | Risk: ${intelligenceReport.compositeRiskScore.toFixed(2)} | Bias: ${intelligenceReport.tradingBias}`);
  console.log(`[Medallion] Theme: ${intelligenceReport.dominantTheme}`);

  // === FASE 4: Generación de Señales de Trading ===
  // Actualizar historial de precios desde storage
  const recentTicks = storage.getRecentTicks(50);
  for (const tick of recentTicks) {
    if (tick.price) updatePriceHistory(tick.symbol, tick.price);
  }

  const tradingSignals = generateTradingSignals(
    fundState.config.symbols,
    intelligenceReport,
    sentimentSnapshot,
    fundState.priceHistories,
  );

  const macro = estimateMacroEnvironment(sentimentSnapshot, intelligenceReport.centralBankSignals);
  const signalAggregation = updateSignals(tradingSignals, macro);
  signalsGenerated = tradingSignals.length;
  fundState.activeSignals = getActiveSignals();

  console.log(`[Medallion] Generated ${signalsGenerated} signals | Portfolio bias: ${signalAggregation.portfolioBias.toFixed(3)}`);
  if (signalAggregation.topBullish.length > 0) {
    console.log(`[Medallion] Top bullish: ${signalAggregation.topBullish.join(", ")}`);
  }
  if (signalAggregation.topBearish.length > 0) {
    console.log(`[Medallion] Top bearish: ${signalAggregation.topBearish.join(", ")}`);
  }

  // === FASE 5: Monitoreo de Posiciones ===
  monitorOpenPositions(errors);

  // === FASE 6: Ejecución de Trades ===
  const actionableSignals = tradingSignals.filter(
    s => s.action !== "hold"
      && s.confidence >= fundState.config.minConfidence
      && s.strength >= fundState.config.minSignalStrength
      && fundState.positions.length < fundState.config.maxPositions
  );

  // Obtener valor del portfolio
  let portfolioValue = fundState.performance.currentCapital;
  try {
    if (isBrokerConnected()) {
      const account = await getAccountInfo();
      portfolioValue = account?.equity ?? portfolioValue;
      fundState.performance.currentCapital = portfolioValue;
    }
  } catch (_) { /* silencio si Alpaca no está disponible */ }

  for (const signal of actionableSignals.slice(0, 3)) { // Max 3 trades por ciclo
    const trade = await executeTrade(signal, portfolioValue, errors);
    if (trade) tradesExecuted++;
  }

  // === FASE 7: Actualizar Report a Storage ===
  fundState.intelligenceReport = intelligenceReport;
  fundState.sentimentSnapshot = sentimentSnapshot;
  fundState.cycleCount = cycleId;

  const duration = Date.now() - startTime;
  const cycleResult: MedallionCycleResult = {
    cycleId,
    timestamp: new Date(),
    duration,
    articlesProcessed,
    signalsGenerated,
    tradesExecuted,
    intelligenceReport,
    sentimentSnapshot,
    signalAggregation,
    errors,
  };

  fundState.lastCycle = cycleResult;

  const summary = `[Medallion] Cycle #${cycleId} complete in ${duration}ms | Articles: ${articlesProcessed} | Signals: ${signalsGenerated} | Trades: ${tradesExecuted}`;
  console.log(summary);
  storage.addEvent({ type: "medallion_cycle", message: summary });

  if (errors.length > 0) {
    console.warn(`[Medallion] Cycle #${cycleId} errors: ${errors.join("; ")}`);
  }

  return cycleResult;
}

// ─── Ciclo con Reintentos ─────────────────────────────────────────────────────

async function runCycleWithRetry(): Promise<void> {
  if (!fundState.isRunning || fundState.isPaused) return;
  try {
    await runIntelligenceCycle();
  } catch (err) {
    console.error("[Medallion] Unhandled cycle error:", err);
    storage.addEvent({ type: "medallion_error", message: `Cycle error: ${(err as Error).message}` });
  }
}

// ─── API Pública del Fondo ────────────────────────────────────────────────────

export function startMedallionFund(config?: Partial<MedallionConfig>): void {
  if (fundState.isRunning) {
    console.log("[Medallion] Already running");
    return;
  }

  if (config) Object.assign(fundState.config, config);

  fundState.isRunning = true;
  fundState.isPaused = false;
  initializePriceHistoryFromStorage();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     MEDALLION FUND — AUTONOMOUS POLITICAL TRADING ENGINE      ║");
  console.log("║  Inspired by Renaissance Technologies / Jim Simons (1988)     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Symbols: ${fundState.config.symbols.join(", ").padEnd(52)}║`);
  console.log(`║  Cycle: ${String(fundState.config.cycleIntervalMs / 60000 + " min").padEnd(54)}║`);
  console.log(`║  Live Trading: ${String(fundState.config.enableLiveTrading).padEnd(47)}║`);
  console.log(`║  News Window: ${String(fundState.config.newsWindowMinutes + " min").padEnd(48)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Ejecutar inmediatamente al arrancar
  setTimeout(() => runCycleWithRetry(), 2000);

  // Programar ciclos periódicos
  cycleTimer = setInterval(runCycleWithRetry, fundState.config.cycleIntervalMs);
  storage.addEvent({ type: "medallion_start", message: `Medallion Fund started. Symbols: ${fundState.config.symbols.join(",")} | Interval: ${fundState.config.cycleIntervalMs / 1000}s` });
}

export function stopMedallionFund(): void {
  if (!fundState.isRunning) return;
  fundState.isRunning = false;
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }
  console.log("[Medallion] Fund stopped");
  storage.addEvent({ type: "medallion_stop", message: "Medallion Fund stopped" });
}

export function pauseMedallionFund(): void {
  fundState.isPaused = true;
  console.log("[Medallion] Fund paused");
}

export function resumeMedallionFund(): void {
  fundState.isPaused = false;
  console.log("[Medallion] Fund resumed");
}

export function getMedallionState(): MedallionFundState {
  return {
    ...fundState,
    priceHistories: new Map(
      Array.from(fundState.priceHistories.entries()).map(([k, v]) => [k, v.slice(-50)])
    ),
  };
}

export function getMedallionPerformance(): MedallionPerformance {
  return { ...fundState.performance };
}

export function getMedallionConfig(): MedallionConfig {
  return { ...fundState.config };
}

export function updateMedallionConfig(updates: Partial<MedallionConfig>): void {
  Object.assign(fundState.config, updates);
  console.log("[Medallion] Config updated:", updates);

  // Re-schedule si cambia el intervalo
  if (updates.cycleIntervalMs && fundState.isRunning) {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = setInterval(runCycleWithRetry, fundState.config.cycleIntervalMs);
  }
}

export function triggerManualCycle(): Promise<MedallionCycleResult> {
  console.log("[Medallion] Manual cycle triggered");
  return runIntelligenceCycle();
}

export function getMedallionSummary() {
  const perf = fundState.performance;
  const signals = getActiveSignals();
  const risks = getGeopoliticalRisks();
  const signalStats = getSignalEngineStats();

  return {
    isRunning: fundState.isRunning,
    isPaused: fundState.isPaused,
    cycleCount: fundState.cycleCount,
    lastCycle: fundState.lastCycle ? {
      cycleId: fundState.lastCycle.cycleId,
      timestamp: fundState.lastCycle.timestamp,
      articlesProcessed: fundState.lastCycle.articlesProcessed,
      signalsGenerated: fundState.lastCycle.signalsGenerated,
      tradesExecuted: fundState.lastCycle.tradesExecuted,
    } : null,
    performance: {
      totalTrades: perf.totalTrades,
      winRate: perf.winRate,
      totalPnl: perf.totalPnl,
      totalPnlPct: perf.totalPnlPct,
      openPositions: perf.openPositions,
      currentCapital: perf.currentCapital,
    },
    activeSignals: signals.length,
    openPositions: fundState.positions.length,
    geopoliticalRisks: risks.slice(0, 3).map(r => ({
      region: r.region,
      risk: r.riskLevel.toFixed(2),
    })),
    sentiment: fundState.sentimentSnapshot ? {
      overall: fundState.sentimentSnapshot.overall.toFixed(3),
      fearGreed: fundState.sentimentSnapshot.fearGreedIndex,
      bias: fundState.intelligenceReport?.tradingBias,
    } : null,
    dominantTheme: fundState.intelligenceReport?.dominantTheme,
    signalStats,
    config: fundState.config,
  };
}

// ─── Integración con Ticks del Sistema Evo ───────────────────────────────────

export function onNewPriceTick(symbol: string, price: number): void {
  updatePriceHistory(symbol, price);

  // Actualizar posiciones abiertas con precio actual
  const pos = fundState.positions.find(p => p.symbol === symbol);
  if (pos) {
    pos.currentPrice = price;
    pos.unrealizedPnl = (price - pos.entryPrice) * pos.qty;
    pos.unrealizedPnlPct = (price - pos.entryPrice) / pos.entryPrice;
  }
}

export function getMedallionSignalForEvolution(symbol: string): {
  bias: number;        // -1 a 1 para influir en el motor evolutivo
  confidence: number;  // peso de la señal
  theme: string;
} | null {
  const activeSignals = getActiveSignals();
  const signal = activeSignals.find(s => s.symbol === symbol);

  if (!signal) {
    const report = fundState.intelligenceReport;
    if (!report) return null;

    // Sesgo general del reporte
    const bias = report.tradingBias === "risk_on" ? 0.3
      : report.tradingBias === "risk_off" ? -0.3
      : 0;

    return {
      bias,
      confidence: 0.3,
      theme: report.dominantTheme,
    };
  }

  return {
    bias: signal.compositeScore,
    confidence: signal.confidence,
    theme: signal.rationale.join("; "),
  };
}
