import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MASTER_PROMPT } from "@/lib/master-prompt";
import type { Platform, Duration, Audience, Tone, PatternData } from "@/lib/build-prompt";

export const runtime = "nodejs";

export interface ConceptRequest {
  topic: string;
  platform: Platform;
  duration: Duration;
  location: string;
  selectedHook?: string;
  audience?: Audience;
  tone?: Tone;
  patterns?: PatternData | null;
}

export interface ScriptConcept {
  id: string;
  title: string;
  belief: string;
  hook: string;
  premise: string;
  format: string;
  cta: "soft" | "hard" | "curiosity";
}

const SYSTEM = MASTER_PROMPT + `

## CONCEPTS MODE
Your job right now is to generate 3 distinct script concepts — NOT full scripts, just tight strategic outlines.
Each concept must challenge a different commonly held belief about UK home renovation.
Use all customer intelligence above to ensure each concept targets a real pain point Karen & Mark feel.`;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  function errStream(message: string) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  try {
    const body = (await request.json()) as ConceptRequest;
    const { topic, platform, duration, location, selectedHook, audience, tone, patterns } = body;

    const apiKey = (process.env.ANTHROPIC_API_KEY || "").replace(/[\u2013\u2014\u2212]/g, "-").trim();
    if (!apiKey) return errStream("ANTHROPIC_API_KEY is not set.");

    // Build context from live scraped patterns passed from the client
    const hookContext = selectedHook
      ? `SELECTED HOOK — the user picked this from real scraped data. Build at least one concept that uses or riffs on it:\n"${selectedHook}"\n\n`
      : "";

    let patternContext = "";
    if (patterns?.hooks?.length) {
      const hookLines = patterns.hooks
        .slice(0, 8)
        .map(h => {
          const er = h.avg_er > 0 ? ` (ER ${(h.avg_er * 100).toFixed(1)}%${h.views ? `, ${(h.views / 1000).toFixed(0)}k views` : ""})` : "";
          return `- "${h.text}"${er}`;
        })
        .join("\n");
      patternContext += `REAL TOP-PERFORMING HOOKS scraped from ${platform} (use these patterns — opening style, word choice, tension):\n${hookLines}\n\n`;
    }
    if (patterns?.ctas?.length) {
      const ctaLines = patterns.ctas.slice(0, 3).map(c => `- [${c.type}] "${c.phrase}"`).join("\n");
      patternContext += `REAL CTAs from scraped posts:\n${ctaLines}\n\n`;
    }
    if (patterns?.formats?.length) {
      const fmtLines = patterns.formats.slice(0, 3).map(f => `- ${f.description}`).join("\n");
      patternContext += `FORMATS performing well on ${platform}:\n${fmtLines}\n\n`;
    }

    const prompt = `${hookContext}${patternContext}Generate exactly 3 distinct script concepts for a ${duration} ${platform} video about: "${topic}"

Shooting location: ${location}
${audience ? `Audience: ${audience}` : ""}
${tone ? `Tone: ${tone}` : ""}

The scraped hook patterns above are real examples that got views on ${platform}. Mirror their opening energy and format style in your concept hooks.

Return ONLY valid JSON — no markdown, no explanation:
{
  "concepts": [
    {
      "id": "1",
      "title": "Short punchy title (4-6 words)",
      "belief": "The commonly held belief this challenges (1 sentence)",
      "hook": "Opening line — verbatim, 10 words max, no question that can be answered yes/no",
      "premise": "2-sentence summary of the script structure and payoff",
      "format": "Format type e.g. Inverse Hook / Myth Bust / Stat Drop / Before-After / Challenge",
      "cta": "soft|hard|curiosity"
    }
  ]
}

Make the 3 concepts meaningfully different in format and angle. All must be grounded in UK renovation reality.`;

    const client = new Anthropic({ apiKey });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: SYSTEM,
            messages: [{ role: "user", content: prompt }],
          });

          const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
          let concepts: ScriptConcept[] = [];

          try {
            const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
            concepts = parsed.concepts ?? [];
          } catch {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to parse concepts from Claude response." })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ concepts })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Concepts generation failed";
    return errStream(msg);
  }
}
