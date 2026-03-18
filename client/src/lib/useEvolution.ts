import { useState, useEffect, useRef, useCallback } from "react";
import type { Agent, MarketTick, Event, Generation } from "@shared/schema";

interface SystemStats {
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

interface EvolutionState {
  agents: Agent[];
  ticks: MarketTick[];
  events: Event[];
  stats: SystemStats;
  generations: Generation[];
  connected: boolean;
}

const defaultStats: SystemStats = {
  totalAgents: 0, aliveAgents: 0, deadAgents: 0,
  currentGeneration: 1, totalTrades: 0,
  bestFitness: 0, avgFitness: 0, dominantStrategy: "—", totalPnl: 0,
};

export function useEvolution() {
  const [state, setState] = useState<EvolutionState>({
    agents: [], ticks: [], events: [], stats: defaultStats,
    generations: [], connected: false,
  });
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setState(s => ({ ...s, connected: true }));
    ws.onclose = () => {
      setState(s => ({ ...s, connected: false }));
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "init") {
          setState(s => ({
            ...s,
            agents: msg.agents ?? [],
            ticks: msg.ticks ?? [],
            events: msg.events ?? [],
            stats: msg.stats ?? defaultStats,
            generations: msg.generations ?? [],
          }));
        } else if (msg.type === "update") {
          setState(s => ({
            ...s,
            agents: msg.agents ?? s.agents,
            ticks: msg.ticks ?? s.ticks,
            events: msg.events ?? s.events,
            stats: msg.stats ?? s.stats,
          }));
        }
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return state;
}
