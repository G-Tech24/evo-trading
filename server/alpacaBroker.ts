/**
 * ALPACA BROKER — Puente entre los agentes evolutivos y el mercado real
 * ======================================================================
 * Conecta el motor de evolución con Alpaca Markets.
 * Soporta paper trading y live trading con el mismo código.
 *
 * Variables de entorno requeridas:
 *   ALPACA_KEY_ID       — tu API key de Alpaca
 *   ALPACA_SECRET_KEY   — tu API secret de Alpaca
 *   ALPACA_PAPER=true   — paper trading (omitir o false para live)
 *   ALPACA_SYMBOLS      — símbolos a operar, separados por coma (default: BTC/USD,ETH/USD)
 */

// @ts-ignore — el paquete no tiene types perfectos
import Alpaca from "@alpacahq/alpaca-trade-api";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface AlpacaOrder {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  filledQty: number;
  price: number | null;
  filledAvgPrice: number | null;
  status: string;
  submittedAt: string;
  filledAt: string | null;
}

export interface AlpacaPosition {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
}

export interface AlpacaAccountInfo {
  equity: number;
  cash: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
  portfolioValue: number;
  unrealizedPl: number;
  realizedPl: number;
  isPaper: boolean;
}

export interface BrokerTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: Date;
}

export type OrderCallback = (order: AlpacaOrder) => void;
export type TickCallback = (tick: BrokerTick) => void;
export type ErrorCallback = (err: Error) => void;

// ─── Broker singleton ──────────────────────────────────────────────────────────

let alpacaClient: any = null;
let brokerConnected = false;
let brokerError: string | null = null;

// Estado de las posiciones abiertas por agente
const agentOrderMap = new Map<string, AlpacaOrder[]>(); // agentId → órdenes activas
const latestTicks = new Map<string, BrokerTick>();      // symbol → último tick

// Callbacks registrados
const orderCallbacks: OrderCallback[] = [];
const tickCallbacks: TickCallback[] = [];

// Historial de PnL por agente desde Alpaca (PnL real)
const agentRealPnl = new Map<string, number>();
const agentRealOrders = new Map<string, number>(); // total de órdenes ejecutadas realmente

// ─── Inicialización ────────────────────────────────────────────────────────────

export function initAlpacaBroker(): boolean {
  const keyId = process.env.ALPACA_KEY_ID;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const isPaper = process.env.ALPACA_PAPER !== "false";

  if (!keyId || !secretKey) {
    brokerError = "ALPACA_KEY_ID y ALPACA_SECRET_KEY no están configuradas. Modo simulación activo.";
    console.warn(`[Alpaca] ${brokerError}`);
    return false;
  }

  try {
    alpacaClient = new Alpaca({
      keyId,
      secretKey,
      paper: isPaper,
    });
    brokerConnected = true;
    brokerError = null;
    console.log(`[Alpaca] Conectado. Modo: ${isPaper ? "PAPER" : "LIVE"}`);
    return true;
  } catch (err: any) {
    brokerError = err.message;
    brokerConnected = false;
    console.error(`[Alpaca] Error de conexión: ${err.message}`);
    return false;
  }
}

export function isBrokerConnected(): boolean {
  return brokerConnected;
}

export function getBrokerError(): string | null {
  return brokerError;
}

export function isPaperMode(): boolean {
  return process.env.ALPACA_PAPER !== "false";
}

// ─── Account ──────────────────────────────────────────────────────────────────

export async function getAccountInfo(): Promise<AlpacaAccountInfo | null> {
  if (!alpacaClient) return null;
  try {
    const account = await alpacaClient.getAccount();
    return {
      equity: parseFloat(account.equity),
      cash: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
      dayTradingBuyingPower: parseFloat(account.daytrading_buying_power),
      portfolioValue: parseFloat(account.portfolio_value),
      unrealizedPl: parseFloat(account.unrealized_pl),
      realizedPl: parseFloat(account.last_equity) - parseFloat(account.last_equity), // approx
      isPaper: account.account_type === "trading" && isPaperMode(),
    };
  } catch (err: any) {
    console.error(`[Alpaca] getAccount error: ${err.message}`);
    return null;
  }
}

// ─── Market Data ──────────────────────────────────────────────────────────────

const SUPPORTED_SYMBOLS = (process.env.ALPACA_SYMBOLS ?? "BTC/USD,ETH/USD").split(",").map(s => s.trim());

export function getWatchedSymbols(): string[] {
  return SUPPORTED_SYMBOLS;
}

/**
 * Obtiene la última cotización (via REST) para un símbolo cripto o acción.
 */
export async function getLatestQuote(symbol: string): Promise<BrokerTick | null> {
  if (!alpacaClient) return null;
  try {
    // Para crypto, Alpaca usa formato "BTC/USD"
    const isCrypto = symbol.includes("/");
    let price = 0, bid = 0, ask = 0, volume = 0;

    if (isCrypto) {
      const bars = await alpacaClient.getCryptoBars(
        [symbol],
        { timeframe: "1Min", limit: 1 }
      );
      const bar = bars.bars?.[symbol]?.[0];
      if (!bar) return null;
      price = bar.c;
      bid = bar.c * 0.9995;
      ask = bar.c * 1.0005;
      volume = bar.v;
    } else {
      const quote = await alpacaClient.getLatestQuote(symbol);
      price = (quote.ap + quote.bp) / 2;
      bid = quote.bp;
      ask = quote.ap;
      volume = 0;
    }

    const tick: BrokerTick = {
      symbol,
      price,
      bid,
      ask,
      volume,
      timestamp: new Date(),
    };
    latestTicks.set(symbol, tick);
    return tick;
  } catch (err: any) {
    console.error(`[Alpaca] getLatestQuote(${symbol}) error: ${err.message}`);
    return null;
  }
}

/**
 * Suscribe el WebSocket de datos para recibir barras 1-minuto en tiempo real.
 * Llama a los tickCallbacks registrados con cada actualización.
 */
export function subscribeMarketData(): void {
  if (!alpacaClient) return;

  const cryptoSymbols = SUPPORTED_SYMBOLS.filter(s => s.includes("/"));
  const stockSymbols  = SUPPORTED_SYMBOLS.filter(s => !s.includes("/"));

  if (cryptoSymbols.length > 0) {
    const cryptoWs = alpacaClient.crypto_stream_v1beta3;

    cryptoWs.onConnect(() => {
      console.log("[Alpaca WS] Cripto conectado:", cryptoSymbols.join(", "));
      cryptoWs.subscribeForBars(cryptoSymbols);
    });

    cryptoWs.onCryptoBar((bar: any) => {
      const tick: BrokerTick = {
        symbol: bar.Symbol,
        price: bar.Close,
        bid: bar.Close * 0.9995,
        ask: bar.Close * 1.0005,
        volume: bar.Volume,
        timestamp: new Date(bar.Timestamp),
      };
      latestTicks.set(bar.Symbol, tick);
      tickCallbacks.forEach(cb => cb(tick));
    });

    cryptoWs.onError((err: any) => {
      console.error("[Alpaca WS Cripto] Error:", err);
    });

    try {
      cryptoWs.connect();
    } catch (err: any) {
      console.warn("[Alpaca WS Cripto] No se pudo conectar:", err.message);
    }
  }

  if (stockSymbols.length > 0) {
    const stockWs = alpacaClient.data_stream_v2;

    stockWs.onConnect(() => {
      console.log("[Alpaca WS] Acciones conectado:", stockSymbols.join(", "));
      stockWs.subscribeForBars(stockSymbols);
    });

    stockWs.onStockBar((bar: any) => {
      const tick: BrokerTick = {
        symbol: bar.Symbol,
        price: bar.Close,
        bid: bar.Close * 0.999,
        ask: bar.Close * 1.001,
        volume: bar.Volume,
        timestamp: new Date(bar.Timestamp),
      };
      latestTicks.set(bar.Symbol, tick);
      tickCallbacks.forEach(cb => cb(tick));
    });

    stockWs.onError((err: any) => {
      console.error("[Alpaca WS Acciones] Error:", err);
    });

    try {
      stockWs.connect();
    } catch (err: any) {
      console.warn("[Alpaca WS Acciones] No se pudo conectar:", err.message);
    }
  }
}

/**
 * Suscribe el WebSocket de órdenes/cuenta para recibir fills en tiempo real.
 */
export function subscribeOrderUpdates(): void {
  if (!alpacaClient) return;

  const tradeWs = alpacaClient.trade_ws;

  tradeWs.onConnect(() => {
    console.log("[Alpaca WS] Trade stream conectado.");
    tradeWs.subscribe(["trade_updates"]);
  });

  tradeWs.onStateChange((status: string) => {
    if (status === "authenticated") {
      tradeWs.subscribe(["trade_updates"]);
    }
  });

  tradeWs.onOrderUpdate((update: any) => {
    const order: AlpacaOrder = {
      orderId: update.order.id,
      clientOrderId: update.order.client_order_id,
      symbol: update.order.symbol,
      side: update.order.side,
      qty: parseFloat(update.order.qty || "0"),
      filledQty: parseFloat(update.order.filled_qty || "0"),
      price: update.order.limit_price ? parseFloat(update.order.limit_price) : null,
      filledAvgPrice: update.order.filled_avg_price ? parseFloat(update.order.filled_avg_price) : null,
      status: update.order.status,
      submittedAt: update.order.submitted_at,
      filledAt: update.order.filled_at,
    };
    orderCallbacks.forEach(cb => cb(order));
  });

  tradeWs.onError((err: any) => {
    console.error("[Alpaca WS Trade] Error:", err);
  });

  try {
    tradeWs.connect();
  } catch (err: any) {
    console.warn("[Alpaca WS Trade] No se pudo conectar:", err.message);
  }
}

// ─── Event callbacks ───────────────────────────────────────────────────────────

export function onOrderUpdate(cb: OrderCallback): void {
  orderCallbacks.push(cb);
}

export function onTick(cb: TickCallback): void {
  tickCallbacks.push(cb);
}

// ─── Órdenes ──────────────────────────────────────────────────────────────────

/**
 * Envía una orden de mercado a Alpaca en nombre de un agente.
 * clientOrderId = `evo_{agentId}_{timestamp}` para trazabilidad.
 *
 * Para cripto: usa `qty` en unidades de la moneda base (BTC, ETH, etc.)
 * Para acciones: usa `qty` en acciones (puede ser fraccionario con Alpaca)
 */
export async function submitOrder(
  agentId: string,
  symbol: string,
  side: "buy" | "sell",
  notional: number, // En USD — Alpaca calcula la qty automáticamente
  rationale: string = ""
): Promise<AlpacaOrder | null> {
  if (!alpacaClient) {
    console.warn(`[Alpaca] No conectado. Orden simulada: ${side} ${symbol} $${notional}`);
    return null;
  }

  const clientOrderId = `evo_${agentId.slice(0, 8)}_${Date.now()}`;

  try {
    const orderParams: any = {
      symbol,
      notional: notional.toFixed(2),
      side,
      type: "market",
      time_in_force: symbol.includes("/") ? "gtc" : "day", // crypto: GTC, stocks: DAY
      client_order_id: clientOrderId,
    };

    const rawOrder = await alpacaClient.createOrder(orderParams);

    const order: AlpacaOrder = {
      orderId: rawOrder.id,
      clientOrderId: rawOrder.client_order_id,
      symbol: rawOrder.symbol,
      side: rawOrder.side,
      qty: parseFloat(rawOrder.qty || "0"),
      filledQty: parseFloat(rawOrder.filled_qty || "0"),
      price: null,
      filledAvgPrice: rawOrder.filled_avg_price ? parseFloat(rawOrder.filled_avg_price) : null,
      status: rawOrder.status,
      submittedAt: rawOrder.submitted_at,
      filledAt: rawOrder.filled_at,
    };

    // Registrar orden activa del agente
    const existing = agentOrderMap.get(agentId) ?? [];
    existing.push(order);
    agentOrderMap.set(agentId, existing);

    // Incrementar contador de órdenes reales
    agentRealOrders.set(agentId, (agentRealOrders.get(agentId) ?? 0) + 1);

    console.log(`[Alpaca] ORDEN ENVIADA — ${side.toUpperCase()} ${symbol} $${notional} | agente: ${agentId.slice(0, 8)} | ${rationale}`);
    return order;
  } catch (err: any) {
    console.error(`[Alpaca] createOrder error: ${err.message}`);
    return null;
  }
}

/**
 * Cierra todas las posiciones abiertas de un agente (al morir, por ejemplo).
 */
export async function closeAllPositionsForAgent(agentId: string): Promise<void> {
  if (!alpacaClient) return;
  const orders = agentOrderMap.get(agentId) ?? [];
  // En la práctica, las posiciones reales están en la cuenta Alpaca —
  // aquí solo cancelamos las órdenes pendientes asociadas al agente.
  for (const order of orders) {
    if (order.status === "new" || order.status === "accepted" || order.status === "pending_new") {
      try {
        await alpacaClient.cancelOrder(order.orderId);
        console.log(`[Alpaca] Orden cancelada: ${order.orderId}`);
      } catch (_) {}
    }
  }
  agentOrderMap.delete(agentId);
}

/**
 * Obtiene todas las posiciones abiertas en la cuenta Alpaca.
 */
export async function getAllPositions(): Promise<AlpacaPosition[]> {
  if (!alpacaClient) return [];
  try {
    const positions = await alpacaClient.getPositions();
    return positions.map((p: any): AlpacaPosition => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      side: p.side,
      avgEntryPrice: parseFloat(p.avg_entry_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPl: parseFloat(p.unrealized_pl),
      unrealizedPlpc: parseFloat(p.unrealized_plpc),
    }));
  } catch (err: any) {
    console.error(`[Alpaca] getPositions error: ${err.message}`);
    return [];
  }
}

// ─── Stats para el CLI ─────────────────────────────────────────────────────────

export interface BrokerStats {
  connected: boolean;
  isPaper: boolean;
  error: string | null;
  totalOrdersSubmitted: number;
  symbols: string[];
  latestTicks: Record<string, { price: number; volume: number }>;
}

export function getBrokerStats(): BrokerStats {
  const ticks: Record<string, { price: number; volume: number }> = {};
  latestTicks.forEach((tick, sym) => {
    ticks[sym] = { price: tick.price, volume: tick.volume };
  });

  let total = 0;
  agentRealOrders.forEach(v => { total += v; });

  return {
    connected: brokerConnected,
    isPaper: isPaperMode(),
    error: brokerError,
    totalOrdersSubmitted: total,
    symbols: SUPPORTED_SYMBOLS,
    latestTicks: ticks,
  };
}

export function getLatestTick(symbol: string): BrokerTick | null {
  return latestTicks.get(symbol) ?? null;
}
