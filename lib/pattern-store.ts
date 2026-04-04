import fs from "fs";
import path from "path";
import type { Platform } from "./build-prompt";
import type { PatternData } from "./build-prompt";

const PATTERNS_DIR = path.join(process.cwd(), "data", "patterns");
const FORMATS_DIR = path.join(process.cwd(), "data", "formats");

export interface FormatEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  structure: string;
  example_hook: string;
  er_range: string;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function patternFilePath(platform: Platform, niche: string): string {
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const platformSlug = platform.toLowerCase().replace(/\s+/g, "-");
  return path.join(PATTERNS_DIR, `${platformSlug}-${slug}.json`);
}

export function readPatterns(platform: Platform, niche: string): PatternData | null {
  const filePath = patternFilePath(platform, niche);
  if (!fs.existsSync(filePath)) {
    // Try generic patterns file
    const genericPath = path.join(PATTERNS_DIR, "seed-patterns.json");
    if (fs.existsSync(genericPath)) {
      try {
        const raw = fs.readFileSync(genericPath, "utf-8");
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writePatterns(platform: Platform, niche: string, data: PatternData): void {
  ensureDir(PATTERNS_DIR);
  const filePath = patternFilePath(platform, niche);

  let existing: PatternData = { hooks: [], ctas: [], formats: [], scrapedAt: new Date().toISOString(), platform };

  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      // use defaults
    }
  }

  // Merge — add new, avoid duplicates by text
  const mergeHooks = [...existing.hooks];
  for (const hook of data.hooks) {
    if (!mergeHooks.some((h) => h.text === hook.text)) mergeHooks.push(hook);
  }

  const mergeCtas = [...existing.ctas];
  for (const cta of data.ctas) {
    if (!mergeCtas.some((c) => c.phrase === cta.phrase)) mergeCtas.push(cta);
  }

  const mergeFormats = [...existing.formats];
  for (const fmt of data.formats) {
    if (!mergeFormats.some((f) => f.description === fmt.description)) mergeFormats.push(fmt);
  }

  const merged: PatternData = {
    hooks: mergeHooks,
    ctas: mergeCtas,
    formats: mergeFormats,
    scrapedAt: new Date().toISOString(),
    platform,
  };

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");
}

export function listAllPatterns(): Array<{ platform: Platform; niche: string; data: PatternData }> {
  ensureDir(PATTERNS_DIR);
  const files = fs.readdirSync(PATTERNS_DIR).filter((f) => f.endsWith(".json"));
  const results = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(PATTERNS_DIR, file), "utf-8");
      const data = JSON.parse(raw) as PatternData;
      const [platformSlug, ...nicheParts] = file.replace(".json", "").split("-");
      const platform = slugToPlatform(platformSlug) ?? "TikTok";
      const niche = nicheParts.join(" ");
      results.push({ platform, niche, data });
    } catch {
      // skip corrupt files
    }
  }

  return results;
}

function slugToPlatform(slug: string): Platform | null {
  const map: Record<string, Platform> = {
    tiktok: "TikTok",
    instagram: "Instagram Reels",
    youtube: "YouTube Shorts",
    facebook: "Facebook Reels",
  };
  return map[slug] ?? null;
}

export function readFormats(): FormatEntry[] {
  const filePath = path.join(FORMATS_DIR, "seed-formats.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
