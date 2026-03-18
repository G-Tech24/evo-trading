/**
 * EVOLUTION ENGINE
 * ================
 * Multi-agent evolutionary trading system.
 * Agents reason from mathematics, physics, and chemistry principles.
 * They live in a graph, communicate via signals, and evolve through natural selection.
 */

import { storage } from "./storage.js";
import type { Agent } from "@shared/schema";

// ─── Scientific strategy labels ───────────────────────────────────────────────
export const STRATEGIES = [
  "brownian_motion",       // Math: Wiener process — random walk with drift
  "mean_reversion",        // Physics: Harmonic oscillator — tendency to equilibrium
  "wave_interference",     // Physics: Wave superposition — multiple period signals
  "entropy_decay",         // Thermodynamics: Systems move toward equilibrium
  "boltzmann_distribution",// Statistical Mechanics: Energy state probability
  "chaos_theory",          // Math: Sensitivity to initial conditions
  "harmonic_oscillator",   // Physics: Periodic motion around equilibrium
  "reaction_kinetics",     // Chemistry: Rate of change & equilibrium
  "diffusion_gradient",    // Chemistry/Physics: Flow from high to low concentration
  "orbital_mechanics",     // Physics: Elliptical cycles, gravitational pull
];

function rand(min = 0, max = 1): number {
  return Math.random() * (max - min) + min;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function generateId(): string {
  return `agent_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

function generateName(generation: number, index: number): string {
  const prefixes = ["Euler", "Gauss", "Fourier", "Laplace", "Newton", "Leibniz",
                    "Maxwell", "Boltzmann", "Heisenberg", "Planck", "Curie",
                    "Dirac", "Fermat", "Riemann", "Cauchy", "Bernoulli",
                    "Lorentz", "Faraday", "Avogadro", "Kepler"];
  const base = prefixes[index % prefixes.length];
  return `${base}-G${generation}`;
}

// ─── Spawn initial population ─────────────────────────────────────────────────
export function spawnInitialPopulation(count = 12) {
  for (let i = 0; i < count; i++) {
    const mathW = rand(0.1, 0.8);
    const physW = rand(0.1, 0.8 - mathW);
    const chemW = 1 - mathW - physW;
    const strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
    const id = generateId();

    storage.createAgent({
      id,
      name: generateName(1, i),
      generation: 1,
      status: "alive",
      parentIds: [],
      mathWeight: mathW,
      physicsWeight: physW,
      chemistryWeight: chemW,
      riskTolerance: rand(0.1, 0.9),
      lookbackPeriod: Math.floor(rand(5, 30)),
      entryThreshold: rand(0.005, 0.05),
      exitThreshold: rand(0.004, 0.04),
      positionSizing: rand(0.05, 0.25),
      momentumBias: rand(-1, 1),
      volatilityFilter: rand(0.2, 0.8),
      strategy,
      capital: 10000,
      initialCapital: 10000,
      neighbors: [],
    });

    storage.addEvent({
      type: "birth",
      agentId: id,
      message: `${generateName(1, i)} nació — Estrategia: ${strategy}`,
      data: { strategy, generation: 1 },
    });
  }

  // Build initial graph connections (small world topology)
  buildGraph();
}

// ─── Graph topology: Small-world connections ──────────────────────────────────
export function buildGraph() {
  const agents = storage.getAliveAgents();
  const ids = agents.map(a => a.id);

  agents.forEach((agent, i) => {
    // Each agent connects to 2-4 neighbors (ring + random long links)
    const neighbors: string[] = [];
    // Ring connections
    const left = ids[(i - 1 + ids.length) % ids.length];
    const right = ids[(i + 1) % ids.length];
    if (left !== agent.id) neighbors.push(left);
    if (right !== agent.id) neighbors.push(right);
    // Random long-range connection
    if (ids.length > 4) {
      const randomNeighbor = ids[Math.floor(rand(0, ids.length))];
      if (randomNeighbor !== agent.id && !neighbors.includes(randomNeighbor)) {
        neighbors.push(randomNeighbor);
      }
    }
    storage.updateAgent(agent.id, { neighbors });
  });
}

// ─── Market data & price simulation ──────────────────────────────────────────
let currentPrice = 65000 + rand(-5000, 5000);
let priceHistory: number[] = [];
let volumeHistory: number[] = [];

// Fetch real BTC price from public API, fall back to simulation
export async function fetchOrSimulatePrice(): Promise<{ price: number; volume: number; change24h: number }> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const price = parseFloat(data.lastPrice);
      const volume = parseFloat(data.quoteVolume) / 1e6;
      const change24h = parseFloat(data.priceChangePercent);
      currentPrice = price;
      return { price, volume, change24h };
    }
  } catch (_) {
    // Fall back to simulation
  }

  // Brownian motion simulation with fat tails
  const drift = 0.0001;
  const sigma = 0.002;
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  // Occasionally add fat tail shock
  const shock = Math.random() < 0.02 ? z * 3 : z;
  currentPrice = currentPrice * Math.exp(drift + sigma * shock);
  currentPrice = clamp(currentPrice, 20000, 150000);

  const volume = rand(0.5, 5);
  const change24h = rand(-8, 8);
  return { price: currentPrice, volume, change24h };
}

// ─── Agent decision logic (scientific reasoning) ──────────────────────────────
function computeSignal(agent: Agent, prices: number[]): number {
  if (prices.length < 5) return 0;

  const n = Math.min(agent.lookbackPeriod, prices.length);
  const window = prices.slice(-n);
  const current = prices[prices.length - 1];
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
  const std = Math.sqrt(variance);

  let signal = 0;

  switch (agent.strategy) {
    case "brownian_motion": {
      // Price return compared to expected Brownian drift
      const returns = window.slice(1).map((p, i) => (p - window[i]) / window[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      signal = avgReturn * 20;
      break;
    }
    case "mean_reversion": {
      // Harmonic oscillator: z-score from mean (spring force)
      const zScore = std > 0 ? (current - mean) / std : 0;
      signal = -zScore * 0.5; // Negative: mean-reverting
      break;
    }
    case "wave_interference": {
      // Superposition of short and long period waves
      const shortMean = prices.slice(-Math.max(3, Math.floor(n / 3))).reduce((a, b) => a + b, 0) / Math.max(3, Math.floor(n / 3));
      const longMean = mean;
      signal = (shortMean - longMean) / longMean;
      break;
    }
    case "entropy_decay": {
      // Measure order/disorder — low entropy = directional, high = random
      const returns = window.slice(1).map((p, i) => Math.sign(p - window[i]));
      const positiveCount = returns.filter(r => r > 0).length;
      const p = positiveCount / returns.length;
      const entropy = p > 0 && p < 1 ? -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)) : 0;
      const trend = (current - window[0]) / window[0];
      signal = (1 - entropy) * trend * 10; // Low entropy + trend = strong signal
      break;
    }
    case "boltzmann_distribution": {
      // Probability of being in high energy (price) state
      const T = std * agent.riskTolerance + 0.001;
      const energy = (current - mean) / mean;
      signal = -energy / T * 0.1; // Boltzmann factor: avoid high energy states
      break;
    }
    case "chaos_theory": {
      // Lyapunov-inspired: measure sensitivity
      const recent = prices.slice(-5);
      const divergence = recent[recent.length - 1] - recent[0];
      const maxDiv = Math.max(...recent) - Math.min(...recent);
      signal = maxDiv > 0 ? (divergence / maxDiv) * agent.momentumBias : 0;
      break;
    }
    case "harmonic_oscillator": {
      // RSI-like oscillator
      const gains = window.slice(1).map((p, i) => Math.max(0, p - window[i]));
      const losses = window.slice(1).map((p, i) => Math.max(0, window[i] - p));
      const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length || 0.001;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length || 0.001;
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      signal = (50 - rsi) / 50 * 0.5;
      break;
    }
    case "reaction_kinetics": {
      // Rate of price change (reaction rate) vs equilibrium
      const recentReturns = prices.slice(-3).map((p, i, arr) =>
        i > 0 ? (p - arr[i - 1]) / arr[i - 1] : 0
      ).slice(1);
      const rate = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
      const equilibrium = 0;
      signal = (equilibrium - rate) * 5; // drive toward equilibrium
      break;
    }
    case "diffusion_gradient": {
      // Flow from high concentration (price) zones toward low
      const gradient = current - mean;
      signal = -gradient / (Math.abs(gradient) + 1) * 0.3;
      break;
    }
    case "orbital_mechanics": {
      // Elliptical cycle detection
      const halfN = Math.floor(n / 2);
      if (halfN < 2) { signal = 0; break; }
      const firstHalf = prices.slice(-n, -halfN);
      const secondHalf = prices.slice(-halfN);
      const fMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const sMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      signal = (sMean - fMean) / fMean * 5;
      break;
    }
    default:
      signal = 0;
  }

  // Apply momentum bias and volatility filter
  signal += agent.momentumBias * 0.1;
  if (std / mean > agent.volatilityFilter * 0.1) {
    signal *= 0.5; // Reduce signal in high volatility
  }

  // Graph influence: absorb neighbors' signals
  const neighbors = agent.neighbors ?? [];
  let neighborInfluence = 0;
  neighbors.forEach(nid => {
    const neighbor = storage.getAgent(nid);
    if (neighbor && neighbor.status === "alive") {
      neighborInfluence += neighbor.fitnessScore * 0.02;
    }
  });
  signal += neighborInfluence;

  return clamp(signal, -1, 1);
}

// ─── Run one trading tick for all agents ─────────────────────────────────────
export async function runTick() {
  const { price, volume, change24h } = await fetchOrSimulatePrice();
  priceHistory.push(price);
  if (priceHistory.length > 200) priceHistory = priceHistory.slice(-200);
  volumeHistory.push(volume);
  if (volumeHistory.length > 200) volumeHistory = volumeHistory.slice(-200);

  storage.addMarketTick(price, volume, change24h);

  const agents = storage.getAliveAgents();

  for (const agent of agents) {
    const signal = computeSignal(agent, priceHistory);
    const agentTrades = storage.getTradesByAgent(agent.id);
    let { capital, openPosition, openPositionPrice } = agent;
    let pnl = agent.pnl;
    let totalTrades = agent.totalTrades;

    // Decision logic
    if (!openPosition && Math.abs(signal) > agent.entryThreshold) {
      // Enter position
      const direction = signal > 0 ? "long" : "short";
      const positionCapital = capital * agent.positionSizing;

      storage.updateAgent(agent.id, {
        openPosition: direction,
        openPositionPrice: price,
      });

      storage.addTrade({
        agentId: agent.id,
        type: direction === "long" ? "buy" : "sell",
        price,
        quantity: positionCapital / price,
        pnl: 0,
        rationale: agent.strategy,
      });

      storage.addEvent({
        type: "trade",
        agentId: agent.id,
        message: `${agent.name} abre ${direction.toUpperCase()} @ $${price.toFixed(0)}`,
        data: { direction, signal: signal.toFixed(3), strategy: agent.strategy },
      });

      openPosition = direction;
      openPositionPrice = price;
      totalTrades++;
    } else if (openPosition && openPositionPrice) {
      // Check exit
      const priceChange = (price - openPositionPrice) / openPositionPrice;
      const tradePnl = openPosition === "long" ? priceChange : -priceChange;

      const shouldExit = Math.abs(signal) < agent.exitThreshold ||
        (openPosition === "long" && signal < -agent.entryThreshold) ||
        (openPosition === "short" && signal > agent.entryThreshold) ||
        tradePnl < -0.05; // Stop loss at 5%

      if (shouldExit) {
        const positionCapital = capital * agent.positionSizing;
        const tradePnlAmount = positionCapital * tradePnl;

        capital += tradePnlAmount;
        pnl += tradePnlAmount;
        totalTrades++;

        storage.addTrade({
          agentId: agent.id,
          type: openPosition === "long" ? "sell" : "buy",
          price,
          quantity: positionCapital / openPositionPrice,
          pnl: tradePnlAmount,
          rationale: agent.strategy,
        });

        storage.addEvent({
          type: "trade",
          agentId: agent.id,
          message: `${agent.name} cierra ${openPosition.toUpperCase()} @ $${price.toFixed(0)} | PnL: ${tradePnlAmount >= 0 ? "+" : ""}$${tradePnlAmount.toFixed(2)}`,
          data: { tradePnl: tradePnlAmount, strategy: agent.strategy },
        });

        openPosition = null;
        openPositionPrice = null;
      }
    }

    // Calculate stats
    const allTrades = storage.getTradesByAgent(agent.id);
    const closedTrades = allTrades.filter(t => t.pnl !== 0);
    const wins = closedTrades.filter(t => t.pnl > 0).length;
    const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

    const pnlPercent = ((capital - agent.initialCapital) / agent.initialCapital) * 100;
    const maxDrawdown = Math.min(0, pnlPercent) / 100;

    // Fitness = Sharpe proxy: return / risk
    const returns = closedTrades.map(t => t.pnl / (capital * agent.positionSizing));
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const returnStd = returns.length > 1
      ? Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length)
      : 0.001;
    const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(252) : 0;

    // Fitness score: blend of Sharpe + win rate + pnl
    const fitnessScore = (sharpeRatio * 0.5 + winRate * 0.3 + clamp(pnlPercent / 50, -1, 2) * 0.2);

    storage.updateAgent(agent.id, {
      capital,
      pnl,
      pnlPercent,
      maxDrawdown,
      winRate,
      totalTrades,
      openPosition: openPosition ?? null,
      openPositionPrice: openPositionPrice ?? null,
      sharpeRatio: clamp(sharpeRatio, -5, 5),
      fitnessScore,
    });

    // Death check: max drawdown > 40% or capital < 6000
    if (capital < 6000 || pnlPercent < -40) {
      killAgent(agent.id, capital < 6000 ? "Ruina de capital" : "Drawdown fatal (>40%)");
    }
  }

  // Check if natural selection cycle should run (every 30 ticks)
  const tickCount = storage.getRecentTicks(1000).length;
  if (tickCount > 0 && tickCount % 30 === 0) {
    runSelectionCycle();
  }
}

// ─── Kill an agent ─────────────────────────────────────────────────────────────
function killAgent(agentId: string, reason: string) {
  const agent = storage.getAgent(agentId);
  if (!agent) return;
  storage.updateAgent(agentId, {
    status: "dead",
    deathReason: reason,
    diedAt: new Date(),
    openPosition: null,
    openPositionPrice: null,
  });
  storage.addEvent({
    type: "death",
    agentId,
    message: `☠ ${agent.name} eliminado — ${reason} | PnL: ${agent.pnlPercent.toFixed(1)}%`,
    data: { reason, pnl: agent.pnl, fitness: agent.fitnessScore },
  });
  // Rebuild graph after death
  buildGraph();
}

// ─── Natural selection cycle ───────────────────────────────────────────────────
function runSelectionCycle() {
  const alive = storage.getAliveAgents();
  if (alive.length < 3) return;

  const sorted = [...alive].sort((a, b) => b.fitnessScore - a.fitnessScore);
  const currentGen = storage.getCurrentGeneration();
  const newGen = currentGen + 1;

  // Top 25% reproduce
  const reproducers = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25)));
  // Bottom 25% get eliminated (if they're losing)
  const losers = sorted.slice(-Math.max(1, Math.floor(sorted.length * 0.25)))
    .filter(a => a.fitnessScore < 0 || a.pnlPercent < -15);

  // Eliminate losers
  losers.forEach(agent => {
    killAgent(agent.id, "Eliminado por selecci\u00f3n natural");
  });

  // Reproduce: crossover between pairs of top agents
  const numOffspring = Math.min(reproducers.length, 4);
  for (let i = 0; i < numOffspring; i++) {
    const parent1 = reproducers[i % reproducers.length];
    const parent2 = reproducers[(i + 1) % reproducers.length];
    if (parent1.id !== parent2.id) {
      spawnOffspring(parent1, parent2, newGen, i);
    }
  }

  // Log generation
  const aliveAfter = storage.getAliveAgents();
  const bestAgent = aliveAfter.sort((a, b) => b.fitnessScore - a.fitnessScore)[0];

  storage.addGeneration({
    generation: newGen,
    agentsBorn: numOffspring,
    agentsDied: losers.length,
    agentsAlive: aliveAfter.length,
    bestFitness: bestAgent?.fitnessScore ?? 0,
    avgFitness: aliveAfter.reduce((s, a) => s + a.fitnessScore, 0) / (aliveAfter.length || 1),
    bestAgentId: bestAgent?.id,
    dominantStrategy: getMostCommonStrategy(aliveAfter),
  });

  storage.addEvent({
    type: "generation",
    message: `⚡ Generación ${newGen}: ${numOffspring} nacimientos, ${losers.length} muertes, ${aliveAfter.length} vivos`,
    data: { generation: newGen, bestFitness: bestAgent?.fitnessScore?.toFixed(3) },
  });

  buildGraph();
}

// ─── Spawn offspring via crossover ───────────────────────────────────────────
function spawnOffspring(parent1: Agent, parent2: Agent, generation: number, index: number) {
  const mutation = 0.1;
  const mutate = (val: number, min: number, max: number) =>
    clamp(val + rand(-mutation, mutation), min, max);
  const crossover = (a: number, b: number) => Math.random() < 0.5 ? a : b;

  // Determine strategy: inherit from fitter parent or occasionally mutate to new
  let strategy = parent1.fitnessScore >= parent2.fitnessScore ? parent1.strategy : parent2.strategy;
  if (Math.random() < 0.15) {
    strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
  }

  const mathW = mutate(crossover(parent1.mathWeight, parent2.mathWeight), 0.05, 0.9);
  const physW = mutate(crossover(parent1.physicsWeight, parent2.physicsWeight), 0.05, 0.9 - mathW);
  const chemW = 1 - mathW - physW;

  const id = generateId();
  const name = generateName(generation, index + Math.floor(Math.random() * 10));

  storage.createAgent({
    id,
    name,
    generation,
    status: "alive",
    parentIds: [parent1.id, parent2.id],
    mathWeight: mathW,
    physicsWeight: physW,
    chemistryWeight: clamp(chemW, 0.05, 0.9),
    riskTolerance: mutate(crossover(parent1.riskTolerance, parent2.riskTolerance), 0.05, 0.95),
    lookbackPeriod: Math.floor(mutate(crossover(parent1.lookbackPeriod, parent2.lookbackPeriod), 3, 40)),
    entryThreshold: mutate(crossover(parent1.entryThreshold, parent2.entryThreshold), 0.002, 0.1),
    exitThreshold: mutate(crossover(parent1.exitThreshold, parent2.exitThreshold), 0.001, 0.08),
    positionSizing: mutate(crossover(parent1.positionSizing, parent2.positionSizing), 0.03, 0.3),
    momentumBias: mutate(crossover(parent1.momentumBias, parent2.momentumBias), -1, 1),
    volatilityFilter: mutate(crossover(parent1.volatilityFilter, parent2.volatilityFilter), 0.1, 0.9),
    strategy,
    capital: 10000,
    initialCapital: 10000,
    neighbors: [],
  });

  storage.addEvent({
    type: "birth",
    agentId: id,
    message: `🧬 ${name} nació de ${parent1.name} × ${parent2.name} — Estrategia: ${strategy}`,
    data: { strategy, generation, parents: [parent1.name, parent2.name] },
  });
}

function getMostCommonStrategy(agents: Agent[]): string {
  const count: Record<string, number> = {};
  agents.forEach(a => { count[a.strategy] = (count[a.strategy] || 0) + 1; });
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
}

// ─── Start simulation loop ─────────────────────────────────────────────────────
let tickInterval: NodeJS.Timeout | null = null;

export function startSimulation() {
  if (tickInterval) return;
  // Spawn first generation
  spawnInitialPopulation(12);

  tickInterval = setInterval(async () => {
    try {
      await runTick();
    } catch (err) {
      console.error("Tick error:", err);
    }
    // If too few agents alive, spawn a new wave
    const alive = storage.getAliveAgents();
    if (alive.length < 4) {
      const gen = storage.getCurrentGeneration() + 1;
      for (let i = 0; i < 6; i++) {
        const strategy = STRATEGIES[Math.floor(rand(0, STRATEGIES.length))];
        const id = generateId();
        storage.createAgent({
          id, name: generateName(gen, i + 20), generation: gen, status: "alive",
          parentIds: [], strategy,
          mathWeight: rand(0.1, 0.8), physicsWeight: rand(0.1, 0.5), chemistryWeight: rand(0.1, 0.5),
          riskTolerance: rand(0.1, 0.9), lookbackPeriod: Math.floor(rand(5, 30)),
          entryThreshold: rand(0.005, 0.05), exitThreshold: rand(0.004, 0.04),
          positionSizing: rand(0.05, 0.25), momentumBias: rand(-1, 1), volatilityFilter: rand(0.2, 0.8),
          capital: 10000, initialCapital: 10000, neighbors: [],
        });
      }
      buildGraph();
    }
  }, 2000); // Tick every 2 seconds
}

export function stopSimulation() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function isRunning(): boolean {
  return tickInterval !== null;
}

export function resetSimulation() {
  stopSimulation();
  // Clear all data by reinitializing — rely on fresh restart
}
