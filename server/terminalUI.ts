/**
 * TERMINAL UI — Dashboard curses-style para EvoTrading
 * =====================================================
 * Dashboard en tiempo real usando blessed + blessed-contrib.
 * Muestra agentes, PnL, vitales, precio, órdenes y eventos
 * directamente en la terminal sin necesidad de navegador.
 *
 * Layout (80+ cols recomendado, 140+ ideal):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  HEADER: título, modo (PAPER/LIVE), tiempo, generación         │
 * ├────────────────────┬───────────────────────┬────────────────────┤
 * │  Gráfica precio    │  Tabla agentes vivos   │  Vitales sistema   │
 * │  (sparkline)       │                        │  circulatorio      │
 * ├────────────────────┤                        │  respiratorio      │
 * │  Métricas Alpaca   │                        │  entrenamiento     │
 * ├────────────────────┴───────────────────────┼────────────────────┤
 * │  Log de eventos / órdenes (scroll)         │  Stats generales   │
 * └────────────────────────────────────────────┴────────────────────┘
 */

import * as blessed from "blessed";
import * as contrib from "blessed-contrib";

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  name: string;
  strategy: string;
  capital: number;
  pnl: number;
  fitness: number;
  winRate: number;
  trades: number;
  position: string;
  gen: number;
}

interface VitalsSnapshot {
  heartRate: number;
  bloodPressure: number;
  oxygenSaturation: number;
  avgO2: number;
  avgCo2: number;
  avgFitnessModifier: number;
  trainingPhase: string;
  trainingPassRate: number;
  generalizationScore: number;
  dominantRegime: string;
}

interface BrokerSnapshot {
  connected: boolean;
  isPaper: boolean;
  ordersSubmitted: number;
  equity: number;
  cash: number;
  unrealizedPl: number;
}

export interface DashboardData {
  agents: AgentRow[];
  priceHistory: number[];
  currentPrice: number;
  symbol: string;
  generation: number;
  totalTrades: number;
  totalPnl: number;
  bestFitness: number;
  events: string[];
  vitals: VitalsSnapshot;
  broker: BrokerSnapshot;
  tickCount: number;
  simulationRunning: boolean;
}

// ─── Estado del UI ─────────────────────────────────────────────────────────────

let screen: blessed.Widgets.Screen | null = null;
let grid: any = null;
let widgets: Record<string, any> = {};
let uiActive = false;

// Historial de precios para la sparkline (max 80 puntos)
const sparkPrices: number[] = [];
// Log de eventos (max 200 líneas)
const eventLog: string[] = [];

// ─── Colores ANSI helpers ──────────────────────────────────────────────────────

function green(s: string | number) { return `{green-fg}${s}{/green-fg}`; }
function red(s: string | number)   { return `{red-fg}${s}{/red-fg}`; }
function yellow(s: string | number){ return `{yellow-fg}${s}{/yellow-fg}`; }
function cyan(s: string | number)  { return `{cyan-fg}${s}{/cyan-fg}`; }
function magenta(s: string | number){ return `{magenta-fg}${s}{/magenta-fg}`; }
function bold(s: string | number)  { return `{bold}${s}{/bold}`; }
function dim(s: string | number)   { return `{grey-fg}${s}{/grey-fg}`; }

function pnlColor(val: number): string {
  return val >= 0 ? green(`+$${val.toFixed(2)}`) : red(`-$${Math.abs(val).toFixed(2)}`);
}

function fitColor(val: number): string {
  if (val > 0.6) return green(val.toFixed(3));
  if (val > 0.2) return yellow(val.toFixed(3));
  return red(val.toFixed(3));
}

function posColor(pos: string | null): string {
  if (!pos) return dim("—");
  return pos === "long" ? green("▲ LONG") : red("▼ SHORT");
}

// ─── Inicializar dashboard ────────────────────────────────────────────────────

export function initTerminalUI(): void {
  if (uiActive) return;

  screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: "EvoTrading — Red de Agentes Evolutivos",
  });

  // Grid 12×12
  grid = new contrib.grid({ rows: 12, cols: 12, screen });

  // ── Fila 0: Header (barra superior como texto simple) ──
  widgets.header = grid.set(0, 0, 1, 12, blessed.box, {
    tags: true,
    style: { fg: "cyan", bg: "black", bold: true },
    border: false,
    padding: { left: 1 },
  });

  // ── Fila 1-4: Sparkline de precio (col 0-4) ──
  widgets.sparkline = grid.set(1, 0, 3, 5, contrib.sparkline, {
    label: " Precio (últimas 80 barras) ",
    tags: true,
    style: { fg: "cyan", titleFg: "cyan" },
    border: { type: "line", fg: "cyan" },
  });

  // ── Fila 1-4: Métricas Alpaca (col 5-7) ──
  widgets.alpacaBox = grid.set(1, 5, 3, 3, blessed.box, {
    label: " Alpaca Markets ",
    tags: true,
    border: { type: "line", fg: "green" },
    padding: { left: 1, top: 0 },
    style: { fg: "white", border: { fg: "green" } },
  });

  // ── Fila 1-4: Vitales sistema (col 8-11) ──
  widgets.vitalsBox = grid.set(1, 8, 3, 4, blessed.box, {
    label: " Signos Vitales ",
    tags: true,
    border: { type: "line", fg: "red" },
    padding: { left: 1, top: 0 },
    style: { fg: "white", border: { fg: "red" } },
  });

  // ── Fila 4-9: Tabla de agentes (col 0-7) ──
  widgets.agentTable = grid.set(4, 0, 5, 8, contrib.table, {
    label: " Agentes Vivos ",
    keys: true,
    interactive: false,
    border: { type: "line", fg: "yellow" },
    columnSpacing: 2,
    columnWidth: [16, 18, 10, 11, 8, 7, 6, 8, 4],
    style: {
      fg: "white",
      border: { fg: "yellow" },
      header: { fg: "yellow", bold: true },
      cell: { selected: { fg: "black", bg: "white" } },
    },
  });

  // ── Fila 4-9: Stats generales (col 8-11) ──
  widgets.statsBox = grid.set(4, 8, 5, 4, blessed.box, {
    label: " Sistema ",
    tags: true,
    border: { type: "line", fg: "magenta" },
    padding: { left: 1, top: 0 },
    style: { fg: "white", border: { fg: "magenta" } },
  });

  // ── Fila 9-12: Log de eventos (col 0-11) ──
  widgets.logBox = grid.set(9, 0, 3, 12, contrib.log, {
    label: " Log de eventos (q: salir, s: start/stop) ",
    tags: true,
    border: { type: "line", fg: "grey" },
    style: { fg: "white", border: { fg: "grey" } },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: " ", inverse: true },
  });

  // ── Atajos de teclado ──
  screen.key(["q", "C-c"], () => {
    screen?.destroy();
    process.exit(0);
  });

  screen.render();
  uiActive = true;
}

// ─── Actualizar UI con datos nuevos ──────────────────────────────────────────

export function updateDashboard(data: DashboardData): void {
  if (!screen || !uiActive) return;

  try {
    updateHeader(data);
    updateSparkline(data);
    updateAlpacaBox(data);
    updateVitalsBox(data);
    updateAgentTable(data);
    updateStatsBox(data);
    screen.render();
  } catch (_) {
    // Ignorar errores de render (resize, etc.)
  }
}

function updateHeader(data: DashboardData) {
  const mode = data.broker.isPaper
    ? yellow("◆ PAPER TRADING")
    : `{red-fg}{bold}◆ LIVE TRADING{/bold}{/red-fg}`;
  const status = data.simulationRunning ? green("● RUNNING") : red("● STOPPED");
  const time = new Date().toLocaleTimeString("es-ES");
  widgets.header.setContent(
    `${bold("EVO")}${cyan("TRADING")}  │  ${mode}  │  ${status}  │  ` +
    `Gen ${bold(data.generation)}  │  Tick ${data.tickCount}  │  ${dim(time)}  │  ` +
    `${cyan(data.symbol)} ${bold("$" + data.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }))}`
  );
}

function updateSparkline(data: DashboardData) {
  if (data.currentPrice > 0) {
    sparkPrices.push(data.currentPrice);
    if (sparkPrices.length > 80) sparkPrices.shift();
  }

  if (sparkPrices.length < 2) return;

  // Normalizar para sparkline (blessed-contrib quiere array de números 0-100)
  const min = Math.min(...sparkPrices);
  const max = Math.max(...sparkPrices);
  const range = max - min || 1;
  const normalized = sparkPrices.map(p => ((p - min) / range) * 100);

  const first = sparkPrices[0];
  const last = sparkPrices[sparkPrices.length - 1];
  const change = ((last - first) / first) * 100;
  const changeStr = change >= 0
    ? green(`+${change.toFixed(2)}%`)
    : red(`${change.toFixed(2)}%`);

  widgets.sparkline.setData(
    [`${data.symbol} ${changeStr}`],
    [normalized]
  );
}

function updateAlpacaBox(data: DashboardData) {
  const b = data.broker;
  const connStr = b.connected
    ? green("✓ CONECTADO")
    : red("✗ DESCONECTADO (simulación)");

  const lines = [
    `${connStr}`,
    `${dim("Modo:")}    ${b.isPaper ? yellow("PAPER") : red("LIVE")}`,
    `${dim("Equity:")}  ${cyan("$" + b.equity.toLocaleString("en-US", { maximumFractionDigits: 2 }))}`,
    `${dim("Cash:")}    $${b.cash.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
    `${dim("U/PnL:")}   ${pnlColor(b.unrealizedPl)}`,
    `${dim("Órdenes:")} ${bold(b.ordersSubmitted)}`,
  ];
  widgets.alpacaBox.setContent(lines.join("\n"));
}

function updateVitalsBox(data: DashboardData) {
  const v = data.vitals;
  const bpmColor = v.heartRate > 60 ? yellow : green;

  const lines = [
    `${cyan("♥")} ${dim("HR:")}   ${bpmColor(v.heartRate + " bpm")}  ${dim("BP:")} ${(v.bloodPressure * 100).toFixed(0)}%`,
    `${cyan("◎")} ${dim("O₂:")}   ${green((v.avgO2 * 100).toFixed(1) + "%")}  ${dim("CO₂:")} ${red((v.avgCo2 * 100).toFixed(1) + "%")}`,
    `${cyan("~")} ${dim("Régimen:")} ${magenta(v.dominantRegime)}`,
    `${cyan("⚡")} ${dim("FitMod:")} ${green(v.avgFitnessModifier.toFixed(3))}`,
    `${cyan("🧠")} ${dim("Fase:")}   ${yellow(v.trainingPhase)}`,
    `${dim("Pass:")} ${(v.trainingPassRate * 100).toFixed(1)}%  ${dim("Gen:")} ${(v.generalizationScore * 100).toFixed(1)}%`,
  ];
  widgets.vitalsBox.setContent(lines.join("\n"));
}

function updateAgentTable(data: DashboardData) {
  const sorted = [...data.agents]
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, 20); // Máximo 20 filas

  const headers = ["Nombre", "Estrategia", "Capital", "PnL", "Win%", "Fit", "Trd", "Pos", "Gen"];

  const rows = sorted.map(a => [
    a.name.slice(0, 15),
    a.strategy.slice(0, 17),
    "$" + a.capital.toFixed(0),
    (a.pnl >= 0 ? "+" : "") + a.pnl.toFixed(0),
    (a.winRate * 100).toFixed(0) + "%",
    a.fitness.toFixed(3),
    a.trades.toString(),
    a.position || "—",
    a.gen.toString(),
  ]);

  widgets.agentTable.setData({ headers, data: rows });
}

function updateStatsBox(data: DashboardData) {
  const pnl = data.totalPnl;
  const alive = data.agents.length;
  const avgFit = alive > 0
    ? data.agents.reduce((s, a) => s + a.fitness, 0) / alive
    : 0;

  const lines = [
    `${dim("Agentes:")} ${bold(alive)}`,
    `${dim("Gen:")}     ${bold(data.generation)}`,
    `${dim("Trades:")} ${bold(data.totalTrades)}`,
    `${dim("Total PnL:")}`,
    `  ${pnlColor(pnl)}`,
    `${dim("Best fit:")} ${fitColor(data.bestFitness)}`,
    `${dim("Avg fit:")}  ${fitColor(avgFit)}`,
    `${dim("Ticks:")}  ${data.tickCount}`,
  ];
  widgets.statsBox.setContent(lines.join("\n"));
}

// ─── Log de eventos ───────────────────────────────────────────────────────────

export function logEvent(message: string): void {
  const time = new Date().toLocaleTimeString("es-ES", { hour12: false });
  const line = `${dim(time)} ${message}`;
  eventLog.push(line);
  if (eventLog.length > 200) eventLog.shift();

  if (widgets.logBox && uiActive) {
    widgets.logBox.log(line);
    screen?.render();
  } else {
    // Si el UI no está activo, imprimir al stdout normal
    console.log(`[${time}] ${message.replace(/\{[^}]+\}/g, "")}`);
  }
}

// ─── Modo sin UI (solo logs estructurados) ───────────────────────────────────

export function isUIActive(): boolean {
  return uiActive;
}

export function destroyUI(): void {
  if (screen) {
    screen.destroy();
    screen = null;
    uiActive = false;
  }
}
