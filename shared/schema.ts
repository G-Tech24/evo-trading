import { pgTable, text, integer, real, boolean, jsonb, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agent table — each row is one living or dead agent
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  generation: integer("generation").notNull().default(1),
  status: text("status").notNull().default("alive"), // alive | dead | reproducing
  parentIds: text("parent_ids").array().default([]),

  // Scientific knowledge domain emphasis (0.0–1.0 weights)
  mathWeight: real("math_weight").notNull().default(0.33),
  physicsWeight: real("physics_weight").notNull().default(0.33),
  chemistryWeight: real("chemistry_weight").notNull().default(0.34),

  // Strategy genes — evolved over generations
  riskTolerance: real("risk_tolerance").notNull().default(0.5),  // 0=very risk averse, 1=very aggressive
  lookbackPeriod: integer("lookback_period").notNull().default(14), // candles to look back
  entryThreshold: real("entry_threshold").notNull().default(0.02), // min signal strength to enter
  exitThreshold: real("exit_threshold").notNull().default(0.015),
  positionSizing: real("position_sizing").notNull().default(0.1), // fraction of capital per trade
  momentumBias: real("momentum_bias").notNull().default(0.0),    // -1=contrarian, +1=momentum
  volatilityFilter: real("volatility_filter").notNull().default(0.5),

  // Current trading state
  capital: real("capital").notNull().default(10000),
  initialCapital: real("initial_capital").notNull().default(10000),
  pnl: real("pnl").notNull().default(0),
  pnlPercent: real("pnl_percent").notNull().default(0),
  sharpeRatio: real("sharpe_ratio").notNull().default(0),
  maxDrawdown: real("max_drawdown").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  totalTrades: integer("total_trades").notNull().default(0),
  openPosition: text("open_position"), // "long" | "short" | null
  openPositionPrice: real("open_position_price"),

  // Graph connectivity — agent ids this agent communicates with
  neighbors: text("neighbors").array().default([]),
  signalInfluenceReceived: real("signal_influence_received").notNull().default(0),

  // Fitness score for selection
  fitnessScore: real("fitness_score").notNull().default(0),

  // Scientific reasoning strategy label (derived from dominant gene)
  strategy: text("strategy").notNull().default("brownian_motion"),
  // Possible: brownian_motion | mean_reversion | wave_interference | entropy_decay |
  //           boltzmann_distribution | chaos_theory | harmonic_oscillator | reaction_kinetics

  // Death reason if dead
  deathReason: text("death_reason"),
  diedAt: timestamp("died_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trade history
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  type: text("type").notNull(), // "buy" | "sell"
  price: real("price").notNull(),
  quantity: real("quantity").notNull(),
  pnl: real("pnl").notNull().default(0),
  rationale: text("rationale"), // scientific reasoning label
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Generations log
export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  generation: integer("generation").notNull(),
  agentsBorn: integer("agents_born").notNull().default(0),
  agentsDied: integer("agents_died").notNull().default(0),
  agentsAlive: integer("agents_alive").notNull().default(0),
  bestFitness: real("best_fitness").notNull().default(0),
  avgFitness: real("avg_fitness").notNull().default(0),
  bestAgentId: text("best_agent_id"),
  dominantStrategy: text("dominant_strategy"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Market tick data (in-memory cache only, stored for chart)
export const marketTicks = pgTable("market_ticks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().default("BTC/USDT"),
  price: real("price").notNull(),
  volume: real("volume").notNull().default(0),
  change24h: real("change24h").notNull().default(0),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// System events log
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "birth" | "death" | "trade" | "generation" | "reproduction"
  agentId: text("agent_id"),
  message: text("message").notNull(),
  data: jsonb("data"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertAgentSchema = createInsertSchema(agents).omit({ createdAt: true, updatedAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, timestamp: true });
export const insertGenerationSchema = createInsertSchema(generations).omit({ id: true, timestamp: true });
export const insertMarketTickSchema = createInsertSchema(marketTicks).omit({ id: true, timestamp: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, timestamp: true });

// Types
export type Agent = typeof agents.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Generation = typeof generations.$inferSelect;
export type MarketTick = typeof marketTicks.$inferSelect;
export type Event = typeof events.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
