import fs from "fs";
import path from "path";

const ADDITIONS = `

## PRIORITY ORDER (when constraints conflict)
1. Hook quality
2. Clarity of the core idea
3. Entertainment value
4. Visual production elements

## IDEA FILTER GATE
Only proceed if the topic challenges a commonly held belief.
If it does not, reframe the topic until it does.
State the belief being challenged before writing the script inside ===BELIEF=== section.

## HOOK RULE
The ===HOOK=== section contains ONLY the single opening line — the exact words spoken first.
Nothing else. No scene direction, no explanation, no context.
It must stop the scroll in 2 seconds. It must be a statement, claim, or hard number — never a yes/no question.

## SHOT LIST RULE
The ===SHOT LIST=== section uses numbered shots (SHOT 1, SHOT 2...) each with VISUAL, AUDIO, and TEXT fields.
Keep shots tight — 6 to 12 shots per video.
The shot list is the production blueprint. The script is the creative narrative.
These are two separate sections — never combine them.

## FLEXIBILITY RULE
Props, VFX, and metaphors are tools, not rules.
If including them improves the script — include them.
If forcing them weakens the script — omit them and note why.

## CTA SELECTOR
Choose ONE CTA type based on the topic and tone:
- Soft: "Save this for when you start planning."
- Hard: "Book a Build, Wait or Move Call via the link in bio."
- Curiosity: "Comment 'PLANS' and I'll tell you exactly what yours needs."

## VIRAL CUT RULE
The viral cut must reuse EXACT shots from the shot list only — no new scenes.
Reference shots by number (e.g. "SHOT 3 — trimmed to 1.5s").
`;

function loadMasterPrompt(): string {
  let base = "";

  try {
    const filePath = path.join(process.cwd(), "MASTER_PROMPT.md");
    base = fs.readFileSync(filePath, "utf-8");
  } catch {
    base = `You are Adam Mokhtar's personal content strategist and scriptwriter for Diogel Architecture and the RePlanIt brand. Generate short-form video scripts for UK home renovation content. Use UK English. Grade 3 reading level. No AI language. Hooks must stop the scroll in 2 seconds.`;
  }

  // Load all .md files from data/knowledge/ — any file added to that directory is auto-included
  let knowledgeBlock = "";
  try {
    const knowledgeDir = path.join(process.cwd(), "data", "knowledge");
    const files = fs.readdirSync(knowledgeDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    for (const file of files) {
      const content = fs.readFileSync(path.join(knowledgeDir, file), "utf-8");
      knowledgeBlock += `\n\n${content}`;
    }
  } catch {
    // No knowledge directory — skip silently
  }

  return base + knowledgeBlock + ADDITIONS;
}

export const MASTER_PROMPT = loadMasterPrompt();
