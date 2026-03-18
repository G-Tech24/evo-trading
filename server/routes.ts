import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { startSimulation, stopSimulation, isRunning, spawnInitialPopulation, buildGraph } from "./evolutionEngine.js";
import { ALL_CONCEPTS, CONCEPT_INDEX, CURRICULUM_STATS, selectRelevantConcepts } from "./knowledgeBase.js";
import { ALL_PROBLEMS, PROBLEM_BANK_STATS, selectProblemsForAgent, computeWisdomVector } from "./problemBank.js";

// WebSocket clients set
const wsClients = new Set<WebSocket>();

// Broadcast to all connected clients
function broadcast(data: object) {
  const msg = JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Broadcast live data every 1.5 seconds
let broadcastInterval: NodeJS.Timeout | null = null;

function startBroadcast() {
  if (broadcastInterval) return;
  broadcastInterval = setInterval(() => {
    if (wsClients.size === 0) return;
    const agents = storage.getAliveAgents();
    const ticks = storage.getRecentTicks(100);
    const events = storage.getRecentEvents(20);
    const stats = storage.getSystemStats();
    broadcast({ type: "update", agents, ticks, events, stats });
  }, 1500);
}

export function registerRoutes(httpServer: Server, app: Express) {
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    ws.on("close", () => wsClients.delete(ws));

    // Send initial state immediately
    const agents = storage.getAllAgents();
    const ticks = storage.getRecentTicks(100);
    const events = storage.getRecentEvents(50);
    const stats = storage.getSystemStats();
    const generations = storage.getGenerations();
    ws.send(JSON.stringify({ type: "init", agents, ticks, events, stats, generations }));
  });
  startBroadcast();

  // ── REST API ──────────────────────────────────────────────────────────────

  // GET all agents
  app.get("/api/agents", (_req, res) => {
    res.json(storage.getAllAgents());
  });

  // GET alive agents
  app.get("/api/agents/alive", (_req, res) => {
    res.json(storage.getAliveAgents());
  });

  // GET dead agents
  app.get("/api/agents/dead", (_req, res) => {
    res.json(storage.getDeadAgents());
  });

  // GET specific agent
  app.get("/api/agents/:id", (req, res) => {
    const agent = storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  // GET trades for agent
  app.get("/api/agents/:id/trades", (req, res) => {
    res.json(storage.getTradesByAgent(req.params.id));
  });

  // GET recent trades
  app.get("/api/trades", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(storage.getRecentTrades(limit));
  });

  // GET generations
  app.get("/api/generations", (_req, res) => {
    res.json(storage.getGenerations());
  });

  // GET market ticks
  app.get("/api/ticks", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(storage.getRecentTicks(limit));
  });

  // GET events
  app.get("/api/events", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(storage.getRecentEvents(limit));
  });

  // GET system stats
  app.get("/api/stats", (_req, res) => {
    res.json(storage.getSystemStats());
  });

  // POST start simulation
  app.post("/api/simulation/start", (_req, res) => {
    if (!isRunning()) {
      startSimulation();
    }
    res.json({ running: true });
  });

  // POST stop simulation
  app.post("/api/simulation/stop", (_req, res) => {
    stopSimulation();
    res.json({ running: false });
  });

  // GET simulation status
  app.get("/api/simulation/status", (_req, res) => {
    res.json({ running: isRunning() });
  });

  // POST kill specific agent manually
  app.post("/api/agents/:id/kill", (req, res) => {
    const agent = storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    storage.updateAgent(req.params.id, {
      status: "dead",
      deathReason: "Eliminado manualmente",
      diedAt: new Date(),
    });
    broadcast({ type: "agentKilled", agentId: req.params.id });
    res.json({ success: true });
  });

  // ── CURRICULUM & KNOWLEDGE API ──────────────────────────────────────────

  // GET full curriculum overview
  app.get("/api/curriculum", (_req, res) => {
    res.json({
      stats: CURRICULUM_STATS,
      levels: [1, 2, 3, 4, 5, 6, 7].map(lvl => ({
        level: lvl,
        label: ["Guardiería", "Secundaria", "Bachillerato", "Universidad I-II",
                "Universidad III-IV", "Maestría", "Doctorado"][lvl - 1],
        concepts: ALL_CONCEPTS
          .filter(c => c.level === lvl)
          .map(c => ({ id: c.id, name: c.name, domain: c.domain,
                        formula: c.formula, insight: c.insight,
                        tradingAnalogy: c.tradingAnalogy }))
      }))
    });
  });

  // GET concepts for a specific domain and/or level
  app.get("/api/curriculum/concepts", (req, res) => {
    const domain = req.query.domain as string | undefined;
    const level  = req.query.level  ? parseInt(req.query.level as string) : undefined;
    let concepts = ALL_CONCEPTS;
    if (domain) concepts = concepts.filter(c => c.domain === domain);
    if (level)  concepts = concepts.filter(c => c.level  === level);
    res.json(concepts);
  });

  // GET a single concept by id
  app.get("/api/curriculum/concepts/:id", (req, res) => {
    const concept = CONCEPT_INDEX[req.params.id];
    if (!concept) return res.status(404).json({ error: "Concept not found" });
    res.json(concept);
  });

  // GET relevant concepts for a specific agent (based on genome weights)
  app.get("/api/curriculum/agent/:id", (req, res) => {
    const agent = storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    // Use fitness to determine curriculum depth (0-1 maps to L1-L7)
    const fitness  = (agent as any).fitnessScore ?? 0;
    const winRate  = (agent as any).winRate       ?? 0.5;
    const relevant = selectRelevantConcepts(fitness, winRate, 12);
    const wisdom   = computeWisdomVector(
      selectProblemsForAgent(fitness, winRate, 20).map(p => p.id)
    );
    const topLevel = Math.min(7, Math.max(1, Math.ceil(fitness * 7 + 1)));
    res.json({
      agentId: req.params.id,
      curriculumLevel: topLevel,
      levelLabel: ["Guardiería", "Secundaria", "Bachillerato", "Universidad I-II",
                   "Universidad III-IV", "Maestría", "Doctorado"][topLevel - 1],
      wisdomVector: { math: wisdom[0], physics: wisdom[1], chemistry: wisdom[2] },
      relevantConcepts: relevant
    });
  });

  // GET problem bank overview
  app.get("/api/problems", (_req, res) => {
    res.json({
      stats: PROBLEM_BANK_STATS,
      problems: ALL_PROBLEMS.map(p => ({
        id: p.id, title: p.title, domain: p.domain, level: p.level,
        difficulty: p.difficulty, statement: p.statement,
        tradingSignal: p.tradingSignal, signalStrength: p.signalStrength
      }))
    });
  });

  // GET problems for a specific agent
  app.get("/api/problems/agent/:id", (req, res) => {
    const agent = storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const fitness = (agent as any).fitnessScore ?? 0;
    const winRate = (agent as any).winRate       ?? 0.5;
    const problems = selectProblemsForAgent(fitness, winRate, 15);
    res.json({ agentId: req.params.id, count: problems.length, problems });
  });

  // GET wisdom vector for an agent
  app.get("/api/problems/wisdom/:id", (req, res) => {
    const agent = storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const fitness  = (agent as any).fitnessScore ?? 0;
    const winRate  = (agent as any).winRate       ?? 0.5;
    const problems = selectProblemsForAgent(fitness, winRate, 30);
    const wisdom   = computeWisdomVector(problems.map(p => p.id));
    res.json({
      agentId: req.params.id,
      wisdom: { math: wisdom[0], physics: wisdom[1], chemistry: wisdom[2] },
      dominantDomain: wisdom[0] > wisdom[1] && wisdom[0] > wisdom[2] ? "math"
                    : wisdom[1] > wisdom[2] ? "physics" : "chemistry"
    });
  });

  // Auto-start simulation on boot
  startSimulation();
}
