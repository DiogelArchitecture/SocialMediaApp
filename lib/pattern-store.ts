import fs from "fs";
import path from "path";
import type { Platform } from "./build-prompt";
import type { PatternData } from "./build-prompt";

// Reads always come from committed files; writes go to /tmp on Vercel (ephemeral but no errors)
const PATTERNS_DIR_READ = path.join(process.cwd(), "data", "patterns");
const PATTERNS_DIR_WRITE = process.env.VERCEL
  ? "/tmp/replanit-patterns"
  : path.join(process.cwd(), "data", "patterns");
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

function patternFilePathRead(platform: Platform, niche: string): string {
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const platformSlug = platform.toLowerCase().replace(/\s+/g, "-");
  return path.join(PATTERNS_DIR_READ, `${platformSlug}-${slug}.json`);
}

function patternFilePathWrite(platform: Platform, niche: string): string {
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const platformSlug = platform.toLowerCase().replace(/\s+/g, "-");
  return path.join(PATTERNS_DIR_WRITE, `${platformSlug}-${slug}.json`);
}

export function readPatterns(platform: Platform, niche: string): PatternData | null {
  const filePath = patternFilePathRead(platform, niche);
  if (!fs.existsSync(filePath)) {
    // Fall back to seed patterns
    const genericPath = path.join(PATTERNS_DIR_READ, "seed-patterns.json");
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
  try {
    ensureDir(PATTERNS_DIR_WRITE);
    const filePath = patternFilePathWrite(platform, niche);

    let existing: PatternData = { hooks: [], ctas: [], formats: [], scrapedAt: new Date().toISOString(), platform };

    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch {
        // use defaults
      }
    }

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
  } catch {
    // Silently fail on read-only filesystems — patterns just won't persist
  }
}

export function listAllPatterns(): Array<{ platform: Platform; niche: string; data: PatternData }> {
  const results = [];

  // Always read from committed files
  try {
    const files = fs.readdirSync(PATTERNS_DIR_READ).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(PATTERNS_DIR_READ, file), "utf-8");
        const data = JSON.parse(raw) as PatternData;
        const [platformSlug, ...nicheParts] = file.replace(".json", "").split("-");
        const platform = slugToPlatform(platformSlug) ?? "TikTok";
        const niche = nicheParts.join(" ");
        results.push({ platform, niche, data });
      } catch {
        // skip corrupt files
      }
    }
  } catch {
    // directory may not exist yet
  }

  return results;
}

function slugToPlatform(slug: string): Platform | null {
  const map: Record<string, Platform> = {
    tiktok:           "TikTok",
    instagram:        "Instagram Reels",
    "youtube-shorts": "YouTube Shorts",
    youtube:          "YouTube",
    facebook:         "Facebook Reels",
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
