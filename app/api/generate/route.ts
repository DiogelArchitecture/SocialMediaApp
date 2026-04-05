import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MASTER_PROMPT } from "@/lib/master-prompt";
import { buildUserPrompt, type BuildPromptParams } from "@/lib/build-prompt";
import { readPatterns } from "@/lib/pattern-store";

export const runtime = "nodejs";

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
    const body = (await request.json()) as BuildPromptParams;
    const { platform, topic } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return errStream("ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.");
    }

    // Sanitise key — iOS auto-correct can replace hyphens with en/em dashes
    const apiKey = process.env.ANTHROPIC_API_KEY.replace(/[\u2013\u2014\u2212]/g, "-").trim();

    const patterns = readPatterns(platform, topic);
    const userPrompt = buildUserPrompt({ ...body, patterns, selectedConcept: body.selectedConcept ?? null });
    const client = new Anthropic({ apiKey });

    let streamStarted = false;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: MASTER_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              streamStarted = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
            }
          }

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
    const msg = err instanceof Error ? err.message : "Generation failed";
    console.error("Generate route error:", err);
    return errStream(msg);
  }
}
