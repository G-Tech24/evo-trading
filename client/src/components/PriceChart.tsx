import { useMemo } from "react";
import type { MarketTick } from "@shared/schema";

interface PriceChartProps {
  ticks: MarketTick[];
}

export function PriceChart({ ticks }: PriceChartProps) {
  const { points, minP, maxP, current, change } = useMemo(() => {
    if (ticks.length < 2) return { points: "", minP: 0, maxP: 0, current: 0, change: 0 };
    const prices = ticks.map(t => t.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const W = 600, H = 100;

    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * W;
      const y = H - ((p - minP) / range) * (H - 10) - 5;
      return `${x},${y}`;
    }).join(" ");

    const current = prices[prices.length - 1];
    const first = prices[0];
    const change = ((current - first) / first) * 100;

    return { points, minP, maxP, current, change };
  }, [ticks]);

  const isUp = change >= 0;

  if (ticks.length < 2) {
    return (
      <div className="w-full h-full terminal-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground font-mono">Esperando datos de mercado...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full terminal-border relative overflow-hidden px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">BTC/USDT · 2s</span>
          <span className={`text-xs font-mono font-bold ${isUp ? "text-profit" : "text-loss"}`}>
            ${current.toLocaleString("en", { maximumFractionDigits: 0 })}
          </span>
          <span className={`text-[10px] font-mono ${isUp ? "text-profit" : "text-loss"}`}>
            {isUp ? "+" : ""}{change.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span>H: ${maxP.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
          <span>L: ${minP.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <svg viewBox="0 0 600 100" preserveAspectRatio="none" className="w-full" style={{ height: "calc(100% - 24px)" }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(100,120,150,0.1)" strokeWidth="0.5"/>
        ))}

        {/* Fill gradient */}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Area fill */}
        {ticks.length > 1 && (() => {
          const prices = ticks.map(t => t.price);
          const minP2 = Math.min(...prices);
          const maxP2 = Math.max(...prices);
          const range = maxP2 - minP2 || 1;
          const W = 600, H = 100;
          const pts = prices.map((p, i) => {
            const x = (i / (prices.length - 1)) * W;
            const y = H - ((p - minP2) / range) * (H - 10) - 5;
            return `${x},${y}`;
          });
          const lastX = 600, lastY = 95, firstX = 0;
          return <polygon
            points={`${firstX},95 ${pts.join(" ")} ${lastX},95`}
            fill="url(#priceGrad)"
          />;
        })()}

        {/* Price line */}
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? "#4ade80" : "#f87171"}
          strokeWidth="1.5"
        />

        {/* Last price dot */}
        {ticks.length > 1 && (() => {
          const prices = ticks.map(t => t.price);
          const minP2 = Math.min(...prices);
          const maxP2 = Math.max(...prices);
          const range = maxP2 - minP2 || 1;
          const H = 100;
          const lastY = H - ((prices[prices.length - 1] - minP2) / range) * (H - 10) - 5;
          return <circle cx="600" cy={lastY} r="3" fill={isUp ? "#4ade80" : "#f87171"}/>;
        })()}
      </svg>
    </div>
  );
}
