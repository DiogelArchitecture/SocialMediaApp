export interface AnalyseInput {
  transcript: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface DropOffPoint {
  timestamp: string;
  reason: string;
  line: string;
  fix: string;
  startSeconds: number;
  endSeconds: number;
}

export interface SpinoffIdea {
  title: string;
  hook: string;
  format: string;
}

export interface ParsedAnalysis {
  hookRate?: string;
  dropOffPoints: DropOffPoint[];
  strengths?: string;
  verdict?: string;
  spinoffs: SpinoffIdea[];
  raw: string;
}

export function buildAnalysePrompt(input: AnalyseInput): string {
  return `TRANSCRIPT:
${input.transcript}

ENGAGEMENT DATA:
Views: ${input.views.toLocaleString()}
Likes: ${input.likes.toLocaleString()}
Comments: ${input.comments.toLocaleString()}
Shares: ${input.shares.toLocaleString()}

Analyse this video and return output using these exact delimiters:

===HOOK RATE===
Estimated % of viewers retained past 3 seconds.
State: [X]% — and the reason (strong/weak visual, opening line quality, pattern interrupt success/failure).

===DROP-OFF POINTS===
List each likely drop-off moment:
TIMESTAMP: [Xs–Xs]
REASON: [why viewers left]
LINE: "[the exact line or moment that caused it]"
FIX: [specific rewrite or direction change]

===STRENGTHS===
What worked. Be specific — reference timestamps and lines.

===OVERALL VERDICT===
One paragraph. Honest. No flattery.

===SPINOFF IDEAS===
3 spinoff video concepts based on what performed well in this video.
Format each as:
TITLE: [concept name]
HOOK: [opening line — 10 words max]
FORMAT: [format type e.g. Inverse Hook, Stat-led, Challenge]`;
}

export const ANALYSE_SYSTEM_PROMPT = `You are a social media retention analyst specialising in short-form video.
You will be given a video transcript and engagement data.
Return a structured retention report only — no preamble.
Use UK English.`;

export function parseAnalysis(raw: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    dropOffPoints: [],
    spinoffs: [],
    raw,
  };

  const sections: Record<string, string> = {};
  const delimPattern = /===([A-Z\s\-]+)===/g;
  const parts = raw.split(delimPattern);

  let currentKey = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part && !part.includes("\n") && delimPattern.test(`===${part}===`)) {
      currentKey = part;
    } else if (currentKey) {
      sections[currentKey] = part;
      currentKey = "";
    } else if (i === 0 && part) {
      // pre-delimiter text
    }
  }

  // Re-parse with a cleaner approach
  const sectionRegex = /===([A-Z\s\-]+)===([\s\S]*?)(?====|$)/g;
  const sectionMatches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(raw)) !== null) { sectionMatches.push(m); }
  for (const match of sectionMatches) {
    sections[match[1].trim()] = match[2].trim();
  }

  result.hookRate = sections["HOOK RATE"];
  result.strengths = sections["STRENGTHS"];
  result.verdict = sections["OVERALL VERDICT"];

  // Parse drop-off points
  const dropOffRaw = sections["DROP-OFF POINTS"] || "";
  const dropOffBlocks = dropOffRaw.split(/\n(?=TIMESTAMP:)/g).filter(Boolean);

  for (const block of dropOffBlocks) {
    const timestampMatch = block.match(/TIMESTAMP:\s*(.+)/);
    const reasonMatch = block.match(/REASON:\s*(.+)/);
    const lineMatch = block.match(/LINE:\s*"?(.+?)"?\s*(?:\n|$)/);
    const fixMatch = block.match(/FIX:\s*([\s\S]+)/);

    if (timestampMatch) {
      const ts = timestampMatch[1].trim();
      const { start, end } = parseTimestamp(ts);
      result.dropOffPoints.push({
        timestamp: ts,
        reason: reasonMatch ? reasonMatch[1].trim() : "",
        line: lineMatch ? lineMatch[1].trim() : "",
        fix: fixMatch ? fixMatch[1].trim() : "",
        startSeconds: start,
        endSeconds: end,
      });
    }
  }

  // Parse spinoffs
  const spinoffsRaw = sections["SPINOFF IDEAS"] || "";
  const spinoffBlocks = spinoffsRaw.split(/\n(?=TITLE:)/g).filter(Boolean);

  for (const block of spinoffBlocks) {
    const titleMatch = block.match(/TITLE:\s*(.+)/);
    const hookMatch = block.match(/HOOK:\s*(.+)/);
    const formatMatch = block.match(/FORMAT:\s*(.+)/);

    if (titleMatch) {
      result.spinoffs.push({
        title: titleMatch[1].trim(),
        hook: hookMatch ? hookMatch[1].trim() : "",
        format: formatMatch ? formatMatch[1].trim() : "",
      });
    }
  }

  return result;
}

function parseTimestamp(ts: string): { start: number; end: number } {
  // e.g. "3s–7s" or "10s-15s" or "0:10-0:20"
  const match = ts.match(/(\d+)s?[–\-](\d+)s?/);
  if (match) {
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }
  const single = ts.match(/(\d+)s?/);
  if (single) {
    const s = parseInt(single[1]);
    return { start: s, end: s + 3 };
  }
  return { start: 0, end: 3 };
}
