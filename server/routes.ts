import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { startSimulation, stopSimulation, isRunning, spawnInitialPopulation, buildGraph } from "./evolutionEngine.js";

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

  // Auto-start simulation on boot
  startSimulation();
}
