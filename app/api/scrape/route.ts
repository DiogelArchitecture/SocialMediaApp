import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { scrapeContent } from "@/lib/apify";
import { writePatterns } from "@/lib/pattern-store";
import type { Platform } from "@/lib/build-prompt";
import type { PatternData } from "@/lib/build-prompt";

export const runtime = "nodejs";

const EXTRACTION_SYSTEM = `You are a content pattern analyst. Extract structured engagement patterns from the following social media posts. Return JSON only — no explanation, no markdown fences.`;

export async function POST(request: NextRequest) {
  try {
    const { platform, keyword, forceFresh } = (await request.json()) as {
      platform: Platform;
      keyword: string;
      forceFresh?: boolean;
    };

    if (!platform || !keyword) {
      return NextResponse.json({ error: "platform and keyword required" }, { status: 400 });
    }

    // Stream progress events via SSE
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        function send(step: string, detail?: string) {
          const data = `data: ${JSON.stringify({ step, detail })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        try {
          send("scraping", `Scraping ${platform}...`);
          const posts = await scrapeContent(platform, keyword, forceFresh);

          send("filtering", `Filtering by engagement rate... ${posts.length} posts above 5% ER`);

          if (posts.length === 0) {
            send("error", "No posts found above 5% engagement rate. Using cached patterns.");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, patterns: null })}\n\n`));
            controller.close();
            return;
          }

          send("extracting", "Extracting patterns...");

          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          const postsJson = JSON.stringify(
            posts.map((p) => ({
              caption: p.caption,
              transcript: p.transcript?.slice(0, 500),
              engagement_rate: p.engagement_rate,
              views: p.views,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
            })),
            null,
            2
          );

          const extractionPrompt = `Extract structured engagement patterns from these ${platform} posts about "${keyword}".\n\nPosts:\n${postsJson}\n\nReturn this exact JSON structure:\n{\n  "hooks": [{ "text": "...", "pattern_type": "...", "avg_er": 0.0, "sample_count": 0 }],\n  "ctas": [{ "phrase": "...", "type": "soft|hard|curiosity", "signal": "..." }],\n  "formats": [{ "description": "...", "structure": "..." }]\n}`;

          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: EXTRACTION_SYSTEM,
            messages: [{ role: "user", content: extractionPrompt }],
          });

          const rawJson = response.content[0].type === "text" ? response.content[0].text : "{}";

          let patterns: PatternData;
          try {
            const parsed = JSON.parse(rawJson.replace(/```json\n?|\n?```/g, "").trim());
            patterns = {
              ...parsed,
              scrapedAt: new Date().toISOString(),
              platform,
            };
          } catch {
            patterns = { hooks: [], ctas: [], formats: [], scrapedAt: new Date().toISOString(), platform };
          }

          // Save to pattern library
          writePatterns(platform, keyword, patterns);

          send("done", "Patterns extracted and saved.");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, patterns })}\n\n`));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Scrape failed";
          send("error", msg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, patterns: null, error: msg })}\n\n`));
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
    console.error("Scrape route error:", err);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
