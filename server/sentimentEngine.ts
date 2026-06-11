/**
 * SENTIMENT ENGINE — Motor NLP para análisis de mercados financieros
 * ==================================================================
 * Análisis de sentimiento especializado para trading usando léxicos
 * financieros, políticos y económicos. Sin dependencias de ML externas.
 *
 * Metodología:
 *   1. Lexicón financiero (Loughran-McDonald inspirado)
 *   2. Léxico político con pesos sectoriales
 *   3. Léxico macro-económico
 *   4. Reconocimiento de entidades (empresas, países, tickers)
 *   5. Scoring ponderado con decaimiento temporal
 */

import type { NewsArticle, NamedEntity, PoliticalImpact, PoliticalEventType } from "./newsAggregator.js";

// ─── Lexicón Financiero ───────────────────────────────────────────────────────

const FINANCIAL_POSITIVE: [string, number][] = [
  ["surge", 0.85], ["rally", 0.80], ["boom", 0.75], ["breakthrough", 0.70],
  ["record high", 0.90], ["bullish", 0.80], ["outperform", 0.75], ["beat expectations", 0.80],
  ["strong growth", 0.75], ["upgrade", 0.70], ["exceed", 0.65], ["profit", 0.60],
  ["revenue growth", 0.70], ["expansion", 0.65], ["recovery", 0.65], ["rebound", 0.65],
  ["soar", 0.80], ["spike", 0.65], ["gain", 0.55], ["rise", 0.50], ["increase", 0.45],
  ["higher", 0.40], ["positive", 0.45], ["strong", 0.50], ["robust", 0.55],
  ["optimism", 0.65], ["confidence", 0.60], ["stimulus", 0.65], ["rate cut", 0.75],
  ["easing", 0.65], ["investment", 0.50], ["deal", 0.55], ["agreement", 0.55],
  ["partnership", 0.50], ["innovation", 0.55], ["recovery plan", 0.70],
  ["fiscal stimulus", 0.75], ["quantitative easing", 0.65], ["dovish", 0.70],
  ["soft landing", 0.80], ["full employment", 0.65], ["gdp growth", 0.70],
];

const FINANCIAL_NEGATIVE: [string, number][] = [
  ["crash", -0.95], ["collapse", -0.90], ["crisis", -0.85], ["recession", -0.85],
  ["bear market", -0.80], ["plunge", -0.85], ["tumble", -0.75], ["selloff", -0.80],
  ["downgrade", -0.70], ["miss expectations", -0.75], ["loss", -0.65], ["deficit", -0.60],
  ["decline", -0.55], ["fall", -0.50], ["drop", -0.50], ["slump", -0.70],
  ["contraction", -0.70], ["stagflation", -0.85], ["hyperinflation", -0.80],
  ["default", -0.90], ["bankruptcy", -0.90], ["insolvency", -0.85], ["fraud", -0.80],
  ["investigation", -0.60], ["fine", -0.55], ["penalty", -0.55], ["lawsuit", -0.55],
  ["hawkish", -0.65], ["rate hike", -0.65], ["tightening", -0.60], ["tariff", -0.60],
  ["sanctions", -0.75], ["embargo", -0.75], ["trade war", -0.80], ["debt ceiling", -0.70],
  ["shutdown", -0.70], ["layoffs", -0.65], ["unemployment", -0.65], ["inflation surge", -0.75],
];

// ─── Lexicón Político ─────────────────────────────────────────────────────────

const POLITICAL_POSITIVE: [string, number][] = [
  ["peace deal", 0.90], ["ceasefire", 0.85], ["diplomatic resolution", 0.80],
  ["trade agreement", 0.80], ["election win", 0.65], ["democratic reform", 0.60],
  ["infrastructure bill", 0.70], ["tax cut", 0.65], ["deregulation", 0.65],
  ["market friendly", 0.70], ["pro-business", 0.65], ["coalition government", 0.55],
  ["stable government", 0.60], ["reform agenda", 0.55], ["economic cooperation", 0.65],
  ["nato alliance", 0.55], ["security pact", 0.55], ["sanctions relief", 0.75],
  ["normalization", 0.65], ["diplomatic ties", 0.60], ["free trade", 0.65],
  ["multilateral", 0.55], ["international support", 0.55],
];

const POLITICAL_NEGATIVE: [string, number][] = [
  ["war", -0.90], ["invasion", -0.95], ["military strike", -0.85], ["coup", -0.90],
  ["assassination", -0.95], ["terror attack", -0.90], ["nuclear threat", -0.95],
  ["impeachment", -0.75], ["political crisis", -0.80], ["government collapse", -0.85],
  ["election fraud", -0.80], ["authoritarian", -0.70], ["populist", -0.55],
  ["nationalism", -0.55], ["protectionism", -0.65], ["tariff hike", -0.70],
  ["trade restriction", -0.65], ["capital controls", -0.75], ["expropriation", -0.80],
  ["civil unrest", -0.75], ["protest", -0.50], ["riot", -0.70], ["strike", -0.55],
  ["political instability", -0.75], ["constitutional crisis", -0.80],
  ["debt restructuring", -0.70], ["currency devaluation", -0.80],
  ["nationalization", -0.70], ["propaganda", -0.55], ["censorship", -0.60],
  ["sanctions imposed", -0.75], ["expelled ambassador", -0.65],
];

// ─── Lexicón Macro-Económico ──────────────────────────────────────────────────

const MACRO_BULLISH: [string, number][] = [
  ["gdp beats", 0.80], ["jobs report beats", 0.75], ["consumer confidence up", 0.70],
  ["manufacturing pmi", 0.60], ["retail sales surge", 0.65], ["housing starts rise", 0.60],
  ["industrial production up", 0.65], ["trade surplus", 0.60], ["current account surplus", 0.55],
  ["inflation cools", 0.80], ["disinflation", 0.70], ["price stability", 0.65],
  ["wage growth", 0.55], ["productivity gain", 0.65], ["tech investment", 0.60],
];

const MACRO_BEARISH: [string, number][] = [
  ["gdp misses", -0.80], ["jobs report misses", -0.75], ["consumer confidence falls", -0.70],
  ["manufacturing slowdown", -0.65], ["retail sales drop", -0.65],
  ["housing market crash", -0.75], ["trade deficit widening", -0.55],
  ["current account deficit", -0.50], ["inflation accelerates", -0.70],
  ["core inflation", -0.60], ["wage-price spiral", -0.75],
  ["productivity decline", -0.60], ["credit crunch", -0.80],
  ["yield inversion", -0.75], ["bank stress", -0.80], ["liquidity crisis", -0.85],
];

// ─── Reconocimiento de Entidades ──────────────────────────────────────────────

const COUNTRY_PATTERNS: Record<string, string[]> = {
  "US": ["united states", "u.s.", "usa", "america", "washington dc", "white house", "congress", "senate", "federal reserve", "the fed"],
  "CN": ["china", "chinese", "beijing", "xi jinping", "ccp", "pboc", "renminbi", "yuan", "taiwan"],
  "EU": ["european union", "eu", "eurozone", "ecb", "brussels", "draghi", "lagarde", "euro"],
  "RU": ["russia", "russian", "moscow", "kremlin", "putin", "ruble", "gazprom"],
  "UK": ["united kingdom", "britain", "british", "london", "bank of england", "sterling", "pound"],
  "JP": ["japan", "japanese", "tokyo", "bank of japan", "boj", "yen", "nikkei"],
  "DE": ["germany", "german", "bundesbank", "dax", "berlin"],
  "FR": ["france", "french", "paris", "macron", "banque de france"],
  "SA": ["saudi arabia", "saudi", "aramco", "opec", "riyadh"],
  "IN": ["india", "indian", "rbi", "sensex", "nifty", "rupee", "modi"],
  "BR": ["brazil", "brazilian", "real", "petrobras", "bovespa"],
  "KR": ["south korea", "korean", "kospi", "won", "samsung"],
  "IR": ["iran", "iranian", "tehran", "nuclear deal", "jcpoa"],
  "IL": ["israel", "israeli", "tel aviv", "shekel"],
};

const TICKER_PATTERNS: Record<string, string[]> = {
  "BTC": ["bitcoin", "btc", "satoshi", "crypto", "cryptocurrency"],
  "ETH": ["ethereum", "ether", "eth", "smart contract"],
  "AAPL": ["apple", "tim cook", "iphone", "ios", "macos"],
  "MSFT": ["microsoft", "azure", "satya nadella"],
  "GOOGL": ["google", "alphabet", "youtube", "sundar pichai"],
  "AMZN": ["amazon", "aws", "jeff bezos", "andy jassy"],
  "NVDA": ["nvidia", "cuda", "h100", "jensen huang"],
  "TSLA": ["tesla", "elon musk", "electric vehicle", "ev"],
  "META": ["meta", "facebook", "zuckerberg", "instagram", "whatsapp"],
  "JPM": ["jpmorgan", "jp morgan", "jamie dimon"],
  "GS": ["goldman sachs", "goldman"],
  "XOM": ["exxon", "exxonmobil", "oil major"],
  "GLD": ["gold", "bullion", "xau", "precious metal"],
  "OIL": ["crude oil", "brent", "wti", "barrel", "opec"],
  "SPY": ["s&p 500", "s&p500", "spy", "stock market", "wall street"],
  "DXY": ["dollar index", "dxy", "us dollar strength"],
};

// ─── Clasificación de Eventos Políticos ──────────────────────────────────────

interface PoliticalEventPattern {
  type: PoliticalEventType;
  keywords: string[];
  defaultDirection: "bullish" | "bearish" | "neutral" | "mixed";
  affectedSectors: string[];
}

const POLITICAL_EVENT_PATTERNS: PoliticalEventPattern[] = [
  {
    type: "election",
    keywords: ["election", "vote", "ballot", "poll", "candidate", "democrat", "republican", "incumbent", "primary"],
    defaultDirection: "mixed",
    affectedSectors: ["all"],
  },
  {
    type: "trade_dispute",
    keywords: ["tariff", "trade war", "import duty", "trade deficit", "wto dispute", "protectionism", "trade restriction"],
    defaultDirection: "bearish",
    affectedSectors: ["BTC", "ETH", "GLD", "OIL", "AAPL", "MSFT"],
  },
  {
    type: "sanctions",
    keywords: ["sanction", "embargo", "export ban", "blacklist", "ofac", "restricted entity"],
    defaultDirection: "bearish",
    affectedSectors: ["OIL", "GLD", "RU", "IR"],
  },
  {
    type: "war_conflict",
    keywords: ["war", "military", "invasion", "airstrike", "missile", "troops", "conflict", "offensive", "ceasefire"],
    defaultDirection: "bearish",
    affectedSectors: ["OIL", "GLD", "SPY", "BTC"],
  },
  {
    type: "central_bank",
    keywords: ["interest rate", "rate hike", "rate cut", "federal reserve", "ecb", "boj", "monetary policy", "quantitative easing", "tapering", "fomc"],
    defaultDirection: "mixed",
    affectedSectors: ["all"],
  },
  {
    type: "regulation",
    keywords: ["regulation", "regulatory", "compliance", "sec", "cftc", "antitrust", "monopoly", "crypto ban", "ban on"],
    defaultDirection: "bearish",
    affectedSectors: ["BTC", "ETH", "META", "GOOGL", "AMZN"],
  },
  {
    type: "tax_policy",
    keywords: ["tax cut", "tax hike", "corporate tax", "capital gains tax", "wealth tax", "irs", "tax reform"],
    defaultDirection: "mixed",
    affectedSectors: ["SPY", "all"],
  },
  {
    type: "government_spending",
    keywords: ["infrastructure", "stimulus", "spending bill", "budget", "deficit", "debt ceiling", "fiscal policy", "appropriation"],
    defaultDirection: "bullish",
    affectedSectors: ["SPY", "OIL", "BTC"],
  },
  {
    type: "diplomatic",
    keywords: ["summit", "diplomacy", "bilateral", "multilateral", "un resolution", "treaty", "accord", "normalization"],
    defaultDirection: "bullish",
    affectedSectors: ["OIL", "GLD", "SPY"],
  },
  {
    type: "coup_crisis",
    keywords: ["coup", "overthrow", "resignation forced", "state of emergency", "martial law", "insurrection"],
    defaultDirection: "bearish",
    affectedSectors: ["OIL", "GLD", "BTC"],
  },
];

// ─── Motor de Puntuación ──────────────────────────────────────────────────────

function scoreLexicon(text: string, lexicon: [string, number][]): number {
  let score = 0;
  let hits = 0;
  for (const [term, weight] of lexicon) {
    if (text.includes(term)) {
      score += weight;
      hits++;
    }
  }
  return hits > 0 ? score / Math.sqrt(hits) : 0; // Normalizar por raíz de hits
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function computeSentimentScore(text: string): {
  overall: number;
  financial: number;
  political: number;
  macro: number;
  confidence: number;
} {
  const lower = text.toLowerCase();

  const finPos = scoreLexicon(lower, FINANCIAL_POSITIVE);
  const finNeg = scoreLexicon(lower, FINANCIAL_NEGATIVE);
  const polPos = scoreLexicon(lower, POLITICAL_POSITIVE);
  const polNeg = scoreLexicon(lower, POLITICAL_NEGATIVE);
  const macBull = scoreLexicon(lower, MACRO_BULLISH);
  const macBear = scoreLexicon(lower, MACRO_BEARISH);

  const financial = clamp((finPos + finNeg) * 0.6, -1, 1);
  const political = clamp((polPos + polNeg) * 0.6, -1, 1);
  const macro = clamp((macBull + macBear) * 0.6, -1, 1);

  // Ponderado: financial 50%, political 35%, macro 15%
  const overall = clamp(financial * 0.50 + political * 0.35 + macro * 0.15, -1, 1);

  // Confianza basada en cuántos términos encontramos
  const totalHits = [finPos, finNeg, polPos, polNeg, macBull, macBear]
    .filter(s => Math.abs(s) > 0.01).length;
  const confidence = clamp(sigmoid(totalHits - 2), 0.1, 0.95);

  return { overall, financial, political, macro, confidence };
}

export function extractNamedEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];
  const lower = text.toLowerCase();
  const seen = new Set<string>();

  // Países
  for (const [code, patterns] of Object.entries(COUNTRY_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern) && !seen.has(code)) {
        entities.push({ text: code, type: "COUNTRY" });
        seen.add(code);
        break;
      }
    }
  }

  // Tickers/Activos
  for (const [ticker, patterns] of Object.entries(TICKER_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern) && !seen.has(ticker)) {
        entities.push({ text: ticker, type: "TICKER" });
        seen.add(ticker);
        break;
      }
    }
  }

  // Personas conocidas (simplificado)
  const KNOWN_PERSONS = [
    "powell", "yellen", "biden", "trump", "xi jinping", "putin", "zelensky",
    "lagarde", "macron", "scholz", "sunak", "modi", "musk", "bezos",
  ];
  for (const person of KNOWN_PERSONS) {
    if (lower.includes(person)) {
      entities.push({ text: person, type: "PERSON" });
    }
  }

  // Monedas
  const CURRENCIES = [
    ["USD", ["dollar", "usd"]], ["EUR", ["euro", "eur"]], ["JPY", ["yen", "jpy"]],
    ["GBP", ["pound", "gbp"]], ["CHF", ["franc", "chf"]], ["CNY", ["yuan", "rmb", "cny"]],
    ["BTC", ["bitcoin", "btc"]], ["ETH", ["ethereum", "eth"]],
  ] as [string, string[]][];
  for (const [code, patterns] of CURRENCIES) {
    if (!seen.has(code) && patterns.some(p => lower.includes(p))) {
      entities.push({ text: code, type: "CURRENCY" });
      seen.add(code);
    }
  }

  // Commodities
  const COMMODITIES = [
    ["GOLD", ["gold", "bullion"]], ["OIL", ["crude", "brent", "wti", "petroleum"]],
    ["GAS", ["natural gas", "lng"]], ["WHEAT", ["wheat", "grain"]],
    ["SILVER", ["silver"]], ["COPPER", ["copper"]],
  ] as [string, string[]][];
  for (const [code, patterns] of COMMODITIES) {
    if (!seen.has(code) && patterns.some(p => lower.includes(p))) {
      entities.push({ text: code, type: "COMMODITY" });
      seen.add(code);
    }
  }

  return entities;
}

export function classifyPoliticalEvent(article: NewsArticle): PoliticalImpact | null {
  const text = article.rawText.toLowerCase();
  let bestMatch: PoliticalEventPattern | null = null;
  let bestScore = 0;

  for (const pattern of POLITICAL_EVENT_PATTERNS) {
    const hits = pattern.keywords.filter(kw => text.includes(kw)).length;
    const score = hits / pattern.keywords.length;
    if (score > bestScore && score > 0.05) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (!bestMatch) return null;

  const sentiment = computeSentimentScore(text);
  const severity = clamp(Math.abs(sentiment.political) * bestScore * 2, 0, 1);
  const direction = sentiment.political > 0.1 ? "bullish"
    : sentiment.political < -0.1 ? "bearish"
    : "neutral";

  const affectedAssets = bestMatch.affectedSectors.includes("all")
    ? ["BTC", "ETH", "SPY", "GLD", "OIL", "DXY"]
    : bestMatch.affectedSectors;

  return {
    eventType: bestMatch.type,
    affectedAssets,
    severity,
    direction,
    confidence: sentiment.confidence * bestScore,
  };
}

export function analyzeArticle(article: NewsArticle): NewsArticle {
  const text = `${article.title} ${article.description}`;
  const sentiment = computeSentimentScore(text);
  const entities = extractNamedEntities(text);
  const politicalImpact = classifyPoliticalEvent(article);

  const keywords = extractKeywords(text);

  return {
    ...article,
    sentiment: sentiment.overall,
    relevanceScore: computeRelevanceScore(article, entities, politicalImpact),
    entities,
    keywords,
    politicalImpact: politicalImpact ?? undefined,
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "that", "this", "it", "its",
    "they", "them", "their", "which", "who", "what", "when", "where", "how",
    "as", "up", "out", "about", "into", "over", "than", "more",
  ]);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function computeRelevanceScore(
  article: NewsArticle,
  entities: NamedEntity[],
  impact: PoliticalImpact | null
): number {
  let score = 0.3; // Base

  // Más relevante si tiene entidades reconocidas
  score += Math.min(entities.length * 0.05, 0.25);

  // Más relevante si tiene impacto político fuerte
  if (impact) score += impact.severity * 0.3;

  // Más relevante si es reciente (últimas 2 horas)
  const ageHours = (Date.now() - article.publishedAt.getTime()) / 3_600_000;
  if (ageHours < 1) score += 0.15;
  else if (ageHours < 2) score += 0.10;
  else if (ageHours < 6) score += 0.05;

  // Penalizar fuentes sociales
  if (article.category === "social") score *= 0.6;

  // Bonificar banco central
  if (article.category === "central_bank") score = Math.min(score + 0.3, 1.0);

  return clamp(score, 0, 1);
}

export function analyzeArticlesBatch(articles: NewsArticle[]): NewsArticle[] {
  return articles.map(analyzeArticle);
}

export interface AggregatedSentiment {
  overall: number;
  political: number;
  economic: number;
  geopolitical: number;
  marketSentiment: number;
  fearGreedIndex: number;  // 0 (fear) a 100 (greed)
  topEntities: NamedEntity[];
  topEvents: PoliticalImpact[];
  articleCount: number;
  confidenceLevel: number;
  timestamp: Date;
}

export function aggregateSentiment(articles: NewsArticle[]): AggregatedSentiment {
  if (articles.length === 0) {
    return {
      overall: 0, political: 0, economic: 0, geopolitical: 0,
      marketSentiment: 0, fearGreedIndex: 50,
      topEntities: [], topEvents: [],
      articleCount: 0, confidenceLevel: 0,
      timestamp: new Date(),
    };
  }

  const analyzed = analyzeArticlesBatch(articles);

  // Promedios ponderados por relevancia y peso de fuente
  const weightedScores = analyzed.map(a => {
    const feedWeight = RSS_FEEDS.find(f => f.name === a.source)?.weight ?? 0.5;
    const relevance = a.relevanceScore ?? 0.5;
    const weight = feedWeight * relevance;
    return { sentiment: a.sentiment ?? 0, category: a.category, weight };
  });

  const totalWeight = weightedScores.reduce((s, a) => s + a.weight, 0);
  const overall = totalWeight > 0
    ? weightedScores.reduce((s, a) => s + a.sentiment * a.weight, 0) / totalWeight
    : 0;

  const byCategory = (cat: string) => {
    const filtered = weightedScores.filter(a => a.category === cat);
    const tw = filtered.reduce((s, a) => s + a.weight, 0);
    return tw > 0 ? filtered.reduce((s, a) => s + a.sentiment * a.weight, 0) / tw : overall;
  };

  const political = byCategory("political");
  const economic = byCategory("economic");
  const geopolitical = byCategory("geopolitical");
  const marketSentiment = (byCategory("market") + byCategory("economic")) / 2;

  // Fear & Greed: 50 = neutral, 0 = extreme fear, 100 = extreme greed
  const fearGreedIndex = Math.round(clamp((overall + 1) * 50, 0, 100));

  // Top entidades (más frecuentes)
  const entityFreq = new Map<string, NamedEntity>();
  analyzed.forEach(a => a.entities?.forEach(e => entityFreq.set(`${e.type}:${e.text}`, e)));
  const topEntities = Array.from(entityFreq.values()).slice(0, 10);

  // Top eventos
  const topEvents = analyzed
    .map(a => a.politicalImpact)
    .filter((e): e is PoliticalImpact => e != null && e.severity > 0.3)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5);

  const confidenceLevel = clamp(analyzed.length / 50, 0, 1);

  return {
    overall, political, economic, geopolitical, marketSentiment, fearGreedIndex,
    topEntities, topEvents, articleCount: articles.length, confidenceLevel,
    timestamp: new Date(),
  };
}

// Export for RSS_FEEDS reference
import { RSS_FEEDS } from "./newsAggregator.js";
