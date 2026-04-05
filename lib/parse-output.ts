export interface ParsedOutput {
  hook?: string;
  belief?: string;
  packaging?: string;
  script?: string;
  shotList?: string;
  props?: string;
  viralCut?: string;
  editNotes?: string;
  vfx?: string;
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
] as const;

const KEY_MAP: Record<string, keyof Omit<ParsedOutput, "raw">> = {
  "===HOOK===": "hook",
  "===BELIEF===": "belief",
  "===PACKAGING===": "packaging",
  "===SCRIPT===": "script",
  "===SHOT LIST===": "shotList",
  "===PROPS===": "props",
  "===VIRAL CUT===": "viralCut",
  "===EDIT NOTES===": "editNotes",
  "===VFX===": "vfx",
};

export function parseOutput(raw: string): ParsedOutput {
  const result: ParsedOutput = { raw };

  // Build regex that splits on any delimiter
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
  // Same as parseOutput but tolerates incomplete final section
  return parseOutput(raw);
}

export type SectionKey = keyof Omit<ParsedOutput, "raw">;

export const SECTION_LABELS: Record<SectionKey, string> = {
  hook: "Hook",
  belief: "Belief Being Challenged",
  packaging: "Packaging Ideas",
  script: "Script",
  shotList: "Shot List",
  props: "Props List",
  viralCut: "Viral Cut",
  editNotes: "Edit Notes",
  vfx: "VFX / AI Overlay Ideas",
};

export const SECTION_ORDER: SectionKey[] = [
  "hook",
  "belief",
  "script",
  "shotList",
  "packaging",
  "props",
  "viralCut",
  "editNotes",
  "vfx",
];
