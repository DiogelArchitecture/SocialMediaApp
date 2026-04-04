import fs from "fs";
import path from "path";

function loadMasterPrompt(): string {
  const filePath = path.join(process.cwd(), "MASTER_PROMPT.md");
  const base = fs.readFileSync(filePath, "utf-8");

  const additions = `

## PRIORITY ORDER (when constraints conflict)
1. Hook quality
2. Clarity of the core idea
3. Entertainment value
4. Visual production elements

## IDEA FILTER GATE
Only proceed if the topic challenges a commonly held belief.
If it does not, reframe the topic until it does.
State the belief being challenged before writing the script inside ===BELIEF=== section.

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
The viral cut must reuse EXACT shots from the main script only — no new scenes.
Reference shots by number (e.g. "SHOT 3 — trimmed to 1.5s").
`;

  return base + additions;
}

export const MASTER_PROMPT = loadMasterPrompt();
