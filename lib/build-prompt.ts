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
  // Mode overrides
  boardGameMode: boolean;
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
  context?: string;
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

// ─── Context block ────────────────────────────────────────────────────────────

function buildContextBlock(context: string | undefined): string {
  if (!context?.trim()) return "";
  return `CONTEXTUAL INTELLIGENCE — provided by Adam / Diogel team:\n\n${context.trim()}\n\nUse the intelligence above to ground the script in real situations, real client language, and real fears. Mirror verbatim phrases where they strengthen the hook or script. Do not invent situations that contradict the above.\n\n`;
}

// ─── Tone instructions ────────────────────────────────────────────────────────

function buildToneBlock(tone: Tone | undefined): string {
  if (!tone) return "";
  switch (tone) {
    case "Comedic":
      return `COMEDIC TONE — THIS CHANGES HOW THE SCRIPT IS WRITTEN

Adam's TOV is simultaneously serious and funny — the knowledge file states explicitly: "Humour is the mechanism for delivering serious points faster and with more emotional adhesion." For this script, lean hard into that dimension. The comedy IS the argument. Not decoration on top of it.

APPLY THESE TECHNIQUES WITH RENOVATION-SPECIFIC EXAMPLES:

1. RULE OF THREES — two straight items establish the pattern, the third breaks it with specificity and absurdity. The punchline always goes last.
   ✗ "It takes time, costs money, and causes stress."
   ✓ "It takes eight months, costs £12,000, and makes you genuinely consider a caravan."

2. SPECIFICITY IS THE JOKE — vague is never funny. Exact numbers and precise details are.
   ✗ "The council asks for a lot of documents."
   ✓ "The council asked for the original planning permission from 1987. The client wasn't born in 1987."

3. DEADPAN THE ABSURD — state the genuinely ridiculous as if it is completely normal. Never point at the joke.
   ✗ "Believe it or not, this actually happens!"
   ✓ "Six weeks became seven months. Nobody mentioned this would happen. Everyone was very surprised."

4. SELF-DEPRECATION — the industry, the system, or Adam takes the hit. Never the homeowner.
   ✓ "I have been doing this for twenty years. The planning system still surprises me. Not in good ways."

5. PAUSE BEAT — place an em dash (—) before the punchline to create the spoken pause.
   ✓ "They waited nine months for planning permission — for a conservatory."
   ✓ "The drawings were revised seventeen times — by the client, not us."

6. ESCALATING LIST — each item gets more specific and more absurd. Not just bad → worse → worst.
   ✓ "One call. One question. Six forms. Three departments. One councillor on holiday. No answer."

7. ANTI-CLIMACTIC RESOLUTION — set up something that sounds like it will be dramatic, end with something mundane.
   ✓ "After nine months of back-and-forth, two site visits, and one strongly-worded letter — they approved the window."

The serious lesson still lands. The comedy is how it gets there. Never explain the joke after it lands.\n\n`;
    case "High energy":
      return `HIGH ENERGY TONE — short punchy sentences. Frequent pattern interrupts. Every statement lands with conviction. No hedging. Use imperative verbs. Build to peaks rather than maintaining one flat level. Vary sentence length sharply: three short, then one long that earns its space.\n\n`;
    case "Calm authority":
      return `CALM AUTHORITY TONE — measured pace. Long sentences that explore, short sentences that anchor. Confidence comes from precision, not volume. State hard truths plainly without apology. No exclamation points. No hype. The viewer should feel they are talking to the most knowledgeable person in the room — who has no need to prove it.\n\n`;
    case "Urgent":
      return `URGENT TONE — every line creates forward motion. Something is at stake and the clock is running. Short sentences dominate. Avoid subordinate clauses that slow pace. Use "right now," "before," "while you still can" — only where genuinely true, never as manipulation.\n\n`;
    default:
      return "";
  }
}

// ─── Storytelling framework enforcement ───────────────────────────────────────

function buildShortFormStorytellingBlock(): string {
  return `STORYTELLING FRAMEWORK — apply the CARD model:
C (Context): 1–2 sentences. Ground the viewer in a specific situation — real setting, real person type, real moment. Use the Mirror technique: open with a feeling they are currently experiencing, not a fact. Make them feel seen first.
A (Adversity): The conflict — all three levels: External (the practical problem), Internal (the fear underneath), Philosophical (why it feels wrong or unfair). Where relevant, use the Misplaced Blame reframe: the problem is not them, it is the building/system asking too much of them.
R (Resolution): What changes or what the viewer now knows. Only state a resolution if known — never fabricate one. If unknown, the teaching moment is the resolution.
D (Takeaway): One clean sentence. The transferable lesson the viewer keeps.

The hook is the open loop. The payoff closes it. Never leave a promise in the hook undelivered.
Relive — do not report. Not "costs spiralled" — relive the phone call, the silence, the number on the screen.\n\n`;
}

function buildLongFormRulebookBlock(): string {
  return `YOUTUBE SCRIPTWRITING RULES — MANDATORY FOR THIS SCRIPT (long-form only):

RULE 1 — OBJECTIVE IS BEHAVIOUR CHANGE, NOT ENTERTAINMENT:
The script must cause the viewer to change one specific behaviour. State what that behaviour is before writing. If a viewer watches and does not act differently, the script has failed. Do not chase broad views — write for the homeowner who is actively considering a project.

RULE 2 — NARROW FOCUS, IDEAL CUSTOMER ONLY:
Write exclusively for the homeowner considering a UK renovation, extension, or planning project. Do not drift into broad lifestyle content. Every word serves the ideal customer, not a general audience.

RULE 3 — ASSUME NOTHING (COLD VIEWER):
Every viewer is a stranger. The PPP badge introduces Adam in Phase 1 — do not omit it. Never reference previous videos or assume prior knowledge. Every concept must be self-contained.

RULE 5 — SUBSTANCE OVER FLASH:
Strong language and clear messaging outperform production effects. Visual directives must use effective production only (text overlays, floor plan diagrams, data charts) — no distracting effects. Clarity over curiosity gaps: the hook must honestly reflect what the video delivers.

RULE 6 — SPCL INFLUENCE FRAMEWORK (weave throughout, not in separate sections):
- STATUS: Demonstrate control of scarce resources. Use specific numbers — 240+ planning applications per year, 40 homeowners a week, 200+ families helped annually. Numbers, volume, access.
- POWER: Every actionable point must be genuinely useful. If the viewer follows the advice, they get a real result. No withheld information. No artificial dependency.
- CREDIBILITY: Use specific data and tangible proof — real project outcomes, real numbers, real planning results. Never "many clients" — always "12 of the last 15 applications." Cannot be claimed, must be demonstrated.
- LIKENESS: Write in Adam's authentic voice using the TOV guide. His self-interruptions, everyday analogies, directness about difficulty — these are the trust mechanism. No corporate NPC script.

RULE 7 — ONLY SAY WHAT DIOGEL CAN SAY:
Every script must contain at least one data point, story, or insight that no other YouTube creator could produce. Generic advice any channel could give is a wasted line. Ask: could this have been written by anyone with a Google search? If yes, rewrite it.\n\n`;
}

function buildLongFormBodyStorytellingBlock(): string {
  return `BODY ARC — apply the Mirror Framework in this order (loaded in full in the knowledge files):

Stage 1 — THE MIRROR: Open with a feeling the viewer is currently experiencing. Not credentials, not statistics — a specific ordinary moment they recognise from their own life. Make them feel seen before you say anything useful. "We're very hard on ourselves, aren't we?" Test: a viewer alone on their sofa should feel spoken to directly.

Stage 2 — THE MISPLACED BLAME: Introduce a tactile, everyday analogy that removes guilt from the homeowner and places it on the building. They are not failing — they are using the wrong tool. The house was built for a different century's life. Use a physical, slightly absurd analogy (the shoes that fit someone else, the pot designed for a different meal, the fork and the soup). The viewer should exhale here.

Stage 3 — THE HISTORICAL GAP: One paragraph of expertise that explains WHY the mismatch exists. Victorian/Edwardian houses built for servants, coal fires, separate rooms, children seen not heard. Contrast with 2026 life: working from home, open-plan, connected families, multiple screens. Authority through context, not credentials.

Stage 4 — THE EPIPHANY: Reveal the solution is not what they thought. Square footage is not the cure — flow, sequence, light, and connection are. "You don't need a bigger house. You need a house that recognises who you've become." Stop them from solving the wrong problem. Give this space — do not rush past it.

Stage 5 — THE PROOF: One real client story. One specific change. One emotional result. Not a list — one example. "One of our clients..." The change should be surprisingly small (a corridor, a wall, a window). The result is emotional, not practical ("peace" not "more storage"). No names. No fabricated resolutions.

Stage 6 — THE INVITATION: Soft CTA. Never "book now." An invitation, not a close. "If this is hitting close to home — it might be worth having a conversation." Offer the Build, Wait or Move call as a door opening, not a pitch landing.

These six stages map to the three parts named in Phase 3 of the PPP opening. Each part should be signposted in spoken dialogue.\n\n`;
}

// ─── Hook sensory block ───────────────────────────────────────────────────────

function buildSeeHearReadBlock(): string {
  return `HOOK — FIRST 3 SECONDS (mandatory output at the top of every hook section):
Before writing any spoken dialogue, output these three fields as a labeled block:

WHAT THEY SEE: [precise visual — camera framing, subject position, action or movement in the first 3 seconds]
WHAT THEY HEAR: [the exact opening words as spoken, or ambient sound if pre-dialogue — what hits the ear first]
WHAT THEY READ: [any on-screen text overlay or caption that appears in the first 3 seconds — or "None"]

All three must reinforce the same emotional or intellectual punch. The brain processes See, Hear, and Read simultaneously — if any element contradicts or dilutes the others, the hook breaks. After this block, write the full spoken hook and continue the script.\n\n`;
}

// ─── Board Game Mode prompt block ─────────────────────────────────────────────

function buildBoardGameBlock(duration: AnyDuration): string {
  const durLabel = duration === "60s" ? "60s" : duration === "30s" ? "30s" : duration;
  return `BOARD GAME MODE — ACTIVE. This replaces all standard storytelling frameworks for this script.

The Diogel Board Game Framework (full rules loaded in knowledge files) applies. Summary:

STRUCTURE:
[0:00–0:10] BESPOKE HOOK — Open with the WHAT THEY SEE / WHAT THEY HEAR / WHAT THEY READ block (per the instruction above the script brief), then start mid-action on a completely unique, specific strategic blunder. No greeting ("Hello," "Hey guys"). No template phrasing. Fresh scenario every time, tied to this video's exact game mechanic.

[0:10–0:40] GAME MECHANICS — Stay entirely in the board game world. No houses, buildings, extensions, rooms, or any architectural reference. Explain the rulebook, the Game Master's limitations, why this move collapses the player's engine. Geek out. Use: Meeples, tokens, cardboard tiles, wooden resource blocks, map zones, strategic bottlenecks, expansion packs. PROHIBITED: video game refs (Tetris, NPCs, "levelling up"), sports refs (referees, fouls).

[0:40–0:55] HOMEOWNER PIVOT — Snap to real-world homeowner reality. Lead with: "And look, I speak to homeowners every day who are doing exactly this..." OR "And look, I see people making this exact play with their homes all the time." The real-world problem must EXACTLY mirror the board game analogy (hidden card → hidden planning condition; illegal placement → building without permitted development; blocked route → extension that kills light). Focus on Movement, Timeline, Friction — legal issues, chaotic routines, budgeting traps. Leave them educated, not hopeless.

[0:55–${durLabel === "60s" ? "1:00" : "end"}] THE MANTRA — End with exactly: "Simple. Smart. Sorted." Nothing after this. No CTA. No likes/follow/subscribe request. The authority is the sell.

TONE: Grade 3 UK English. Conversational, sharp, authoritative. Adam-isms ("Absurd," "Superb," "Obscene," "Rock'n'roll") only where they surface naturally — never forced. Transition markers ("Look...", "I mean...", "Ultimately...", "Basically...") used naturally.

DO NOT include a CTA of any kind. Override any CTA instructions for this script.\n\n`;
}

// ─── Short-form prompt ────────────────────────────────────────────────────────

export function buildUserPrompt(params: BuildPromptParams): string {
  const { topic, platform, duration, location, audience, hookStyle, tone, toggles, mode, selectedConcept, ctaOverride, context } = params;

  let prompt = buildContextBlock(context);
  prompt += buildPatternBlock(params);

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

  prompt += buildSeeHearReadBlock();

  if (toggles.boardGameMode) {
    prompt += buildBoardGameBlock(duration);
  } else {
    prompt += buildShortFormStorytellingBlock();
    if (mode === "forge" && tone) prompt += buildToneBlock(tone);
  }

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
  const { topic, location, audience, tone, toggles, mode, selectedConcept, duration, context, ctaOverride } = params;

  const dur = duration as LongFormDuration;
  const wordCount = LONGFORM_WORD_COUNT[dur] ?? 1500;
  const readTime = dur.replace("min", " min");

  let prompt = buildContextBlock(context);
  prompt += buildPatternBlock(params, true);

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
  prompt += buildLongFormRulebookBlock();
  prompt += buildLongFormBodyStorytellingBlock();
  if (mode === "forge" && tone) prompt += buildToneBlock(tone);

  if (selectedConcept) {
    prompt += `SELECTED CONCEPT — use as the creative backbone:\n`;
    prompt += `Title: ${selectedConcept.title}\n`;
    prompt += `Format: ${selectedConcept.format}\n`;
    prompt += `Opening hook line: "${selectedConcept.hook}"\n`;
    prompt += `Belief challenged: ${selectedConcept.belief}\n`;
    prompt += `3-phase arc: ${selectedConcept.premise}\n\n`;
  }

  prompt += buildSeeHearReadBlock();

  prompt += `OUTPUT FORMAT — produce ALL of the following sections in this exact order:\n\n`;

  prompt += `===HOOK===\n`;
  prompt += `Open with the WHAT THEY SEE / WHAT THEY HEAR / WHAT THEY READ block (per the instruction above), then the PPP opening — all three phases, spoken aloud, covering the first ~60–90 seconds of the video.\n\n`;
  prompt += `PHASE 1 — PROOF:\n`;
  prompt += `Exactly two sentences. This template is non-negotiable — use it verbatim:\n`;
  prompt += `Sentence 1: "Last [time period], one of our clients / I was speaking to someone who [specific result or specific problem]."\n`;
  prompt += `Sentence 2: "My name's Adam, I own Diogel Architecture, I speak to 40 homeowners a week, and every year we help over 200 families through [project type]."\n`;
  prompt += `Rules:\n`;
  prompt += `- Never use a client's name — always "one of our clients" or "I was speaking to someone"\n`;
  prompt += `- The situation must be concrete and specific (a real number, a real outcome, a real moment) — not vague\n`;
  prompt += `- Do not invent a resolution to the situation — the teaching moment is sufficient\n`;
  prompt += `- Two sentences only. No elaboration. Move directly to Phase 2.\n\n`;
  prompt += `PHASE 2 — PROMISE:\n`;
  prompt += `Template: "In this video I'm going to show you exactly [what/how — be concrete and specific], so you can [dream outcome] — even if [the viewer's main objection or blocker they believe disqualifies them]."\n`;
  prompt += `Rules: "In this video I'm going to show you exactly" is the fixed opener — do not paraphrase. The "even if" must name the real objection. This Promise is a contract — it must be delivered in ===PAYOFF===.\n\n`;
  prompt += `PHASE 3 — PLAN:\n`;
  prompt += `Template: "I'm going to break it down into three parts — [Part 1 name], [Part 2 name], and [Part 3 name]."\n`;
  prompt += `Rules: Exactly three parts. Make the part names specific enough that the viewer knows what's coming. CRITICAL: these three parts ARE the structure of ===BODY=== — the body must use them as its organising headings, each verbally signposted in the spoken script. The ===BODY=== begins immediately after this line.\n\n`;

  prompt += `===BELIEF===\n`;
  prompt += `The commonly held belief this video challenges (1 sentence).\n\n`;

  prompt += `===BODY===\n`;
  prompt += `The main content — organised around the three parts named in Phase 3 of the PPP. Each part must be introduced with a natural spoken signpost (e.g. "Let's start with part one — [Part 1 name]."). Target ${wordCount - 300} words for this section.\n`;
  prompt += `The "even if" objection from Phase 2 must be directly addressed within one of these parts.\n`;
  prompt += `Insert a [INTERRUPT] marker every 60–90 seconds of speaking content.\n`;
  prompt += `Each interrupt must be formatted as: [INTERRUPT: Type — specific action]\n`;
  prompt += `Valid interrupt types: Camera Angle Change | B-Roll | Vocal Dynamics | Environmental Change | Direct Question\n`;
  prompt += `The interrupt must change the sensory register — not just the topic.\n`;
  prompt += `Write the full spoken script here, not bullet points or summaries.\n`;
  if (ctaOverride?.phrase) {
    prompt += `\nMID-ROLL CTA — after Part 2 and before Part 3, deliver this exact CTA phrase spoken naturally:\n"${ctaOverride.phrase}"\nIt should feel like a natural breath between parts — not an ad break. One sentence of lead-in, then the phrase, then Part 3 begins.\n`;
  }
  prompt += `\n`;

  prompt += `===PAYOFF===\n`;
  prompt += `Final ~80 words. Close the loop on the family story from the opening ("That family I mentioned at the start..."). Deliver the Promise outcome in 1–2 sentences — confirm the viewer now has what they came for. Keep it tight. No recap of body points. End with this exact line on its own: "Simple. Smart. Sorted."\n\n`;

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
