export type Platform = "TikTok" | "Instagram Reels" | "YouTube Shorts" | "Facebook Reels" | "YouTube";
export type Duration = "15s" | "30s" | "45s" | "60s";
export type LongFormDuration = "5min" | "10min" | "15min" | "20min";
export type AnyDuration = Duration | LongFormDuration;
export type Audience = "First-time renovator" | "Experienced homeowner" | "Investor";
export type HookStyle = "Auto" | "Inverse" | "Disruption" | "Question" | "Stat-led";
export type Tone = "High energy" | "Calm authority" | "Comedic" | "Urgent";

export function isLongFormPlatform(p: Platform): boolean {
  return p === "YouTube";
}

export function isLongFormDuration(d: AnyDuration): d is LongFormDuration {
  return ["5min", "10min", "15min", "20min"].includes(d);
}

const LONGFORM_WORD_COUNT: Record<LongFormDuration, number> = {
  "5min":  750,
  "10min": 1500,
  "15min": 2250,
  "20min": 3000,
};

export interface Toggles {
  // Short-form
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
  // Long-form (YouTube)
  chapterMarkers: boolean;
  youtubeCta: boolean;
}

export interface HookSource {
  text: string;
  pattern_type: string;
  avg_er: number;
  sample_count: number;
  source_url?: string;
  source_platform?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  scraped_from?: string;
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
  duration: AnyDuration;
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

// ─── Shared: pattern block ────────────────────────────────────────────────────

function buildPatternBlock(params: BuildPromptParams, longForm = false): string {
  const { patterns, platform } = params;
  if (patterns && (patterns.hooks.length > 0 || patterns.ctas.length > 0 || patterns.formats.length > 0)) {
    const dateStr = patterns.scrapedAt ? new Date(patterns.scrapedAt).toLocaleDateString("en-GB") : "cached";
    const label = longForm ? "long-form YouTube" : `${patterns.platform || platform}, home renovation niche`;
    let block = `REAL-WORLD INTELLIGENCE — ${label}, scraped ${dateStr}:\n\n`;

    if (patterns.hooks.length > 0) {
      block += `Top-performing hooks (by engagement rate):\n`;
      patterns.hooks.slice(0, 5).forEach((h) => {
        block += `- "${h.text}" — ER: ${(h.avg_er * 100).toFixed(1)}%, n=${h.sample_count}\n`;
      });
      block += "\n";
    }
    if (patterns.ctas.length > 0) {
      block += `CTAs currently driving comments/saves:\n`;
      patterns.ctas.slice(0, 4).forEach((c) => {
        block += `- "${c.phrase}" — type: ${c.type}\n`;
      });
      block += "\n";
    }
    if (patterns.formats.length > 0) {
      block += `Structural formats that are landing:\n`;
      patterns.formats.slice(0, 3).forEach((f) => {
        block += `- ${f.description}\n`;
      });
      block += "\n";
    }
    return block;
  }
  return `No fresh scrape data available. Use the built-in format library and your knowledge of high-performing UK home renovation content.\n\n`;
}

// ─── Short-form prompt ────────────────────────────────────────────────────────

export function buildUserPrompt(params: BuildPromptParams): string {
  const { topic, platform, duration, location, audience, hookStyle, tone, toggles, mode, selectedConcept, ctaOverride } = params;

  let prompt = buildPatternBlock(params);

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

  if (ctaOverride?.phrase) {
    prompt += `CTA OVERRIDE — use this exact phrase as the final CTA, do not paraphrase:\n"${ctaOverride.phrase}"\n\n`;
  }

  if (toggles.packagingIdeas) {
    prompt += `Include 3 packaging ideas (title + text hook) in the ===PACKAGING=== section.\n`;
  } else {
    prompt += `Do not include a ===PACKAGING=== section.\n`;
  }
  if (!toggles.viralCut)     prompt += `Do not generate the viral cut version. Omit the ===VIRAL CUT=== section.\n`;
  if (!toggles.shotList)     prompt += `Do not include a ===SHOT LIST=== section.\n`;
  if (!toggles.propsList)    prompt += `Do not include a ===PROPS=== section.\n`;
  if (!toggles.editNotes)    prompt += `Do not include an ===EDIT NOTES=== section.\n`;
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

// ─── Long-form prompt (YouTube) ───────────────────────────────────────────────

export function buildLongFormPrompt(params: BuildPromptParams): string {
  const { topic, location, audience, tone, toggles, mode, selectedConcept, duration } = params;

  const dur = duration as LongFormDuration;
  const wordCount = LONGFORM_WORD_COUNT[dur] ?? 1500;
  const readTime = dur.replace("min", " min");

  let prompt = buildPatternBlock(params, true);

  prompt += `LONG-FORM YOUTUBE SCRIPT BRIEF:\n`;
  prompt += `Topic: ${topic}\n`;
  prompt += `Platform: YouTube (long-form)\n`;
  prompt += `Target duration: ${readTime} (${wordCount} words at 150 WPM)\n`;
  prompt += `Shooting location: ${location}\n`;

  if (mode === "forge") {
    if (audience) prompt += `Target audience: ${audience}\n`;
    if (tone) prompt += `Tone: ${tone}\n`;
  }

  prompt += "\n";

  if (selectedConcept) {
    prompt += `SELECTED CONCEPT — use as the creative backbone:\n`;
    prompt += `Title: ${selectedConcept.title}\n`;
    prompt += `Format: ${selectedConcept.format}\n`;
    prompt += `Opening hook line: "${selectedConcept.hook}"\n`;
    prompt += `Belief challenged: ${selectedConcept.belief}\n`;
    prompt += `3-phase arc: ${selectedConcept.premise}\n\n`;
  }

  prompt += `OUTPUT FORMAT — produce ALL of the following sections in this exact order:\n\n`;

  prompt += `===HOOK===\n`;
  prompt += `The single opening line. Must clear in 8 seconds — this decides whether the viewer stays or leaves.\n`;
  prompt += `No preamble. No "Hey guys". No "Welcome back". Get to the value in the first word.\n`;
  prompt += `Choose one hook type: Results-Reveal / Story-Tease / Bold-Claim / Question Hook / In Media Res.\n\n`;

  prompt += `===BELIEF===\n`;
  prompt += `The commonly held belief this video challenges (1 sentence).\n\n`;

  prompt += `===INTRO===\n`;
  prompt += `0:30–1:30 of the video (~150 words). Establish what the viewer will know by the end.\n`;
  prompt += `Include a structural promise: "By the end of this..." or equivalent.\n`;
  prompt += `Plant 1–2 open loops — questions or tensions that will only be resolved in the payoff. Do not deliver the payoff here.\n\n`;

  prompt += `===BODY===\n`;
  prompt += `The main content — target ${wordCount - 400} words for this section.\n`;
  prompt += `Insert a [INTERRUPT] marker every 60–90 seconds of speaking content.\n`;
  prompt += `Each interrupt must be formatted as: [INTERRUPT: Type — specific action]\n`;
  prompt += `Valid interrupt types: Camera Angle Change | B-Roll | Vocal Dynamics | Environmental Change | Direct Question\n`;
  prompt += `The interrupt must change the sensory register — not just the topic.\n`;
  prompt += `Write the full spoken script here, not bullet points or summaries.\n\n`;

  prompt += `===PAYOFF===\n`;
  prompt += `Final ~150 words. Close every open loop planted in the Intro. Deliver the promised resolution.\n`;
  prompt += `End with a clean beat of resolution before the CTA — never blur into the CTA without a pause.\n\n`;

  prompt += `===YOUTUBE CTA===\n`;
  prompt += `Three elements on separate lines:\n`;
  prompt += `1. Subscribe prompt (one sentence, give a reason — not just "hit subscribe")\n`;
  prompt += `2. Comment prompt (create personal stake or curiosity — e.g. "What's your extension budget? Drop it below.")\n`;
  prompt += `3. Next video suggestion (one sentence pointing to a related topic that deepens this one)\n\n`;

  prompt += `===THUMBNAIL===\n`;
  prompt += `2–3 thumbnail concepts. Format each as:\n`;
  prompt += `[Face expression if on-camera] — [Bold text overlay, max 4 words] — [Background or context element]\n`;
  prompt += `The text overlay is the scroll-stopper. It must create a curiosity gap or a strong claim.\n\n`;

  if (toggles.chapterMarkers) {
    prompt += `===CHAPTER MARKERS===\n`;
    prompt += `Timestamped chapter list for the YouTube description. Format: MM:SS — Chapter Title\n`;
    prompt += `First entry must be 0:00. One chapter every 2–3 minutes. Titles must match actual content.\n\n`;
  } else {
    prompt += `Do not include a ===CHAPTER MARKERS=== section.\n\n`;
  }

  if (toggles.shotList) {
    prompt += `===SHOT LIST===\n`;
    prompt += `Numbered shots with VISUAL, AUDIO, and TEXT fields. Keep to key shots only — this is a 5–20 min video, so focus on establishing shots and key visual moments.\n\n`;
  } else {
    prompt += `Do not include a ===SHOT LIST=== section.\n\n`;
  }

  if (toggles.equipment) {
    prompt += `===EQUIPMENT===\n`;
    prompt += `Camera, Audio, Other (only if genuinely needed) — specific to shooting location: ${location}.\n\n`;
  } else {
    prompt += `Do not include an ===EQUIPMENT=== section.\n\n`;
  }

  if (toggles.filmingTips) {
    prompt += `===FILMING TIPS===\n`;
    prompt += `3–5 practical, location-specific bullets. Reference specific moments in the script.\n\n`;
  } else {
    prompt += `Do not include a ===FILMING TIPS=== section.\n\n`;
  }

  prompt += `Write the full script. Hit the word count target of ${wordCount} words across Hook + Intro + Body + Payoff. Do not truncate.`;

  return prompt;
}
