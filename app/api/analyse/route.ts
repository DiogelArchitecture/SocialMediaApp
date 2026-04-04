import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTranscript } from "@/lib/apify";
import { buildAnalysePrompt, ANALYSE_SYSTEM_PROMPT } from "@/lib/analyse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url: string };

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch transcript + engagement data via Apify
    let transcriptData: Awaited<ReturnType<typeof fetchTranscript>>;
    try {
      transcriptData = await fetchTranscript(url);
    } catch (err) {
      console.error("Apify transcript fetch failed:", err);
      // Fall back to stub for development
      transcriptData = {
        transcript: "Transcript unavailable — Apify fetch failed. Analyse based on URL context only.",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
    }

    const userPrompt = buildAnalysePrompt(transcriptData);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: ANALYSE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
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
    console.error("Analyse route error:", err);
    return new Response(JSON.stringify({ error: "Analysis failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
