export interface ParsedOutput {
  // Short-form
  hook?: string;
  belief?: string;
  packaging?: string;
  script?: string;
  shotList?: string;
  props?: string;
  viralCut?: string;
  editNotes?: string;
  vfx?: string;
  equipment?: string;
  filmingTips?: string;
  caption?: string;
  // Long-form (YouTube)
  intro?: string;
  body?: string;
  payoff?: string;
  youtubeCta?: string;
  thumbnail?: string;
  chapterMarkers?: string;
  raw: string;
}

const DELIMITERS = [
  "===HOOK===",
  "===BELIEF===",
  "===PACKAGING===",
  "===SCRIPT===",
  "===SHOT LIST===",
  "===PROPS===",
  "===VIRAL CUT===",
  "===EDIT NOTES===",
  "===VFX===",
  "===EQUIPMENT===",
  "===FILMING TIPS===",
  "===CAPTION===",
  "===INTRO===",
  "===BODY===",
  "===PAYOFF===",
  "===YOUTUBE CTA===",
  "===THUMBNAIL===",
  "===CHAPTER MARKERS===",
] as const;

const KEY_MAP: Record<string, keyof Omit<ParsedOutput, "raw">> = {
  "===HOOK===":            "hook",
  "===BELIEF===":          "belief",
  "===PACKAGING===":       "packaging",
  "===SCRIPT===":          "script",
  "===SHOT LIST===":       "shotList",
  "===PROPS===":           "props",
  "===VIRAL CUT===":       "viralCut",
  "===EDIT NOTES===":      "editNotes",
  "===VFX===":             "vfx",
  "===EQUIPMENT===":       "equipment",
  "===FILMING TIPS===":    "filmingTips",
  "===CAPTION===":         "caption",
  "===INTRO===":           "intro",
  "===BODY===":            "body",
  "===PAYOFF===":          "payoff",
  "===YOUTUBE CTA===":     "youtubeCta",
  "===THUMBNAIL===":       "thumbnail",
  "===CHAPTER MARKERS===": "chapterMarkers",
};

export function parseOutput(raw: string): ParsedOutput {
  const result: ParsedOutput = { raw };
  const delimPattern = DELIMITERS.map((d) => d.replace(/=/g, "\\=")).join("|");
  const regex = new RegExp(`(${delimPattern})`, "g");
  const parts = raw.split(regex).map((s) => s.trim()).filter(Boolean);

  let currentKey: keyof Omit<ParsedOutput, "raw"> | null = null;
  for (const part of parts) {
    if (KEY_MAP[part]) {
      currentKey = KEY_MAP[part];
    } else if (currentKey) {
      result[currentKey] = part;
      currentKey = null;
    }
  }
  return result;
}

export function parseStreamingOutput(raw: string): ParsedOutput {
  return parseOutput(raw);
}

export type SectionKey = keyof Omit<ParsedOutput, "raw">;

export const SECTION_LABELS: Record<SectionKey, string> = {
  // Short-form
  hook:         "Hook",
  belief:       "Belief Being Challenged",
  packaging:    "Packaging Ideas",
  script:       "Script",
  shotList:     "Shot List",
  equipment:    "Equipment",
  filmingTips:  "Filming Tips",
  props:        "Props List",
  viralCut:     "Viral Cut",
  editNotes:    "Edit Notes",
  vfx:          "VFX / AI Overlay Ideas",
  caption:      "Caption",
  // Long-form
  intro:         "Intro (0:30–1:30)",
  body:          "Body Script",
  payoff:        "Payoff",
  youtubeCta:    "YouTube CTA",
  thumbnail:     "Thumbnail Concepts",
  chapterMarkers: "Chapter Markers",
};

export const SECTION_ORDER: SectionKey[] = [
  "hook",
  "belief",
  "script",
  "shotList",
  "equipment",
  "filmingTips",
  "packaging",
  "props",
  "viralCut",
  "editNotes",
  "vfx",
  "caption",
];

export const SECTION_ORDER_LONGFORM: SectionKey[] = [
  "hook",
  "belief",
  "intro",
  "body",
  "payoff",
  "shotList",
  "equipment",
  "filmingTips",
  "youtubeCta",
  "thumbnail",
  "chapterMarkers",
];
