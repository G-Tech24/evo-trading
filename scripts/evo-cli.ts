#!/usr/bin/env tsx
/**
 * EVO-CLI — Entry point principal del sistema EvoTrading en terminal
 * ==================================================================
 * Ejecutar con:
 *   npm run evo                    # Arranca con UI curses
 *   npm run evo -- --no-ui         # Solo logs de texto plano
 *   npm run evo -- --paper         # Forzar paper trading
 *   npm run evo -- --live          # Forzar live trading (¡con dinero real!)
 *   npm run evo -- --symbols BTC/USD,ETH/USD
 *
 * Variables de entorno (.env):
 *   ALPACA_KEY_ID=...
 *   ALPACA_SECRET_KEY=...
 *   ALPACA_PAPER=true              # default: true
 *   ALPACA_SYMBOLS=BTC/USD,ETH/USD # default
 *   ALPACA_MIN_NOTIONAL=10         # mínimo USD por orden (default: 10)
 *   ALPACA_MAX_NOTIONAL=500        # máximo USD por orden (default: 500)
 *   EVO_AGENTS=20                  # número inicial de agentes (default: 20)
 *   EVO_TICK_MS=2000               # ms entre ticks (default: 2000)
 *   EVO_USE_ALPACA_PRICE=true      # usar precio real de Alpaca (default: true si conectado)
 */

import "dotenv/config";
import { storage } from "../server/storage.js";
import {
  startSimulation,
  stopSimulation,
  spawnInitialPopulation,
} from "../server/evolutionEngine.js";
import {
  loadCheckpoint,
  saveCheckpoint,
  startAutoCheckpoint,
  getPersistenceStats,
} from "../server/persistenceManager.js";
import {
  initAlpacaBroker,
  getAccountInfo,
  getBrokerStats,
  getLatestQuote,
  subscribeMarketData,
  subscribeOrderUpdates,
  submitOrder,
  onTick,
  onOrderUpdate,
  type BrokerTick,
  type AlpacaOrder,
} from "../server/alpacaBroker.js";
import {
  getCirculatoryStats,
} from "../server/circulatorySystem.js";
import {
  getRespiratorySystemStats,
} from "../server/respiratorySystem.js";
import {
  getTrainingStats,
} from "../server/trainingEngine.js";
import {
  getDigestiveStats,
} from "../server/digestiveSystem.js";
import {
  getTegumentaryStats,
} from "../server/tegumentarySystem.js";
import {
  getReproductiveStats,
} from "../server/reproductiveSystem.js";
import {
  initTerminalUI,
  updateDashboard,
  logEvent,
  isUIActive,
  destroyUI,
  type DashboardData,
} from "../server/terminalUI.js";

// ─── Parsear argumentos CLI ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const useUI    = !args.includes("--no-ui");
const forcePaper = args.includes("--paper");
const forceLive  = args.includes("--live");
const symArg   = args.find(a => a.startsWith("--symbols="))?.split("=")[1];

if (forcePaper) process.env.ALPACA_PAPER = "true";
if (forceLive)  process.env.ALPACA_PAPER = "false";
if (symArg)     process.env.ALPACA_SYMBOLS = symArg;

const MIN_NOTIONAL = parseFloat(process.env.ALPACA_MIN_NOTIONAL ?? "10");
const MAX_NOTIONAL = parseFloat(process.env.ALPACA_MAX_NOTIONAL ?? "500");
const INITIAL_AGENTS = parseInt(process.env.EVO_AGENTS ?? "20", 10);
const TICK_MS = parseInt(process.env.EVO_TICK_MS ?? "2000", 10);

// ─── Estado global del CLI ────────────────────────────────────────────────────

let alpacaLatestPrice: number = 0;
let alpacaAccountEquity = 0;
let alpacaAccountCash = 0;
let alpacaUnrealizedPl = 0;
let alpacaOrdersTotal = 0;
let simRunning = false;

// Agentes con posición en Alpaca (id → symbol actual)
const agentAlpacaSymbol = new Map<string, string>();

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  console.clear();
  printBanner();

  // 0. Cargar checkpoint previo (si existe)
  const restored = await loadCheckpoint();
  if (restored) {
    const pStats = getPersistenceStats();
    const agoMin = pStats.lastSaveAgoSec ? Math.round(pStats.lastSaveAgoSec / 60) : "?";
    console.log(`[Persistence] Estado restaurado desde checkpoint (${agoMin}min atrás, ${(pStats.fileSizeBytes / 1024).toFixed(0)}KB)`);
  }

  // Arrancar auto-checkpoint (guarda cada 60s + en SIGINT/SIGTERM)
  startAutoCheckpoint();

  // 1. Inicializar Alpaca
  const alpacaOk = initAlpacaBroker();

  if (alpacaOk) {
    // Obtener info de cuenta
    const account = await getAccountInfo();
    if (account) {
      alpacaAccountEquity  = account.equity;
      alpacaAccountCash    = account.cash;
      alpacaUnrealizedPl   = account.unrealizedPl;
      logEvent(`{green-fg}Cuenta Alpaca{/green-fg}: equity=$${account.equity.toFixed(2)} cash=$${account.cash.toFixed(2)}`);
    }

    // Suscribir market data y órdenes
    subscribeMarketData();
    subscribeOrderUpdates();

    // Cuando llega un tick de Alpaca, usarlo como fuente de precio
    onTick((tick: BrokerTick) => {
      alpacaLatestPrice = tick.price;
    });

    // Log de fills de órdenes reales
    onOrderUpdate((order: AlpacaOrder) => {
      alpacaOrdersTotal++;
      const fillStr = order.filledAvgPrice
        ? ` @ $${order.filledAvgPrice.toFixed(2)}`
        : "";
      logEvent(
        `{yellow-fg}[ALPACA FILL]{/yellow-fg} ${order.side.toUpperCase()} ${order.symbol}${fillStr} — ${order.status}`
      );
    });

    // Obtener precio inicial via REST mientras el WS se conecta
    const symbols = getBrokerStats().symbols;
    for (const sym of symbols) {
      const tick = await getLatestQuote(sym);
      if (tick) {
        alpacaLatestPrice = tick.price;
        logEvent(`{cyan-fg}${sym}{/cyan-fg} precio inicial: $${tick.price.toLocaleString()}`);
      }
    }

  } else {
    logEvent(`{yellow-fg}[AVISO]{/yellow-fg} Alpaca no conectado — usando precios simulados (BTC Brownian)`);
    logEvent(`{grey-fg}Configura ALPACA_KEY_ID y ALPACA_SECRET_KEY en .env para activar el broker real{/grey-fg}`);
  }

  // 2. Crear agentes iniciales solo si no hay checkpoint (primera vez)
  if (storage.getAllAgents().length === 0) {
    spawnInitialPopulation(INITIAL_AGENTS);
    logEvent(`{green-fg}Creados ${INITIAL_AGENTS} agentes evolutivos (CfC+GAT+NCP){/green-fg}`);
  } else {
    logEvent(`{cyan-fg}Checkpoint restaurado{/cyan-fg}: ${storage.getAliveAgents().length} agentes vivos, ${storage.getDeadAgents().length} muertos`);
  }

  // 3. Arrancar UI o modo texto
  if (useUI) {
    initTerminalUI();
    logEvent(`{cyan-fg}EvoTrading Dashboard iniciado{/cyan-fg} — q para salir`);
  } else {
    logEvent("Modo texto activo (--no-ui). Ctrl+C para salir.");
  }

  // 4. Iniciar simulación
  simRunning = true;
  startSimulation();
  logEvent(`{green-fg}Simulación iniciada{/green-fg} — tick cada ${TICK_MS}ms`);

  // 5. Loop de UI
  if (useUI) {
    setInterval(refreshDashboard, 1000);
  }

  // 6. Loop de integración Alpaca (cada tick de evo, ejecutar órdenes reales)
  if (alpacaOk) {
    hookAlpacaOrders();
  }

  // 7. Actualizar cuenta Alpaca cada 30s
  if (alpacaOk) {
    setInterval(async () => {
      const account = await getAccountInfo();
      if (account) {
        alpacaAccountEquity = account.equity;
        alpacaAccountCash   = account.cash;
        alpacaUnrealizedPl  = account.unrealizedPl;
      }
    }, 30_000);
  }
}



// ─── Hook Alpaca: interceptar decisiones de agentes y ejecutar órdenes reales ─

function hookAlpacaOrders() {
  /**
   * Cada vez que un agente abre o cierra una posición en el motor de evolución,
   * enviamos la orden correspondiente a Alpaca.
   *
   * Para no duplicar la lógica del engine, observamos los eventos de storage
   * que el evolutionEngine ya crea (tipo "trade"), y si el agente tiene
   * PnL positivo o es la primera orden, la replicamos en Alpaca.
   *
   * Capital real invertido = (capital del agente / 10000) * MAX_NOTIONAL
   * Se escala linealmente para que agentes con más capital inviertan más.
   */
  const lastSeen = new Map<string, number>();
  const lastOrderTime = new Map<string, number>(); // cooldown anti-spam
  const ORDER_COOLDOWN_MS = 10000; // mínimo 10s entre órdenes por agente // agentId → último tradeId procesado

  setInterval(async () => {
    const agents = storage.getAliveAgents();
    const symbols = getBrokerStats().symbols;
    const primarySymbol = symbols[0] ?? "BTC/USD";

    for (const agent of agents) {
      const trades = storage.getTradesByAgent(agent.id);
      if (trades.length === 0) continue;

      const latestTrade = trades[trades.length - 1];
      const lastId = lastSeen.get(agent.id) ?? -1;

      // Si este trade ya fue procesado, skip
      if (latestTrade.id <= lastId) continue;
      lastSeen.set(agent.id, latestTrade.id);

      // Escalar capital: agentes con más capital invierten más en Alpaca
      const capitalRatio = Math.min(1, agent.capital / agent.initialCapital);
      const notional = Math.max(
        MIN_NOTIONAL,
        Math.min(MAX_NOTIONAL, capitalRatio * MAX_NOTIONAL * agent.positionSizing * 2)
      );

      // Solo ejecutamos órdenes para agentes con fitness sólido (> 0.5)
      // y que hayan completado al menos 3 trades para tener señal real.
      // Previene spam de órdenes de agentes sin historial.
      if (agent.fitnessScore < 0.5) continue;
      if (agent.totalTrades < 3) continue;

      // Cooldown: no más de 1 orden por agente cada 10 segundos
      const now = Date.now();
      const lastOrder = lastOrderTime.get(agent.id) ?? 0;
      if (now - lastOrder < ORDER_COOLDOWN_MS) continue;
      lastOrderTime.set(agent.id, now);

      const symbol = agentAlpacaSymbol.get(agent.id) ?? primarySymbol;

      await submitOrder(
        agent.id,
        symbol,
        latestTrade.type as "buy" | "sell",
        notional,
        `${agent.strategy} | fit=${agent.fitnessScore.toFixed(3)}`
      );
    }
  }, TICK_MS + 500); // Ligeramente después del tick del engine
}

// ─── Refresh del dashboard ────────────────────────────────────────────────────

async function refreshDashboard() {
  const agents = storage.getAliveAgents();
  const ticks = storage.getRecentTicks(80);
  const currentPrice = alpacaLatestPrice > 0
    ? alpacaLatestPrice
    : ticks[ticks.length - 1]?.price ?? 0;

  const stats     = storage.getSystemStats();
  const circ      = getCirculatoryStats();
  const resp      = getRespiratorySystemStats();
  const training  = getTrainingStats();
  const brokerSt  = getBrokerStats();

  const dominantRegime = resp?.regimeDistribution
    ? Object.entries(resp.regimeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "eupnea"
    : "eupnea";

  const dominantPhase = training?.phaseDistribution
    ? Object.entries(training.phaseDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "warmup"
    : "warmup";

  const data: DashboardData = {
    agents: agents.slice(0, 20).map(a => ({
      id: a.id,
      name: a.name,
      strategy: a.strategy,
      capital: a.capital,
      pnl: a.pnl,
      fitness: a.fitnessScore,
      winRate: a.winRate,
      trades: a.totalTrades,
      position: a.openPosition ?? "",
      gen: a.generation,
    })),
    priceHistory: ticks.map(t => t.price),
    currentPrice,
    symbol: brokerSt.symbols[0] ?? "SIM",
    generation: stats.currentGeneration,
    totalTrades: stats.totalTrades,
    totalPnl: stats.totalPnl,
    bestFitness: stats.bestFitness,
    events: [],
    vitals: {
      heartRate: circ?.heartRate ?? 0,
      bloodPressure: circ?.bloodPressure ?? 0,
      oxygenSaturation: circ?.oxygenSaturation ?? 0,
      avgO2: resp?.avgOxygenLevel ?? 0,
      avgCo2: resp?.avgCo2Level ?? 0,
      avgFitnessModifier: resp?.avgFitnessModifier ?? 1,
      trainingPhase: dominantPhase,
      trainingPassRate: training?.averagePassRate ?? 0,
      generalizationScore: training?.averageGeneralizationScore ?? 0,
      dominantRegime,
      // Digestive
      memoryEpisodes: (() => { try { const d = getDigestiveStats(); return d.totalEpisodes; } catch { return 0; } })(),
      ewcProtection: (() => { try { const d = getDigestiveStats(); return d.ewcOmegaAvg; } catch { return 0; } })(),
      memoryPressure: (() => { try { const d = getDigestiveStats(); return d.memoryPressure; } catch { return 0; } })(),
      // Tegumentary
      thermalRegime: (() => { try { return getTegumentaryStats().currentRegime; } catch { return "normothermic"; } })(),
      cpuUsage: (() => { try { return getTegumentaryStats().cpuUsage; } catch { return 0; } })(),
      tickDurationMs: (() => { try { return getTegumentaryStats().avgTickDurationMs; } catch { return 0; } })(),
      // Reproductive
      niches: (() => { try { return getReproductiveStats(agents).totalNiches; } catch { return 0; } })(),
      paretoFrontSize: (() => { try { return getReproductiveStats(agents).paretoFrontSize; } catch { return 0; } })(),
      diversityIndex: (() => { try { return getReproductiveStats(agents).diversityIndex; } catch { return 0; } })(),
    },
    broker: {
      connected: brokerSt.connected,
      isPaper: brokerSt.isPaper,
      ordersSubmitted: brokerSt.totalOrdersSubmitted,
      equity: alpacaAccountEquity,
      cash: alpacaAccountCash,
      unrealizedPl: alpacaUnrealizedPl,
    },
    tickCount: ticks.length,
    simulationRunning: simRunning,
  };

  updateDashboard(data);
}

// ─── Banner inicial ───────────────────────────────────────────────────────────

function printBanner() {
  const lines = [
    "",
    "  ███████╗██╗   ██╗ ██████╗ ████████╗██████╗  █████╗ ██████╗ ██╗███╗   ██╗ ██████╗ ",
    "  ██╔════╝██║   ██║██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔════╝ ",
    "  █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝███████║██║  ██║██║██╔██╗ ██║██║  ███╗",
    "  ██╔══╝  ╚██╗ ██╔╝██║   ██║   ██║   ██╔══██╗██╔══██║██║  ██║██║██║╚██╗██║██║   ██║",
    "  ███████╗ ╚████╔╝ ╚██████╔╝   ██║   ██║  ██║██║  ██║██████╔╝██║██║ ╚████║╚██████╔╝",
    "  ╚══════╝  ╚═══╝   ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ ",
    "",
    "  Red de Agentes Evolutivos — Física · Matemáticas · Química → Trading",
    "  Broker: Alpaca Markets (paper/live)    Sistema Nervioso: CfC + NCP + GAT",
    "",
  ];
  console.log(lines.join("\n"));
}

// ─── Manejo de señales ────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log("\n[EvoTrading] Deteniendo simulación...");
  stopSimulation();
  if (isUIActive()) destroyUI();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  if (isUIActive()) destroyUI();
  console.error("[EvoTrading] Error no capturado:", err);
  process.exit(1);
});

// ─── Main ─────────────────────────────────────────────────────────────────────

bootstrap().catch(err => {
  console.error("[EvoTrading] Error en bootstrap:", err);
  process.exit(1);
});
