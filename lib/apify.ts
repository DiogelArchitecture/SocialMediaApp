import { ApifyClient } from "apify-client";
import fs from "fs";
import path from "path";
import type { Platform } from "./build-prompt";

// On Vercel the project root is read-only — use /tmp for cache
const CACHE_DIR = process.env.VERCEL
  ? "/tmp/replanit-cache"
  : path.join(process.cwd(), "data", "cache");
const CACHE_TTL_DAYS = 7;

const ACTOR_IDS: Record<Platform, string[]> = {
  TikTok: ["clockworks/tiktok-scraper"],
  "Instagram Reels": ["apify/instagram-reel-scraper"],
  // "apify/youtube-scraper" has been renamed/maintained under streamers namespace on Apify.
  // Keep old id as a fallback for backwards compatibility across accounts/environments.
  "YouTube Shorts": ["streamers/youtube-scraper", "apify/youtube-scraper"],
  "Facebook Reels": ["apify/facebook-posts-scraper"],
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

// Fixed niche search term per platform — always the same regardless of script topic.
const NICHE_SEARCH_TERM: Record<Platform, string> = {
  "TikTok":           "home renovation UK",
  "Instagram Reels":  "homerenovation",
  "YouTube Shorts":   "home renovation UK",
  "Facebook Reels":   "home renovation UK",
};

// Apify actor hard timeout (seconds). Must be less than Vercel maxDuration.
const ACTOR_TIMEOUT_SECS = 55;

/**
 * Calls Apify's run-sync-get-dataset-items endpoint — one HTTP request that
 * starts the actor, waits for it to finish, and returns items inline.
 * Avoids the apify-client polling loop which gets killed by Vercel timeouts.
 */
async function runActorSync(
  actorId: string,
  input: Record<string, unknown>,
  token: string,
  timeoutSecs: number
): Promise<Record<string, unknown>[]> {
  // Apify API uses ~ instead of / in actor IDs
  const encodedId = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodedId}/run-sync-get-dataset-items?timeout=${timeoutSecs}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    // Node.js AbortSignal timeout — slightly longer than Apify-side timeout
    signal: AbortSignal.timeout((timeoutSecs + 10) * 1000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Apify ${actorId} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json() as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`Apify returned unexpected response shape for ${actorId}`);
  }
  return data;
}

function isActorNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("record-not-found") || msg.includes("Actor with this name was not found") || msg.includes("(404)");
}

async function runActorSyncWithFallback(
  actorIds: string[],
  input: Record<string, unknown>,
  token: string,
  timeoutSecs: number,
  onProgress?: (msg: string) => void
): Promise<{ actorId: string; items: Record<string, unknown>[] }> {
  let lastError: unknown;

  for (const actorId of actorIds) {
    try {
      const items = await runActorSync(actorId, input, token, timeoutSecs);
      return { actorId, items };
    } catch (err) {
      lastError = err;
      if (!isActorNotFoundError(err)) throw err;
      onProgress?.(`Actor "${actorId}" not found. Trying fallback...`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All candidate Apify actors failed");
}

export async function scrapeContent(
  platform: Platform,
  keyword: string,         // kept for cache key / display — NOT used as Apify search term
  forceFresh = false,
  onProgress?: (msg: string) => void
): Promise<ScrapedPost[]> {
  const cacheKey = getCacheKey(platform, "renovation-niche");
  const cachePath = getCachePath(cacheKey);

  if (!forceFresh && isCacheValid(cachePath)) {
    onProgress?.("Using cached niche data...");
    const cached = readCache(cachePath);
    if (cached) return cached;
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const actorIds = ACTOR_IDS[platform];
  const searchTerm = NICHE_SEARCH_TERM[platform] ?? "home renovation UK";

  onProgress?.(`Searching ${platform}: "${searchTerm}"...`);

  const input = buildActorInput(platform, searchTerm);
  let rawItems: Record<string, unknown>[] = [];
  try {
    const result = await runActorSyncWithFallback(actorIds, input, token, ACTOR_TIMEOUT_SECS, onProgress);
    rawItems = result.items;
    onProgress?.(`Using actor: ${result.actorId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onProgress?.(`Actor error: ${msg.slice(0, 120)}`);
    throw err; // re-throw so the route can surface a meaningful error
  }

  const posts = rawItems
    .map((item) => normalisePost(item, platform))
    .filter((p) => (p.views ?? 0) > 0);

  onProgress?.(`${posts.length} posts returned`);

  const seen = new Set<string>();
  const top20 = posts
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
      return { searchQueries: [searchTerm], maxItems: 20, shouldDownloadVideos: false };
    case "Instagram Reels":
      return { hashtags: [searchTerm.replace(/\s+/g, "")], resultsLimit: 20 };
    case "YouTube Shorts":
      // apify/youtube-scraper input schema
      return {
        searchKeywords: searchTerm,
        maxResults: 20,
        maxResultsShorts: 20,
        shouldDownloadVideos: false,
        shouldDownloadSubtitles: false,
      };
    case "Facebook Reels":
      return { searchQuery: searchTerm, maxPosts: 20 };
    default:
      return { searchQuery: searchTerm, maxItems: 20 };
  }
}

// ── Transcript fetch for Analyse mode ────────────────────────────────────────

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

  const platform = detectPlatformFromUrl(url);
  const actorIds = ACTOR_IDS[platform];

  const input = buildTranscriptInput(platform, url);
  let run: Awaited<ReturnType<ReturnType<typeof client.actor>["call"]>> | null = null;
  let lastError: unknown;
  for (const actorId of actorIds) {
    try {
      run = await client.actor(actorId).call(input);
      break;
    } catch (err) {
      lastError = err;
      if (!isActorNotFoundError(err)) throw err;
    }
  }
  if (!run) {
    throw lastError instanceof Error ? lastError : new Error("No valid Apify actor found for transcript fetch");
  }
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
