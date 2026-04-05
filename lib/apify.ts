import { ApifyClient } from "apify-client";
import fs from "fs";
import path from "path";
import type { Platform } from "./build-prompt";

// On Vercel the project root is read-only — use /tmp for cache
const CACHE_DIR = process.env.VERCEL
  ? "/tmp/replanit-cache"
  : path.join(process.cwd(), "data", "cache");
const CACHE_TTL_DAYS = 7;

const ACTOR_IDS: Record<Platform, string> = {
  TikTok: "clockworks/tiktok-scraper",
  "Instagram Reels": "apify/instagram-reel-scraper",
  "YouTube Shorts": "streamers/youtube-scraper",
  "Facebook Reels": "apify/facebook-posts-scraper",
};

export interface ScrapedPost {
  id: string;
  caption?: string;
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement_rate?: number;
  url?: string;
  platform: Platform;
}

function getCacheKey(platform: Platform, keyword: string): string {
  const date = new Date().toISOString().split("T")[0];
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${platform.toLowerCase().replace(/\s+/g, "-")}-${slug}-${date}`;
}

function getCachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

function isCacheValid(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  const ageMs = Date.now() - stat.mtimeMs;
  return ageMs < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function readCache(filePath: string): ScrapedPost[] | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(filePath: string, data: ScrapedPost[]): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function computeEngagementRate(post: Record<string, unknown>): number {
  const views = Number(post.views || post.playCount || post.viewCount || 0);
  const likes = Number(post.likes || post.likesCount || post.diggCount || 0);
  const comments = Number(post.comments || post.commentsCount || 0);
  const shares = Number(post.shares || post.sharesCount || 0);
  if (views === 0) return 0;
  return (likes + comments + shares) / views;
}

function normalisePost(raw: Record<string, unknown>, platform: Platform): ScrapedPost {
  const views = Number(raw.views || raw.playCount || raw.viewCount || 0);
  const likes = Number(raw.likes || raw.likesCount || raw.diggCount || 0);
  const comments = Number(raw.comments || raw.commentsCount || 0);
  const shares = Number(raw.shares || raw.sharesCount || 0);

  return {
    id: String(raw.id || raw.videoId || raw.shortCode || Math.random()),
    caption: String(raw.caption || raw.text || raw.description || raw.title || ""),
    transcript: String(raw.transcript || raw.subtitles || raw.description || ""),
    views,
    likes,
    comments,
    shares,
    engagement_rate: computeEngagementRate(raw),
    url: String(raw.url || raw.webVideoUrl || raw.shortUrl || ""),
    platform,
  };
}

export async function scrapeContent(
  platform: Platform,
  keyword: string,
  forceFresh = false,
  onProgress?: (msg: string) => void
): Promise<ScrapedPost[]> {
  const cacheKey = getCacheKey(platform, keyword);
  const cachePath = getCachePath(cacheKey);

  if (!forceFresh && isCacheValid(cachePath)) {
    const cached = readCache(cachePath);
    if (cached) return cached;
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const client = new ApifyClient({ token });
  const actorId = ACTOR_IDS[platform];

  const tiers = buildSearchTiers(keyword);
  const MIN_RESULTS = 5;
  let allPosts: ScrapedPost[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const { label, terms } = tiers[i];
    onProgress?.(`Searching ${label}: "${terms[0]}"${terms.length > 1 ? ` +${terms.length - 1} more` : ""}...`);

    for (const term of terms) {
      try {
        const input = buildActorInput(platform, term);
        const run = await client.actor(actorId).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 50 });

        const posts = (items as Record<string, unknown>[])
          .map((item) => normalisePost(item, platform))
          .filter((p) => (p.engagement_rate ?? 0) > 0.02); // 2% ER threshold — 5% was too strict for niche topics

        allPosts = allPosts.concat(posts);
      } catch (err) {
        console.error(`Apify scrape failed for term "${term}":`, err);
      }
    }

    // Deduplicate after each tier
    const seen = new Set<string>();
    allPosts = allPosts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    if (allPosts.length >= MIN_RESULTS) {
      onProgress?.(`Found ${allPosts.length} posts — done.`);
      break;
    } else if (i < tiers.length - 1) {
      onProgress?.(`Only ${allPosts.length} result${allPosts.length !== 1 ? "s" : ""} — widening search to ${tiers[i + 1].label}...`);
    }
  }

  const top15 = allPosts
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
    .slice(0, 15);

  writeCache(cachePath, top15);
  return top15;
}

interface SearchTier {
  label: string;
  terms: string[];
}

function buildSearchTiers(keyword: string): SearchTier[] {
  const lower = keyword.toLowerCase();

  // ── Tier 1: exact topic ────────────────────────────────────────────────────
  const tier1: SearchTier = { label: "exact topic", terms: [keyword] };

  // ── Tier 2: core subject (strip common qualifiers) ─────────────────────────
  const qualifierPattern = /\b(mistakes?|tips?|guide|how\s+to|explained?|planning|rules?|costs?|advice|beginners?|uk|basics?|problems?|issues?|errors?|wrong|right|best|worst|common|avoid|top\s*\d*|things?\s+to|you\s+need|before\s+you|why\s+your?)\b/gi;
  const stripped = keyword.replace(qualifierPattern, "").replace(/\s+/g, " ").trim();
  const coreSubject = stripped.length >= 3 && stripped.toLowerCase() !== lower ? stripped : "";

  const tier2Terms: string[] = coreSubject
    ? [coreSubject, `${coreSubject} UK`]
    : [`${keyword} UK`, `UK ${keyword}`];
  const tier2: SearchTier = { label: "core subject", terms: tier2Terms };

  // ── Tier 3: broad niche category ─────────────────────────────────────────
  const categories: Array<{ match: string[]; terms: string[] }> = [
    {
      match: ["loft", "attic", "dormer"],
      terms: ["loft conversion UK", "loft conversion tips"],
    },
    {
      match: ["extension", "single storey", "rear extension", "side return"],
      terms: ["home extension UK", "house extension ideas"],
    },
    {
      match: ["garage"],
      terms: ["garage conversion UK", "home conversion"],
    },
    {
      match: ["planning permission", "permitted development", "pd rights", "planning application"],
      terms: ["planning permission UK", "UK planning permission tips"],
    },
    {
      match: ["building reg", "building control", "building regulation"],
      terms: ["building regulations UK", "home renovation UK"],
    },
    {
      match: ["party wall", "neighbour"],
      terms: ["party wall agreement UK", "home renovation neighbour"],
    },
    {
      match: ["architect", "architectural", "brief", "drawings"],
      terms: ["UK architect tips", "architectural design UK"],
    },
    {
      match: ["kitchen", "bathroom", "utility"],
      terms: ["kitchen renovation UK", "home renovation UK"],
    },
    {
      match: ["cost", "budget", "price", "quote", "contractor", "builder"],
      terms: ["home renovation costs UK", "UK renovation budget"],
    },
    {
      match: ["renovation", "refurb", "remodel"],
      terms: ["home renovation UK", "house renovation tips"],
    },
  ];

  let tier3Terms = ["home renovation UK", "house renovation UK"];
  for (const cat of categories) {
    if (cat.match.some(k => lower.includes(k))) {
      tier3Terms = cat.terms;
      break;
    }
  }
  const tier3: SearchTier = { label: "broad niche", terms: tier3Terms };

  return [tier1, tier2, tier3];
}

function buildActorInput(platform: Platform, searchTerm: string): Record<string, unknown> {
  switch (platform) {
    case "TikTok":
      return { searchQueries: [searchTerm], maxItems: 25, shouldDownloadVideos: false };
    case "Instagram Reels":
      return { hashtags: [searchTerm.replace(/\s+/g, "")], resultsLimit: 25 };
    case "YouTube Shorts":
      return { searchKeywords: [searchTerm], maxResults: 25, type: "shorts" };
    case "Facebook Reels":
      return { searchQuery: searchTerm, maxPosts: 25 };
    default:
      return { searchQuery: searchTerm, maxItems: 25 };
  }
}

// Transcript fetch for Analyse mode
export async function fetchTranscript(url: string): Promise<{
  transcript: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const client = new ApifyClient({ token });

  // Detect platform from URL
  const platform = detectPlatformFromUrl(url);
  const actorId = ACTOR_IDS[platform];

  const input = buildTranscriptInput(platform, url);
  const run = await client.actor(actorId).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });

  if (!items.length) throw new Error("No data returned from Apify");

  const item = items[0] as Record<string, unknown>;
  return {
    transcript: String(item.transcript || item.subtitles || item.description || item.text || ""),
    views: Number(item.views || item.playCount || item.viewCount || 0),
    likes: Number(item.likes || item.likesCount || item.diggCount || 0),
    comments: Number(item.comments || item.commentsCount || 0),
    shares: Number(item.shares || item.sharesCount || 0),
  };
}

function detectPlatformFromUrl(url: string): Platform {
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("instagram.com")) return "Instagram Reels";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube Shorts";
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "Facebook Reels";
  return "TikTok";
}

function buildTranscriptInput(platform: Platform, url: string): Record<string, unknown> {
  switch (platform) {
    case "TikTok":
      return { postURLs: [url], shouldDownloadVideos: false, shouldDownloadSubtitles: true };
    case "Instagram Reels":
      return { directUrls: [url] };
    case "YouTube Shorts":
      return { startUrls: [{ url }], includeTranscripts: true };
    case "Facebook Reels":
      return { startUrls: [{ url }] };
    default:
      return { startUrls: [{ url }] };
  }
}
