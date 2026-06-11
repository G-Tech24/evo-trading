/**
 * POLITICAL ANALYZER — Inteligencia Política para Trading
 * ========================================================
 * Inspirado en la estrategia de Renaissance Technologies / Medallion Fund.
 * Convierte eventos políticos en señales de trading accionables.
 *
 * Estrategias políticas implementadas:
 *   1. Policy Premium — cambios regulatorios afectan sectores específicos
 *   2. Election Cycle Alpha — volatilidad y dirección pre/post elección
 *   3. Geopolitical Risk Premium — conflictos → Gold/Oil/BTC hedge
 *   4. Central Bank Decoded — decodifica comunicados de bancos centrales
 *   5. Regime Change Detection — detecta cambios estructurales de gobierno
 *   6. Sanctions/Trade War Mapping — mapeo de impacto comercial
 */

import type { NewsArticle, PoliticalImpact, PoliticalEventType } from "./newsAggregator.js";
import type { AggregatedSentiment } from "./sentimentEngine.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PoliticalSignal {
  id: string;
  type: PoliticalEventType;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;         // 0-1
  confidence: number;       // 0-1
  affectedSymbols: SymbolImpact[];
  source: string;
  headline: string;
  rationale: string;
  generatedAt: Date;
  expiresAt: Date;          // Cuándo expira la señal
  isActive: boolean;
}

export interface SymbolImpact {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  magnitude: number;        // 0-1
  reason: string;
}

export interface GeopoliticalRisk {
  region: string;
  riskLevel: number;        // 0-1
  type: string;
  description: string;
  affectedAssets: string[];
  lastUpdated: Date;
}

export interface CentralBankSignal {
  bank: string;
  stance: "dovish" | "hawkish" | "neutral";
  magnitude: number;        // 0-1
  impliedAction: "rate_cut" | "rate_hike" | "hold" | "qe" | "qt";
  probability: number;      // 0-1
  nextMeeting?: string;
  extractedFrom: string;
}

export interface PoliticalIntelligenceReport {
  timestamp: Date;
  signals: PoliticalSignal[];
  geopoliticalRisks: GeopoliticalRisk[];
  centralBankSignals: CentralBankSignal[];
  compositeRiskScore: number;   // 0-1
  dominantTheme: string;
  tradingBias: "risk_on" | "risk_off" | "neutral";
  recommendedHedges: string[];
  topOpportunities: string[];
}

// ─── Reglas de Impacto Político por Activo ────────────────────────────────────

interface AssetImpactRule {
  eventType: PoliticalEventType;
  countries?: string[];        // Si aplica a países específicos
  keywords: string[];
  bullishAssets: [string, number, string][]; // [símbolo, magnitud, razón]
  bearishAssets: [string, number, string][];
  signalDuration: number;      // Horas que dura la señal
}

const ASSET_IMPACT_RULES: AssetImpactRule[] = [
  // === GUERRAS Y CONFLICTOS ===
  {
    eventType: "war_conflict",
    keywords: ["war", "invasion", "airstrike", "military conflict", "armed conflict"],
    bullishAssets: [
      ["GLD", 0.85, "Safe haven demand spikes during conflicts"],
      ["OIL", 0.75, "Supply disruption risk in conflict regions"],
      ["BTC", 0.65, "Decentralized hedge against geopolitical instability"],
      ["defense stocks", 0.80, "Defense spending increases during conflicts"],
    ],
    bearishAssets: [
      ["SPY", 0.70, "Risk-off sentiment reduces equity exposure"],
      ["EM", 0.65, "Capital flight from emerging markets"],
      ["local currency", 0.75, "Local currency depreciation in conflict zones"],
    ],
    signalDuration: 72,
  },
  // === SANCIONES ===
  {
    eventType: "sanctions",
    keywords: ["sanctions", "embargo", "export ban", "blacklist"],
    bullishAssets: [
      ["GLD", 0.60, "Safe haven from sanctions-driven volatility"],
      ["OIL", 0.70, "Oil supply disruption from sanctioned exporters"],
      ["BTC", 0.55, "Sanctions evasion tool premium"],
    ],
    bearishAssets: [
      ["target country ETF", 0.80, "Targeted country equities collapse"],
      ["trade partners", 0.50, "Secondary effects on trade partners"],
    ],
    signalDuration: 168, // 1 semana
  },
  // === DECISIONES DE BANCO CENTRAL ===
  {
    eventType: "central_bank",
    keywords: ["rate hike", "rate cut", "federal reserve", "fomc", "ecb decision", "boj policy"],
    bullishAssets: [
      ["SPY", 0.70, "Dovish policy boosts equities"],   // cuando dovish
      ["BTC", 0.65, "Loose monetary policy inflates crypto"],
      ["GLD", 0.60, "Lower real rates boost gold"],
    ],
    bearishAssets: [
      ["DXY", 0.60, "Rate cuts weaken dollar"],
      ["bonds short", 0.55, "Rate hikes hurt bond prices"],
    ],
    signalDuration: 48,
  },
  // === DISPUTAS COMERCIALES ===
  {
    eventType: "trade_dispute",
    keywords: ["tariff", "trade war", "import duty", "trade restriction"],
    bullishAssets: [
      ["GLD", 0.65, "Safe haven during trade uncertainty"],
      ["domestic stocks", 0.55, "Protected domestic industries benefit"],
    ],
    bearishAssets: [
      ["tech stocks", 0.70, "Supply chain disruption affects tech"],
      ["export sectors", 0.65, "Exporters suffer from retaliatory tariffs"],
      ["SPY", 0.55, "Overall market uncertainty"],
      ["BTC", 0.40, "Risk-off affects crypto"],
    ],
    signalDuration: 120,
  },
  // === ELECCIONES ===
  {
    eventType: "election",
    keywords: ["election", "vote", "poll", "candidate", "primary"],
    bullishAssets: [
      ["VIX hedge", 0.60, "Volatility premium on election uncertainty"],
    ],
    bearishAssets: [
      ["certainty assets", 0.40, "Uncertainty premium on all assets"],
    ],
    signalDuration: 48,
  },
  // === POLÍTICA FISCAL ===
  {
    eventType: "government_spending",
    keywords: ["infrastructure bill", "stimulus", "fiscal spending", "spending package"],
    bullishAssets: [
      ["SPY", 0.65, "Government spending boosts GDP and equities"],
      ["commodities", 0.70, "Infrastructure demand boosts industrial metals"],
      ["BTC", 0.50, "Deficit spending fears boost crypto hedge"],
    ],
    bearishAssets: [
      ["USD bonds", 0.55, "Debt concerns weaken long-term bonds"],
    ],
    signalDuration: 96,
  },
  // === REGULACIÓN CRIPTO ===
  {
    eventType: "regulation",
    keywords: ["crypto ban", "bitcoin regulation", "sec crypto", "crypto rule", "stablecoin law"],
    bullishAssets: [
      ["BTC", 0.60, "Regulatory clarity often bullish long-term"],
      ["ETH", 0.55, "Regulatory clarity for smart contracts"],
    ],
    bearishAssets: [
      ["BTC", 0.80, "Strict crypto regulation crushes sentiment"],
      ["ETH", 0.75, "Regulation uncertainty hits crypto first"],
      ["altcoins", 0.85, "Smaller coins most vulnerable to regulation"],
    ],
    signalDuration: 72,
  },
  // === COUP / CRISIS POLÍTICA ===
  {
    eventType: "coup_crisis",
    keywords: ["coup", "political crisis", "government collapse", "state of emergency"],
    bullishAssets: [
      ["GLD", 0.90, "Extreme safe haven buying during political crises"],
      ["BTC", 0.75, "Capital flight to crypto during local crises"],
      ["USD", 0.70, "Dollar demand as global reserve safe haven"],
    ],
    bearishAssets: [
      ["local assets", 0.95, "Local market crash during coups"],
      ["SPY", 0.50, "Contagion risk to global markets"],
    ],
    signalDuration: 48,
  },
  // === POLÍTICA IMPOSITIVA ===
  {
    eventType: "tax_policy",
    keywords: ["capital gains tax", "corporate tax", "tax reform", "tax cut", "tax hike"],
    bullishAssets: [
      ["SPY", 0.70, "Tax cuts boost corporate earnings"],
      ["BTC", 0.60, "Tax cut boost risk appetite"],
    ],
    bearishAssets: [
      ["SPY", 0.65, "Tax hikes compress corporate margins"],
      ["wealthy assets", 0.55, "Wealth taxes reduce investment"],
    ],
    signalDuration: 168,
  },
];

// ─── Decodificador de Bancos Centrales ────────────────────────────────────────

const DOVISH_SIGNALS = [
  "accommodative", "patient", "flexible", "gradual", "data dependent",
  "rate cut", "lower rates", "below target", "support growth", "qe",
  "quantitative easing", "asset purchases", "below 2%", "below mandate",
  "soft landing", "labor market concerns", "downside risks",
];

const HAWKISH_SIGNALS = [
  "above target", "elevated inflation", "rate hike", "tighten",
  "reduce balance sheet", "qt", "quantitative tightening", "restrictive",
  "not cutting", "higher for longer", "inflation fight", "price stability",
  "overheating", "labor market tight", "upside risks", "above 2%",
];

export function decodeCentralBankSignal(article: NewsArticle): CentralBankSignal | null {
  if (article.category !== "central_bank") return null;
  const text = article.rawText.toLowerCase();

  const bank = text.includes("federal reserve") || text.includes("fed") || text.includes("fomc") ? "Fed"
    : text.includes("ecb") || text.includes("european central") ? "ECB"
    : text.includes("boj") || text.includes("bank of japan") ? "BOJ"
    : text.includes("boe") || text.includes("bank of england") ? "BOE"
    : text.includes("pboc") || text.includes("people's bank") ? "PBOC"
    : "Unknown";

  if (bank === "Unknown") return null;

  const dovishHits = DOVISH_SIGNALS.filter(s => text.includes(s)).length;
  const hawkishHits = HAWKISH_SIGNALS.filter(s => text.includes(s)).length;

  if (dovishHits === 0 && hawkishHits === 0) return null;

  const stance: "dovish" | "hawkish" | "neutral" =
    dovishHits > hawkishHits * 1.5 ? "dovish"
    : hawkishHits > dovishHits * 1.5 ? "hawkish"
    : "neutral";

  const magnitude = Math.min((Math.max(dovishHits, hawkishHits)) / 5, 1);

  const impliedAction: CentralBankSignal["impliedAction"] =
    text.includes("rate cut") || text.includes("lower rates") ? "rate_cut"
    : text.includes("rate hike") || text.includes("raise rates") ? "rate_hike"
    : text.includes("qe") || text.includes("quantitative easing") ? "qe"
    : text.includes("qt") || text.includes("tightening") ? "qt"
    : "hold";

  return {
    bank,
    stance,
    magnitude,
    impliedAction,
    probability: Math.min(magnitude * 1.5, 0.9),
    extractedFrom: article.title,
  };
}

// ─── Generador de Señales Políticas ──────────────────────────────────────────

let signalCounter = 0;

function generateSignalId(): string {
  return `POL_${Date.now()}_${++signalCounter}`;
}

function isBearishEvent(article: NewsArticle, rule: AssetImpactRule): boolean {
  if (!article.politicalImpact) return false;
  const text = article.rawText.toLowerCase();
  const keywordMatch = rule.keywords.filter(k => text.includes(k)).length;
  // Negativo si hay palabras de riesgo sin palabras positivas
  const hasNegative = ["war", "crisis", "ban", "hike", "restrict", "coup", "collapse"].some(k => text.includes(k));
  return hasNegative && keywordMatch > 0;
}

export function generatePoliticalSignals(articles: NewsArticle[]): PoliticalSignal[] {
  const signals: PoliticalSignal[] = [];
  const now = new Date();

  for (const article of articles) {
    if (!article.politicalImpact || article.relevanceScore! < 0.3) continue;

    const impact = article.politicalImpact;
    const rule = ASSET_IMPACT_RULES.find(r => r.type === impact.eventType);

    if (!rule) continue;

    const isBearish = isBearishEvent(article, rule);
    const sentiment = article.sentiment ?? 0;
    const direction: PoliticalSignal["direction"] =
      impact.direction === "bullish" ? "bullish"
      : impact.direction === "bearish" ? "bearish"
      : sentiment > 0.1 ? "bullish"
      : sentiment < -0.1 ? "bearish"
      : "neutral";

    const symbolImpacts: SymbolImpact[] = [];

    const bearishAssets = isBearish ? rule.bearishAssets : [];
    const bullishAssets = isBearish ? [] : rule.bullishAssets;

    for (const [symbol, magnitude, reason] of bullishAssets) {
      if (impact.affectedAssets.some(a => symbol.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(symbol.toLowerCase()))) {
        symbolImpacts.push({ symbol, direction: "bullish", magnitude: magnitude * impact.severity, reason });
      }
    }
    for (const [symbol, magnitude, reason] of bearishAssets) {
      symbolImpacts.push({ symbol, direction: "bearish", magnitude: magnitude * impact.severity, reason });
    }

    // También incluir directamente los activos afectados del impacto
    for (const asset of impact.affectedAssets) {
      if (!symbolImpacts.some(s => s.symbol === asset)) {
        symbolImpacts.push({
          symbol: asset,
          direction: impact.direction === "neutral" ? "neutral" : impact.direction,
          magnitude: impact.severity * 0.5,
          reason: `Political event: ${impact.eventType}`,
        });
      }
    }

    if (symbolImpacts.length === 0) continue;

    const expiresAt = new Date(now.getTime() + rule.signalDuration * 3_600_000);

    signals.push({
      id: generateSignalId(),
      type: impact.eventType,
      direction,
      strength: impact.severity,
      confidence: impact.confidence,
      affectedSymbols: symbolImpacts,
      source: article.source,
      headline: article.title,
      rationale: `${impact.eventType.replace(/_/g, " ")} detected with ${Math.round(impact.confidence * 100)}% confidence. ${symbolImpacts.length} assets affected.`,
      generatedAt: now,
      expiresAt,
      isActive: true,
    });
  }

  return signals.sort((a, b) => b.strength * b.confidence - a.strength * a.confidence).slice(0, 20);
}

// ─── Registro de Riesgos Geopolíticos ────────────────────────────────────────

const geopoliticalRiskRegistry = new Map<string, GeopoliticalRisk>();

const REGION_PATTERNS: Record<string, { assets: string[]; keywords: string[] }> = {
  "Middle East": {
    assets: ["OIL", "GLD", "BTC"],
    keywords: ["middle east", "iran", "israel", "saudi", "iraq", "syria", "yemen", "hezbollah", "hamas", "opec"],
  },
  "Eastern Europe": {
    assets: ["OIL", "GLD", "natural gas", "WHEAT"],
    keywords: ["ukraine", "russia", "nato", "eastern europe", "poland", "moldova", "belarus"],
  },
  "Asia-Pacific": {
    assets: ["AAPL", "TSLA", "semiconductors", "NVDA"],
    keywords: ["taiwan strait", "south china sea", "korea", "japan", "china military", "pla"],
  },
  "Latin America": {
    assets: ["copper", "OIL", "agriculture"],
    keywords: ["venezuela", "cuba", "nicaragua", "mexico cartel", "colombia", "leftist"],
  },
  "Africa": {
    assets: ["GLD", "OIL", "cobalt", "lithium"],
    keywords: ["sahel", "sudan", "ethiopia", "niger", "mali", "coup africa"],
  },
  "North Korea": {
    assets: ["GLD", "BTC", "defense"],
    keywords: ["north korea", "dprk", "kim jong", "ballistic missile", "nuclear test"],
  },
};

export function updateGeopoliticalRisks(articles: NewsArticle[]): GeopoliticalRisk[] {
  const now = new Date();

  for (const article of articles) {
    if (article.category !== "geopolitical" && article.category !== "political") continue;
    const text = article.rawText.toLowerCase();

    for (const [region, config] of Object.entries(REGION_PATTERNS)) {
      const keywordHits = config.keywords.filter(k => text.includes(k)).length;
      if (keywordHits < 1) continue;

      const riskScore = Math.min(keywordHits / 3 * (article.relevanceScore ?? 0.5), 1);
      const existing = geopoliticalRiskRegistry.get(region);

      const newRisk: GeopoliticalRisk = {
        region,
        riskLevel: existing
          ? Math.min(existing.riskLevel * 0.7 + riskScore * 0.3, 1) // Decaimiento exponencial
          : riskScore,
        type: article.politicalImpact?.eventType ?? "general_politics",
        description: article.title.slice(0, 200),
        affectedAssets: config.assets,
        lastUpdated: now,
      };

      geopoliticalRiskRegistry.set(region, newRisk);
    }
  }

  // Decaimiento natural de riesgos no actualizados (10% por ciclo)
  for (const [region, risk] of geopoliticalRiskRegistry.entries()) {
    const ageHours = (now.getTime() - risk.lastUpdated.getTime()) / 3_600_000;
    if (ageHours > 6) {
      risk.riskLevel *= Math.pow(0.9, ageHours / 6);
      if (risk.riskLevel < 0.05) geopoliticalRiskRegistry.delete(region);
    }
  }

  return Array.from(geopoliticalRiskRegistry.values())
    .sort((a, b) => b.riskLevel - a.riskLevel);
}

// ─── Generador del Reporte Completo ──────────────────────────────────────────

export function generateIntelligenceReport(
  articles: NewsArticle[],
  aggregatedSentiment: AggregatedSentiment
): PoliticalIntelligenceReport {
  const signals = generatePoliticalSignals(articles);
  const geopoliticalRisks = updateGeopoliticalRisks(articles);
  const centralBankSignals = articles
    .filter(a => a.category === "central_bank")
    .map(decodeCentralBankSignal)
    .filter((s): s is CentralBankSignal => s !== null);

  // Riesgo compuesto: media de riesgos geopolíticos + factor sentimiento
  const geoRisk = geopoliticalRisks.reduce((s, r) => s + r.riskLevel, 0) /
    Math.max(geopoliticalRisks.length, 1);
  const sentimentRisk = (1 - aggregatedSentiment.overall) / 2; // Negativo = más riesgo
  const compositeRiskScore = geoRisk * 0.6 + sentimentRisk * 0.4;

  // Tema dominante
  const dominantSignal = signals[0];
  const dominantTheme = dominantSignal
    ? `${dominantSignal.type.replace(/_/g, " ")} — ${dominantSignal.headline.slice(0, 80)}`
    : "No dominant political theme detected";

  // Sesgo de trading
  const tradingBias: "risk_on" | "risk_off" | "neutral" =
    compositeRiskScore > 0.6 ? "risk_off"
    : compositeRiskScore < 0.3 && aggregatedSentiment.overall > 0.2 ? "risk_on"
    : "neutral";

  // Hedges recomendados
  const recommendedHedges: string[] = [];
  if (compositeRiskScore > 0.5) {
    recommendedHedges.push("GLD");
    if (compositeRiskScore > 0.7) recommendedHedges.push("BTC", "short SPY");
    if (geopoliticalRisks.some(r => r.region === "Middle East" && r.riskLevel > 0.5)) {
      recommendedHedges.push("OIL");
    }
  }

  // Oportunidades principales
  const topOpportunities = signals
    .filter(s => s.direction === "bullish" && s.strength > 0.5)
    .flatMap(s => s.affectedSymbols.filter(sym => sym.direction === "bullish").map(sym => sym.symbol))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  return {
    timestamp: new Date(),
    signals,
    geopoliticalRisks,
    centralBankSignals,
    compositeRiskScore,
    dominantTheme,
    tradingBias,
    recommendedHedges,
    topOpportunities,
  };
}

export function getGeopoliticalRisks(): GeopoliticalRisk[] {
  return Array.from(geopoliticalRiskRegistry.values()).sort((a, b) => b.riskLevel - a.riskLevel);
}
