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
    // Remove dead agents
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

      // Force-directed layout
      const positions = posRef.current;
      const agentMap = new Map(agents.map(a => [a.id, a]));

      // Apply forces
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;

        // Center gravity
        const dx = W / 2 - pos.x;
        const dy = H / 2 - pos.y;
        pos.vx += dx * 0.001;
        pos.vy += dy * 0.001;

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

        // Attraction to neighbors
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

        // Damping
        pos.vx *= 0.85;
        pos.vy *= 0.85;
        pos.x += pos.vx;
        pos.y += pos.vy;

        // Boundary
        pos.x = Math.max(24, Math.min(W - 24, pos.x));
        pos.y = Math.max(24, Math.min(H - 24, pos.y));
      });

      // Draw edges
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;
        (agent.neighbors ?? []).forEach(nid => {
          const npos = positions.get(nid);
          if (!npos) return;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(npos.x, npos.y);
          ctx.strokeStyle = "rgba(100,120,150,0.2)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });
      });

      // Draw signal pulses along edges (for active traders)
      agents.filter(a => a.openPosition).forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;
        (agent.neighbors ?? []).forEach(nid => {
          const npos = positions.get(nid);
          if (!npos) return;
          const t = (Date.now() / 800) % 1;
          const px = pos.x + (npos.x - pos.x) * t;
          const py = pos.y + (npos.y - pos.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = agent.pnlPercent >= 0 ? "rgba(74,222,128,0.8)" : "rgba(248,113,113,0.8)";
          ctx.fill();
        });
      });

      // Draw nodes
      agents.forEach(agent => {
        const pos = positions.get(agent.id);
        if (!pos) return;
        const baseColor = STRATEGY_COLORS[agent.strategy] ?? "#60a5fa";
        const isProfiting = agent.pnlPercent >= 0;
        const radius = 8 + Math.min(Math.abs(agent.fitnessScore) * 3, 8);

        // Glow
        const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2.5);
        grd.addColorStop(0, isProfiting ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor + "40";
        ctx.fill();
        ctx.strokeStyle = isProfiting ? "#4ade80" : "#f87171";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner dot for open position
        if (agent.openPosition) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = agent.openPosition === "long" ? "#4ade80" : "#f87171";
          ctx.fill();
        }

        // Name label
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = "rgba(200,210,220,0.85)";
        ctx.textAlign = "center";
        ctx.fillText(agent.name.split("-")[0], pos.x, pos.y + radius + 10);

        // PnL label
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.fillStyle = isProfiting ? "#4ade80" : "#f87171";
        ctx.fillText(`${isProfiting ? "+" : ""}${agent.pnlPercent.toFixed(1)}%`, pos.x, pos.y + radius + 19);
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
        Grafo de Comunicación — {agents.length} nodos activos
      </div>
      <div className="absolute top-2 right-3 flex items-center gap-3 z-10">
        <LegendDot color="#60a5fa" label="Matemáticas"/>
        <LegendDot color="#a78bfa" label="Física"/>
        <LegendDot color="#fbbf24" label="Química"/>
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
