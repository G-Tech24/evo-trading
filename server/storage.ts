import type {
  Agent, Trade, Generation, MarketTick, Event,
  InsertAgent, InsertTrade, InsertGeneration, InsertEvent
} from "@shared/schema";

export interface IStorage {
  // Agents
  getAllAgents(): Agent[];
  getAliveAgents(): Agent[];
  getDeadAgents(): Agent[];
  getAgent(id: string): Agent | undefined;
  createAgent(data: InsertAgent): Agent;
  updateAgent(id: string, data: Partial<Agent>): Agent | undefined;
  deleteAgent(id: string): void;

  // Trades
  getTradesByAgent(agentId: string): Trade[];
  getRecentTrades(limit: number): Trade[];
  addTrade(data: InsertTrade): Trade;

  // Generations
  getGenerations(): Generation[];
  addGeneration(data: InsertGeneration): Generation;
  getCurrentGeneration(): number;

  // Market ticks
  getRecentTicks(limit: number): MarketTick[];
  addMarketTick(price: number, volume: number, change24h: number): MarketTick;

  // Events
  getRecentEvents(limit: number): Event[];
  addEvent(data: InsertEvent): Event;

  // Stats
  getSystemStats(): SystemStats;
}

export interface SystemStats {
  totalAgents: number;
  aliveAgents: number;
  deadAgents: number;
  currentGeneration: number;
  totalTrades: number;
  bestFitness: number;
  avgFitness: number;
  dominantStrategy: string;
  totalPnl: number;
}

class MemStorage implements IStorage {
  private agents: Map<string, Agent> = new Map();
  private trades: Trade[] = [];
  private generations: Generation[] = [];
  private ticks: MarketTick[] = [];
  private events: Event[] = [];
  private tradeIdCounter = 1;
  private genIdCounter = 1;
  private tickIdCounter = 1;
  private eventIdCounter = 1;

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAliveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === "alive" || a.status === "reproducing");
  }

  getDeadAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === "dead");
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  createAgent(data: InsertAgent): Agent {
    const now = new Date();
    const agent: Agent = {
      ...data,
      id: data.id,
      name: data.name,
      generation: data.generation ?? 1,
      status: data.status ?? "alive",
      parentIds: data.parentIds ?? [],
      mathWeight: data.mathWeight ?? 0.33,
      physicsWeight: data.physicsWeight ?? 0.33,
      chemistryWeight: data.chemistryWeight ?? 0.34,
      riskTolerance: data.riskTolerance ?? 0.5,
      lookbackPeriod: data.lookbackPeriod ?? 14,
      entryThreshold: data.entryThreshold ?? 0.02,
      exitThreshold: data.exitThreshold ?? 0.015,
      positionSizing: data.positionSizing ?? 0.1,
      momentumBias: data.momentumBias ?? 0.0,
      volatilityFilter: data.volatilityFilter ?? 0.5,
      capital: data.capital ?? 10000,
      initialCapital: data.initialCapital ?? 10000,
      pnl: 0, pnlPercent: 0, sharpeRatio: 0, maxDrawdown: 0,
      winRate: 0, totalTrades: 0,
      openPosition: null, openPositionPrice: null,
      neighbors: data.neighbors ?? [],
      signalInfluenceReceived: 0,
      fitnessScore: 0,
      strategy: data.strategy ?? "brownian_motion",
      deathReason: null, diedAt: null,
      createdAt: now, updatedAt: now,
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  updateAgent(id: string, data: Partial<Agent>): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...data, updatedAt: new Date() };
    this.agents.set(id, updated);
    return updated;
  }

  deleteAgent(id: string): void {
    this.agents.delete(id);
  }

  getTradesByAgent(agentId: string): Trade[] {
    return this.trades.filter(t => t.agentId === agentId);
  }

  getRecentTrades(limit: number): Trade[] {
    return this.trades.slice(-limit).reverse();
  }

  addTrade(data: InsertTrade): Trade {
    const trade = { ...data, pnl: data.pnl ?? 0, rationale: data.rationale ?? null, id: this.tradeIdCounter++, timestamp: new Date() } as Trade;
    this.trades.push(trade);
    return trade;
  }

  getGenerations(): Generation[] {
    return [...this.generations];
  }

  addGeneration(data: InsertGeneration): Generation {
    const gen = {
      agentsBorn: 0, agentsDied: 0, agentsAlive: 0,
      bestFitness: 0, avgFitness: 0, bestAgentId: null, dominantStrategy: null,
      ...data, id: this.genIdCounter++, timestamp: new Date()
    } as Generation;
    this.generations.push(gen);
    return gen;
  }

  getCurrentGeneration(): number {
    const alive = this.getAliveAgents();
    if (alive.length === 0) return 1;
    return Math.max(...alive.map(a => a.generation));
  }

  getRecentTicks(limit: number): MarketTick[] {
    return this.ticks.slice(-limit);
  }

  addMarketTick(price: number, volume: number, change24h: number): MarketTick {
    const tick: MarketTick = {
      id: this.tickIdCounter++,
      symbol: "BTC/USDT",
      price, volume, change24h,
      timestamp: new Date(),
    };
    this.ticks.push(tick);
    if (this.ticks.length > 500) this.ticks = this.ticks.slice(-500);
    return tick;
  }

  getRecentEvents(limit: number): Event[] {
    return this.events.slice(-limit).reverse();
  }

  addEvent(data: InsertEvent): Event {
    const event: Event = {
      ...data,
      id: this.eventIdCounter++,
      data: data.data ?? null,
      agentId: data.agentId ?? null,
      timestamp: new Date(),
    };
    this.events.push(event);
    if (this.events.length > 1000) this.events = this.events.slice(-1000);
    return event;
  }

  getSystemStats(): SystemStats {
    const alive = this.getAliveAgents();
    const allAgents = this.getAllAgents();
    const fitnesses = alive.map(a => a.fitnessScore);
    const strategies = alive.map(a => a.strategy);
    const stratCount: Record<string, number> = {};
    strategies.forEach(s => { stratCount[s] = (stratCount[s] || 0) + 1; });
    const dominantStrategy = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

    return {
      totalAgents: allAgents.length,
      aliveAgents: alive.length,
      deadAgents: this.getDeadAgents().length,
      currentGeneration: this.getCurrentGeneration(),
      totalTrades: this.trades.length,
      bestFitness: fitnesses.length ? Math.max(...fitnesses) : 0,
      avgFitness: fitnesses.length ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length : 0,
      dominantStrategy,
      totalPnl: alive.reduce((sum, a) => sum + a.pnl, 0),
    };
  }
}

export const storage = new MemStorage();

/**
 * Restaura el storage desde datos de checkpoint.
 * Inyecta directamente sin pasar por los constructores tipados.
 */
export function restoreStorageFromCheckpoint(data: {
  agents?: any[];
  recentTrades?: any[];
  generations?: any[];
  recentEvents?: any[];
}): void {
  const mem = storage as any;

  if (data.agents?.length) {
    mem.agents = new Map<string, any>();
    for (const a of data.agents) {
      const agent = {
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
        diedAt: a.diedAt ? new Date(a.diedAt) : null,
      };
      mem.agents.set(agent.id, agent);
    }
  }

  if (data.recentTrades?.length) {
    mem.trades = data.recentTrades.map((t: any) => ({
      ...t,
      pnl: t.pnl ?? 0,
      rationale: t.rationale ?? null,
      timestamp: new Date(t.timestamp),
    }));
    mem.tradeIdCounter = mem.trades.length + 1;
  }

  if (data.generations?.length) {
    mem.generations = data.generations.map((g: any) => ({
      agentsBorn: 0, agentsDied: 0, agentsAlive: 0,
      bestFitness: 0, avgFitness: 0, bestAgentId: null, dominantStrategy: null,
      ...g,
      timestamp: new Date(g.timestamp),
    }));
    mem.genIdCounter = mem.generations.length + 1;
  }

  if (data.recentEvents?.length) {
    mem.events = data.recentEvents.map((e: any) => ({
      ...e,
      data: e.data ?? null,
      agentId: e.agentId ?? null,
      timestamp: new Date(e.timestamp),
    }));
    mem.eventIdCounter = mem.events.length + 1;
  }

  const alive = (storage as any).agents
    ? [...(storage as any).agents.values()].filter((a: any) => a.status === "alive").length
    : 0;
  console.log(`[Storage] Restaurado: ${data.agents?.length ?? 0} agentes (${alive} vivos), ${data.recentTrades?.length ?? 0} trades`);
}
