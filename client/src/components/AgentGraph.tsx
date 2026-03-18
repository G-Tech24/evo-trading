import { useRef, useEffect, useMemo } from "react";
import type { Agent } from "@shared/schema";

interface AgentGraphProps {
  agents: Agent[];
}

const STRATEGY_COLORS: Record<string, string> = {
  brownian_motion: "#60a5fa",
  mean_reversion: "#a78bfa",
  wave_interference: "#a78bfa",
  entropy_decay: "#f59e0b",
  boltzmann_distribution: "#a78bfa",
  chaos_theory: "#60a5fa",
  harmonic_oscillator: "#a78bfa",
  reaction_kinetics: "#fbbf24",
  diffusion_gradient: "#fbbf24",
  orbital_mechanics: "#a78bfa",
};

// Domain color from weights (RGB blend)
function domainColor(agent: Agent): string {
  const r = Math.floor(agent.mathWeight * 96 + 40);
  const g = Math.floor(agent.physicsWeight * 80 + 40);
  const b = Math.floor(agent.chemistryWeight * 180 + 80);
  return `rgb(${r},${g},${b})`;
}

interface NodePos { x: number; y: number; vx: number; vy: number; }

export function AgentGraph({ agents }: AgentGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<Map<string, NodePos>>(new Map());
  const animRef = useRef<number>(0);

  // Initialize positions for new agents
  useMemo(() => {
    const canvas = canvasRef.current;
    const W = canvas?.width ?? 600;
    const H = canvas?.height ?? 300;
    agents.forEach(agent => {
      if (!posRef.current.has(agent.id)) {
        const angle = Math.random() * Math.PI * 2;
        const r = 80 + Math.random() * (Math.min(W, H) / 2 - 100);
        posRef.current.set(agent.id, {
          x: W / 2 + Math.cos(angle) * r,
          y: H / 2 + Math.sin(angle) * r,
          vx: 0, vy: 0,
        });
      }
    });
    const aliveIds = new Set(agents.map(a => a.id));
    Array.from(posRef.current.keys()).forEach(id => {
      if (!aliveIds.has(id)) posRef.current.delete(id);
    });
  }, [agents.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "hsl(220, 13%, 7%)";
      ctx.fillRect(0, 0, W, H);

      const positions = posRef.current;
      const agentMap = new Map(agents.map(a => [a.id, a]));

      // Force-directed layout
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;

        // Center gravity (weighted by fitness — winners drift toward center)
        const pull = 0.001 + Math.max(0, agent.fitnessScore) * 0.0005;
        pos.vx += (W / 2 - pos.x) * pull;
        pos.vy += (H / 2 - pos.y) * pull;

        // Repulsion from other nodes
        agents.forEach(other => {
          if (other.id === agent.id) return;
          const opos = positions.get(other.id);
          if (!opos) return;
          const dx2 = pos.x - opos.x;
          const dy2 = pos.y - opos.y;
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.1;
          const force = Math.min(2000 / (dist * dist), 2);
          pos.vx += (dx2 / dist) * force;
          pos.vy += (dy2 / dist) * force;
        });

        // Attraction to neighbors (spring force)
        (agent.neighbors ?? []).forEach(nid => {
          const npos = positions.get(nid);
          if (!npos) return;
          const dx2 = npos.x - pos.x;
          const dy2 = npos.y - pos.y;
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.1;
          const target = 100;
          const force = (dist - target) * 0.003;
          pos.vx += (dx2 / dist) * force;
          pos.vy += (dy2 / dist) * force;
        });

        pos.vx *= 0.85;
        pos.vy *= 0.85;
        pos.x += pos.vx;
        pos.y += pos.vy;
        pos.x = Math.max(24, Math.min(W - 24, pos.x));
        pos.y = Math.max(24, Math.min(H - 24, pos.y));
      });

      // ── Draw GAT attention-weighted edges ────────────────────────────────
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;

        const numNeighbors = (agent.neighbors ?? []).length;

        (agent.neighbors ?? []).forEach((nid, idx) => {
          const npos = positions.get(nid);
          if (!npos) return;

          const neighbor = agentMap.get(nid);

          // GAT attention weight proxy: neighbors with better fitness get thicker edges
          const fitnessDiff = neighbor ? Math.max(0, neighbor.fitnessScore - agent.fitnessScore) : 0;
          const uniformAlpha = numNeighbors > 0 ? 1.0 / numNeighbors : 0.5;
          const attentionWeight = Math.min(1, uniformAlpha + fitnessDiff * 0.3);

          // Edge thickness encodes attention weight
          const lineWidth = 0.5 + attentionWeight * 2.5;
          const alpha = 0.1 + attentionWeight * 0.35;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(npos.x, npos.y);

          // Color encodes direction: neighbor fitness relative to self
          const r = neighbor && neighbor.fitnessScore > agent.fitnessScore ? 74 : 100;
          const g = neighbor && neighbor.fitnessScore > agent.fitnessScore ? 180 : 120;
          const b = 220;
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = lineWidth;
          ctx.stroke();

          // Arrow indicator showing message direction (toward better-performing agent)
          if (neighbor && neighbor.fitnessScore > agent.fitnessScore + 0.1) {
            const t = 0.65;
            const ax = pos.x + (npos.x - pos.x) * t;
            const ay = pos.y + (npos.y - pos.y) * t;
            const angle = Math.atan2(npos.y - pos.y, npos.x - pos.x);
            const arrowSize = 3 + attentionWeight * 2;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
              ax - arrowSize * Math.cos(angle - 0.4),
              ay - arrowSize * Math.sin(angle - 0.4)
            );
            ctx.lineTo(
              ax - arrowSize * Math.cos(angle + 0.4),
              ay - arrowSize * Math.sin(angle + 0.4)
            );
            ctx.closePath();
            ctx.fillStyle = `rgba(74,200,128,${alpha * 1.5})`;
            ctx.fill();
          }
        });
      });

      // ── Signal pulses along edges (CfC firing pattern) ───────────────────
      agents.filter(a => a.openPosition).forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;
        (agent.neighbors ?? []).forEach(nid => {
          const npos = positions.get(nid);
          if (!npos) return;
          // Multiple pulses simulating CfC continuous-time dynamics
          [0, 0.33, 0.66].forEach((offset, pi) => {
            const t = ((Date.now() / (800 + pi * 120)) % 1 + offset) % 1;
            const px = pos.x + (npos.x - pos.x) * t;
            const py = pos.y + (npos.y - pos.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 + pi * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = agent.pnlPercent >= 0
              ? `rgba(74,222,128,${0.9 - pi * 0.25})`
              : `rgba(248,113,113,${0.9 - pi * 0.25})`;
            ctx.fill();
          });
        });
      });

      // ── Draw nodes ────────────────────────────────────────────────────────
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;
        const nodeColor = domainColor(agent);
        const isProfiting = agent.pnlPercent >= 0;
        const fitness = Math.abs(agent.fitnessScore);
        const radius = 8 + Math.min(fitness * 3, 10);

        // Outer glow (CfC "activation" halo — bigger = more active nervous system)
        const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 3);
        grd.addColorStop(0, isProfiting ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.12)");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Domain-colored node fill
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor.replace("rgb", "rgba").replace(")", ",0.25)");
        ctx.fill();

        // Border: green/red based on profit
        ctx.strokeStyle = isProfiting ? "#4ade80" : "#f87171";
        ctx.lineWidth = 1.5 + Math.min(fitness * 0.5, 1);
        ctx.stroke();

        // CfC "hidden state" ring (inner pulsing ring)
        const pulsePhase = (Date.now() / 1200) % (Math.PI * 2);
        const pulseR = radius * 0.45 + Math.sin(pulsePhase + agent.mathWeight * 3) * 1.2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = STRATEGY_COLORS[agent.strategy] + "90";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner dot for open position
        if (agent.openPosition) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = agent.openPosition === "long" ? "#4ade80" : "#f87171";
          ctx.fill();
        }

        // Name label
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = "rgba(200,210,220,0.85)";
        ctx.textAlign = "center";
        ctx.fillText(agent.name.split("-")[0], pos.x, pos.y + radius + 11);

        // PnL label
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.fillStyle = isProfiting ? "#4ade80" : "#f87171";
        ctx.fillText(`${isProfiting ? "+" : ""}${agent.pnlPercent.toFixed(1)}%`, pos.x, pos.y + radius + 20);

        // Generation badge (tiny)
        if (agent.generation > 1) {
          ctx.font = "7px JetBrains Mono, monospace";
          ctx.fillStyle = "rgba(148,163,184,0.7)";
          ctx.fillText(`G${agent.generation}`, pos.x, pos.y - radius - 4);
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [agents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });
    ro.observe(canvas.parentElement!);
    const parent = canvas.parentElement;
    if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full h-full relative terminal-border overflow-hidden">
      <div className="absolute top-2 left-3 text-[10px] text-muted-foreground font-mono uppercase tracking-wider z-10">
        Grafo GAT — {agents.length} nodos · aristas = atención CfC
      </div>
      <div className="absolute top-2 right-3 flex items-center gap-3 z-10">
        <LegendDot color="#60a5fa" label="Math"/>
        <LegendDot color="#a78bfa" label="Física"/>
        <LegendDot color="#fbbf24" label="Química"/>
        <div className="flex items-center gap-1 ml-1">
          <div className="w-5 h-0.5 bg-green-400/60" style={{height:"2px"}}/>
          <span className="text-[9px] text-muted-foreground">↑atención</span>
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} data-testid="agent-graph-canvas"/>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}/>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
