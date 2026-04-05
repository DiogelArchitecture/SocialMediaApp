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

// Fixed niche terms — always scraped for renovation pattern intelligence regardless of topic.
// The topic is used for script generation, NOT for what we search on TikTok.
const NICHE_SEARCH_TERMS: Record<Platform, string[]> = {
  "TikTok":           ["home renovation UK", "house extension UK", "planning permission UK"],
  "Instagram Reels":  ["homerenovation", "houseextension", "planningpermission"],
  "YouTube Shorts":   ["home renovation UK", "house extension tips", "planning permission UK"],
  "Facebook Reels":   ["home renovation UK", "house extension UK", "planning permission UK"],
};

export async function scrapeContent(
  platform: Platform,
  keyword: string,         // kept for cache key / display — NOT used as search term
  forceFresh = false,
  onProgress?: (msg: string) => void
): Promise<ScrapedPost[]> {
  // Cache is keyed to the platform + niche (not the specific topic)
  const cacheKey = getCacheKey(platform, "renovation-niche");
  const cachePath = getCachePath(cacheKey);

  if (!forceFresh && isCacheValid(cachePath)) {
    onProgress?.("Using cached niche data...");
    const cached = readCache(cachePath);
    if (cached) return cached;
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const client = new ApifyClient({ token });
  const actorId = ACTOR_IDS[platform];
  const searchTerms = NICHE_SEARCH_TERMS[platform] ?? ["home renovation UK"];

  let allPosts: ScrapedPost[] = [];

  for (const term of searchTerms) {
    onProgress?.(`Scraping "${term}"...`);
    try {
      const input = buildActorInput(platform, term);
      const run = await client.actor(actorId).call(input);
      const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 50 });

      const posts = (items as Record<string, unknown>[])
        .map((item) => normalisePost(item, platform))
        .filter((p) => (p.views ?? 0) > 0);

      allPosts = allPosts.concat(posts);
      onProgress?.(`Found ${posts.length} posts for "${term}"`);
    } catch (err) {
      console.error(`Apify scrape failed for term "${term}":`, err);
      onProgress?.(`Failed for "${term}" — continuing...`);
    }
  }

  // Deduplicate and sort by ER
  const seen = new Set<string>();
  const top20 = allPosts
    .filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
    .slice(0, 20);

  if (top20.length > 0) {
    writeCache(cachePath, top20);
  }
  onProgress?.(`Done — ${top20.length} posts collected.`);
  return top20;
}

function buildActorInput(platform: Platform, searchTerm: string): Record<string, unknown> {
  switch (platform) {
    case "TikTok":
      return { searchQueries: [searchTerm], maxItems: 30, shouldDownloadVideos: false };
    case "Instagram Reels":
      return { hashtags: [searchTerm.replace(/\s+/g, "")], resultsLimit: 30 };
    case "YouTube Shorts":
      return { searchKeywords: [searchTerm], maxResults: 30, type: "shorts" };
    case "Facebook Reels":
      return { searchQuery: searchTerm, maxPosts: 30 };
    default:
      return { searchQuery: searchTerm, maxItems: 30 };
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
