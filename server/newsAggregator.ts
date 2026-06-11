/**
 * NEWS AGGREGATOR — Motor de inteligencia multi-fuente
 * =====================================================
 * Recopila noticias políticas, económicas y de mercado desde RSS feeds públicos.
 * No requiere API keys para funcionar en modo básico.
 *
 * Fuentes:
 *   - Política: Reuters, AP, BBC, Politico, The Hill, Foreign Policy
 *   - Economía: Reuters Business, FT, WSJ, CNBC
 *   - Banco Central: Fed, ECB, BIS
 *   - Regulación: SEC, Federal Register
 *   - Mercados: Bloomberg, Reuters Markets, Barron's
 *   - Social: Reddit r/worldnews, r/economics, r/investing
 *   - Geopolítica: CFR, Defense News, Reuters World
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: NewsCategory;
  publishedAt: Date;
  rawText: string;
  sentiment?: number;        // -1 (muy negativo) a 1 (muy positivo)
  relevanceScore?: number;   // 0 a 1
  entities?: NamedEntity[];
  keywords?: string[];
  politicalImpact?: PoliticalImpact;
}

export interface NamedEntity {
  text: string;
  type: "PERSON" | "ORG" | "COUNTRY" | "CURRENCY" | "COMMODITY" | "TICKER";
}

export interface PoliticalImpact {
  eventType: PoliticalEventType;
  affectedAssets: string[];
  severity: number;     // 0-1
  direction: "bullish" | "bearish" | "neutral" | "mixed";
  confidence: number;   // 0-1
}

export type NewsCategory =
  | "political"
  | "economic"
  | "geopolitical"
  | "market"
  | "central_bank"
  | "regulatory"
  | "social"
  | "earnings"
  | "commodities";

export type PoliticalEventType =
  | "election"
  | "policy_change"
  | "trade_dispute"
  | "sanctions"
  | "war_conflict"
  | "central_bank"
  | "regulation"
  | "tax_policy"
  | "government_spending"
  | "diplomatic"
  | "coup_crisis"
  | "general_politics";

interface RSSFeed {
  name: string;
  url: string;
  category: NewsCategory;
  weight: number;
  country?: string;
}

// ─── Configuración de fuentes RSS ────────────────────────────────────────────

export const RSS_FEEDS: RSSFeed[] = [
  // === POLÍTICA USA ===
  { name: "Reuters Politics",   url: "https://feeds.reuters.com/reuters/politicsNews",            category: "political",    weight: 0.95, country: "US" },
  { name: "AP Politics",        url: "https://feeds.apnews.com/rss/apf-politics",                 category: "political",    weight: 0.90, country: "US" },
  { name: "Politico",           url: "https://www.politico.com/rss/politicopicks.xml",            category: "political",    weight: 0.85, country: "US" },
  { name: "The Hill",           url: "https://thehill.com/feed/",                                 category: "political",    weight: 0.80, country: "US" },
  { name: "Roll Call",          url: "https://rollcall.com/feed/",                                category: "political",    weight: 0.75, country: "US" },

  // === POLÍTICA INTERNACIONAL ===
  { name: "BBC Politics",       url: "https://feeds.bbci.co.uk/news/politics/rss.xml",            category: "political",    weight: 0.85, country: "UK" },
  { name: "Reuters World",      url: "https://feeds.reuters.com/Reuters/worldNews",               category: "geopolitical", weight: 0.90 },
  { name: "Foreign Policy",     url: "https://foreignpolicy.com/feed/",                          category: "geopolitical", weight: 0.85 },
  { name: "CFR",                url: "https://www.cfr.org/rss.xml",                               category: "geopolitical", weight: 0.80 },
  { name: "Defense News",       url: "https://www.defensenews.com/rss/",                         category: "geopolitical", weight: 0.75 },
  { name: "AP World",           url: "https://feeds.apnews.com/rss/apf-intlnews",                category: "geopolitical", weight: 0.85 },

  // === ECONOMÍA Y MERCADOS ===
  { name: "Reuters Business",   url: "https://feeds.reuters.com/reuters/businessNews",            category: "economic",     weight: 0.90 },
  { name: "CNBC Economy",       url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", category: "economic", weight: 0.85 },
  { name: "FT Markets",         url: "https://www.ft.com/rss/home",                              category: "market",       weight: 0.85 },
  { name: "WSJ Business",       url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",          category: "market",       weight: 0.85 },
  { name: "Barron's",           url: "https://www.barrons.com/xml/rss/3_7601.xml",               category: "market",       weight: 0.80 },
  { name: "Investor's Business", url: "https://www.investors.com/feed/",                         category: "market",       weight: 0.75 },

  // === BANCO CENTRAL (máxima prioridad) ===
  { name: "Federal Reserve",    url: "https://www.federalreserve.gov/feeds/press_all.xml",        category: "central_bank", weight: 1.00, country: "US" },
  { name: "ECB Press",          url: "https://www.ecb.europa.eu/rss/press.html",                 category: "central_bank", weight: 0.95, country: "EU" },
  { name: "BIS",                url: "https://www.bis.org/rss.xml",                              category: "central_bank", weight: 0.90 },

  // === REGULATORIO ===
  { name: "SEC EDGAR",          url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=20&search_text=&output=atom", category: "regulatory", weight: 0.85, country: "US" },
  { name: "CFTC",               url: "https://www.cftc.gov/rss/pressreleases.xml",               category: "regulatory",   weight: 0.80, country: "US" },

  // === COMMODITIES ===
  { name: "Reuters Commodities", url: "https://feeds.reuters.com/reuters/USenergyNews",          category: "commodities",  weight: 0.80 },
  { name: "Platts Energy",      url: "https://www.spglobal.com/commodityinsights/en/rss",        category: "commodities",  weight: 0.75 },

  // === SOCIAL / ALTERNATIVAS ===
  { name: "Reddit WorldNews",   url: "https://www.reddit.com/r/worldnews/hot.rss",               category: "social",       weight: 0.50 },
  { name: "Reddit Economics",   url: "https://www.reddit.com/r/economics/hot.rss",               category: "social",       weight: 0.55 },
  { name: "Reddit Investing",   url: "https://www.reddit.com/r/investing/hot.rss",               category: "social",       weight: 0.55 },
  { name: "Reddit CryptoCurrency", url: "https://www.reddit.com/r/CryptoCurrency/hot.rss",      category: "social",       weight: 0.50 },
];

// ─── Caché de artículos ───────────────────────────────────────────────────────

interface CacheEntry {
  articles: NewsArticle[];
  fetchedAt: Date;
  errorCount: number;
}

const articleCache = new Map<string, CacheEntry>();
const globalArticleCache = new Map<string, NewsArticle>(); // deduplicación por ID

const CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutos
const MAX_ARTICLES_PER_FEED = 25;
const MAX_GLOBAL_ARTICLES = 2000;
const FETCH_TIMEOUT_MS = 10_000;

// ─── Parseo RSS ───────────────────────────────────────────────────────────────

function extractXmlTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  if (plainMatch) return decodeHtmlEntities(plainMatch[1].trim());
  return "";
}

function extractAllXmlTags(xml: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0]);
  }
  return results;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRSSDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return new Date();
}

function generateArticleId(title: string, url: string): string {
  const combined = (title + url).toLowerCase().replace(/\s+/g, "");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseRSSFeed(xml: string, feed: RSSFeed): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // Soporte para Atom y RSS
  const isAtom = xml.includes("<feed") && xml.includes("xmlns");
  const itemTag = isAtom ? "entry" : "item";
  const items = extractAllXmlTags(xml, itemTag);

  for (const item of items.slice(0, MAX_ARTICLES_PER_FEED)) {
    const title = extractXmlTag(item, "title");
    const description = extractXmlTag(item, isAtom ? "summary" : "description") ||
                        extractXmlTag(item, "content");
    const url = isAtom
      ? (/<link[^>]*href=["']([^"']+)["']/i.exec(item)?.[1] || extractXmlTag(item, "id"))
      : (extractXmlTag(item, "link") || extractXmlTag(item, "guid"));
    const pubDate = extractXmlTag(item, isAtom ? "updated" : "pubDate") ||
                    extractXmlTag(item, "published");

    if (!title || title.length < 5) continue;

    const id = generateArticleId(title, url);
    if (globalArticleCache.has(id)) continue; // Deduplicar

    const rawText = `${title} ${description}`.toLowerCase();
    const article: NewsArticle = {
      id,
      title: title.slice(0, 300),
      description: description.slice(0, 800),
      url: url.slice(0, 500),
      source: feed.name,
      category: feed.category,
      publishedAt: parseRSSDate(pubDate),
      rawText,
    };

    articles.push(article);
  }

  return articles;
}

// ─── Fetching con timeout ─────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EvoTradingBot/1.0; +https://evo-trading.app)",
        "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml, */*",
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFeed(feed: RSSFeed): Promise<NewsArticle[]> {
  const cached = articleCache.get(feed.name);
  if (cached && (Date.now() - cached.fetchedAt.getTime()) < CACHE_TTL_MS) {
    return cached.articles;
  }

  try {
    const xml = await fetchWithTimeout(feed.url, FETCH_TIMEOUT_MS);
    const articles = parseRSSFeed(xml, feed);
    articleCache.set(feed.name, { articles, fetchedAt: new Date(), errorCount: 0 });
    articles.forEach(a => globalArticleCache.set(a.id, a));
    // Limpiar caché global si supera máximo
    if (globalArticleCache.size > MAX_GLOBAL_ARTICLES) {
      const oldest = Array.from(globalArticleCache.entries())
        .sort((a, b) => a[1].publishedAt.getTime() - b[1].publishedAt.getTime())
        .slice(0, 200)
        .map(e => e[0]);
      oldest.forEach(id => globalArticleCache.delete(id));
    }
    return articles;
  } catch (err) {
    const prev = articleCache.get(feed.name);
    const errorCount = (prev?.errorCount ?? 0) + 1;
    articleCache.set(feed.name, {
      articles: prev?.articles ?? [],
      fetchedAt: prev?.fetchedAt ?? new Date(),
      errorCount,
    });
    if (errorCount <= 2) {
      console.warn(`[NewsAggregator] Error fetching ${feed.name}: ${(err as Error).message}`);
    }
    return prev?.articles ?? [];
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export async function fetchAllFeeds(categories?: NewsCategory[]): Promise<NewsArticle[]> {
  const feeds = categories
    ? RSS_FEEDS.filter(f => categories.includes(f.category))
    : RSS_FEEDS;

  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const articles: NewsArticle[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  });

  return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function fetchPoliticalFeeds(): Promise<NewsArticle[]> {
  return fetchAllFeeds(["political", "geopolitical", "central_bank", "regulatory"]);
}

export async function fetchEconomicFeeds(): Promise<NewsArticle[]> {
  return fetchAllFeeds(["economic", "market", "commodities"]);
}

export function getRecentArticles(articles: NewsArticle[], windowMinutes = 60): NewsArticle[] {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  return articles.filter(a => a.publishedAt.getTime() > cutoff);
}

export function getArticlesByCategory(articles: NewsArticle[], category: NewsCategory): NewsArticle[] {
  return articles.filter(a => a.category === category);
}

export function getAggregatorStats() {
  const feedStats = Array.from(articleCache.entries()).map(([name, cache]) => ({
    name,
    articleCount: cache.articles.length,
    lastFetch: cache.fetchedAt,
    errorCount: cache.errorCount,
    cacheAge: Math.round((Date.now() - cache.fetchedAt.getTime()) / 1000 / 60),
  }));
  return {
    totalFeeds: RSS_FEEDS.length,
    activeFeedsWithData: feedStats.filter(f => f.articleCount > 0).length,
    globalCacheSize: globalArticleCache.size,
    feedStats,
  };
}
