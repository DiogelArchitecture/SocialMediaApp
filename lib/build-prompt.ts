export type Platform = "TikTok" | "Instagram Reels" | "YouTube Shorts" | "Facebook Reels";
export type Duration = "15s" | "30s" | "45s" | "60s";
export type Audience = "First-time renovator" | "Experienced homeowner" | "Investor";
export type HookStyle = "Auto" | "Inverse" | "Disruption" | "Question" | "Stat-led";
export type Tone = "High energy" | "Calm authority" | "Comedic" | "Urgent";

export interface Toggles {
  viralCut: boolean;
  shotList: boolean;
  propsList: boolean;
  editNotes: boolean;
  vfxIdeas: boolean;
  packagingIdeas: boolean;
  scrapeFresh: boolean;
  equipment: boolean;
  filmingTips: boolean;
  caption: boolean;
}

export interface HookSource {
  text: string;
  pattern_type: string;
  avg_er: number;
  sample_count: number;
  // Source video data — present when scraped via Apify
  source_url?: string;
  source_platform?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  scraped_from?: string; // search term that surfaced this video
}

export interface PatternData {
  hooks: Array<HookSource>;
  ctas: Array<{ phrase: string; type: "soft" | "hard" | "curiosity"; signal: string }>;
  formats: Array<{ description: string; structure: string }>;
  scrapedAt?: string;
  platform?: string;
}

export interface SelectedConcept {
  id: string;
  title: string;
  belief: string;
  hook: string;
  premise: string;
  format: string;
  cta: "soft" | "hard" | "curiosity";
}

export interface BuildPromptParams {
  topic: string;
  platform: Platform;
  duration: Duration;
  location: string;
  audience?: Audience;
  hookStyle?: HookStyle;
  tone?: Tone;
  toggles: Toggles;
  patterns?: PatternData | null;
  mode: "quick" | "forge";
  selectedConcept?: SelectedConcept | null;
  ctaOverride?: { type: string; phrase: string } | null;
}

export function buildUserPrompt(params: BuildPromptParams): string {
  const { topic, platform, duration, location, audience, hookStyle, tone, toggles, patterns, mode, selectedConcept, ctaOverride } = params;

  let prompt = "";

  // Patterns block
  if (patterns && (patterns.hooks.length > 0 || patterns.ctas.length > 0 || patterns.formats.length > 0)) {
    const dateStr = patterns.scrapedAt ? new Date(patterns.scrapedAt).toLocaleDateString("en-GB") : "cached";
    prompt += `REAL-WORLD INTELLIGENCE — ${patterns.platform || platform}, home renovation niche, scraped ${dateStr}:\n\n`;

    if (patterns.hooks.length > 0) {
      prompt += `Top-performing hooks (by engagement rate):\n`;
      patterns.hooks.slice(0, 5).forEach((h) => {
        prompt += `- "${h.text}" — ER: ${(h.avg_er * 100).toFixed(1)}%, n=${h.sample_count}\n`;
      });
      prompt += "\n";
    }

    if (patterns.ctas.length > 0) {
      prompt += `CTAs currently driving comments/saves:\n`;
      patterns.ctas.slice(0, 4).forEach((c) => {
        prompt += `- "${c.phrase}" — type: ${c.type}\n`;
      });
      prompt += "\n";
    }

    if (patterns.formats.length > 0) {
      prompt += `Structural formats that are landing:\n`;
      patterns.formats.slice(0, 3).forEach((f) => {
        prompt += `- ${f.description}\n`;
      });
      prompt += "\n";
    }
  } else {
    prompt += `No fresh scrape data available. Use the built-in format library and your knowledge of high-performing UK home renovation content.\n\n`;
  }

  // Core brief
  prompt += `SCRIPT BRIEF:\n`;
  prompt += `Topic: ${topic}\n`;
  prompt += `Platform: ${platform}\n`;
  prompt += `Target duration: ${duration}\n`;
  prompt += `Shooting location: ${location}\n`;
  prompt += `Use this location to ground all prop and visual suggestions in what is physically available at: ${location}.\n`;

  if (mode === "forge") {
    if (audience) prompt += `Target audience: ${audience}\n`;
    if (hookStyle && hookStyle !== "Auto") prompt += `Hook style: ${hookStyle}\n`;
    if (tone) prompt += `Tone: ${tone}\n`;
  }

  prompt += "\n";

  // Selected concept (from pipeline step 3)
  if (selectedConcept) {
    prompt += `SELECTED CONCEPT — use this as the creative backbone for the script:\n`;
    prompt += `Title: ${selectedConcept.title}\n`;
    prompt += `Format: ${selectedConcept.format}\n`;
    prompt += `Opening hook line: "${selectedConcept.hook}"\n`;
    prompt += `Belief this challenges: ${selectedConcept.belief}\n`;
    prompt += `Premise / structure: ${selectedConcept.premise}\n`;
    prompt += `CTA type: ${selectedConcept.cta}\n`;
    prompt += `Build the full script from this concept. Keep the hook line verbatim or as close as possible.\n\n`;
  }

  // CTA override
  if (ctaOverride?.phrase) {
    prompt += `CTA OVERRIDE — use this exact phrase as the final CTA, do not paraphrase:\n"${ctaOverride.phrase}"\n\n`;
  }

  // Toggle instructions
  if (toggles.packagingIdeas) {
    prompt += `Include 3 packaging ideas (title + text hook) in the ===PACKAGING=== section.\n`;
  } else {
    prompt += `Do not include a ===PACKAGING=== section.\n`;
  }

  if (!toggles.viralCut) {
    prompt += `Do not generate the viral cut version. Omit the ===VIRAL CUT=== section.\n`;
  }

  if (!toggles.shotList) {
    prompt += `Do not include a ===SHOT LIST=== section.\n`;
  }

  if (!toggles.propsList) {
    prompt += `Do not include a ===PROPS=== section.\n`;
  }

  if (!toggles.editNotes) {
    prompt += `Do not include an ===EDIT NOTES=== section.\n`;
  }

  if (toggles.vfxIdeas) {
    prompt += `Include a ===VFX=== section with specific VFX moments and briefs for an editor.\n`;
  } else {
    prompt += `Do not include a ===VFX=== section.\n`;
  }

  if (toggles.equipment) {
    prompt += `Include an ===EQUIPMENT=== section after the shot list with Camera, Audio, and Other (only if genuinely needed) recommendations specific to the shooting location.\n`;
  } else {
    prompt += `Do not include an ===EQUIPMENT=== section.\n`;
  }

  if (toggles.filmingTips) {
    prompt += `Include a ===FILMING TIPS=== section with 3-5 practical, location-specific bullets referencing actual shots from the shot list.\n`;
  } else {
    prompt += `Do not include a ===FILMING TIPS=== section.\n`;
  }

  if (toggles.caption) {
    prompt += `Include a ===CAPTION=== section at the end: platform-native social caption, hook line, 2-3 body lines, relevant UK renovation hashtags. Max 200 words.\n`;
  } else {
    prompt += `Do not include a ===CAPTION=== section.\n`;
  }

  prompt += `\nNow generate the script. Build on the patterns above — do not invent. Target duration: ${duration}.`;

  return prompt;
}
