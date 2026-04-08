import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { scrapeContent } from "@/lib/apify";
import { writePatterns } from "@/lib/pattern-store";
import type { Platform, PatternData, HookSource } from "@/lib/build-prompt";

export const runtime = "nodejs";
// Vercel: Hobby supports up to 60s, Pro up to 300s.
// 60s gives the Apify actor (capped at 50s) time to complete on all plans.
export const maxDuration = 60;

// Extract the opening hook from a caption/transcript — first sentence, max 180 chars
function extractHookLine(text: string): string {
  if (!text) return "";
  const clean = text.trim().replace(/\n+/g, " ");
  const match = clean.match(/^(.{10,180}?[.!?])\s/);
  if (match) return match[1].trim();
  return clean.slice(0, 150).trim();
}

const CTA_SYSTEM = `You are a content pattern analyst. Extract CTAs and structural formats from social media posts. Return JSON only — no explanation, no markdown.`;

export async function POST(request: NextRequest) {
  try {
    const { platform, keyword, forceFresh, topic } = (await request.json()) as {
      platform: Platform;
      keyword: string;
      forceFresh?: boolean;
      topic?: string;
    };

    if (!platform || !keyword) {
      return NextResponse.json({ error: "platform and keyword required" }, { status: 400 });
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json({ error: "APIFY_API_TOKEN is not set in environment variables. Add it in Vercel → Settings → Environment Variables." }, { status: 503 });
    }

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        function send(step: string, detail?: string) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step, detail })}\n\n`));
        }

        try {
          send("scraping", `Scraping ${platform}...`);
          const posts = await scrapeContent(platform, keyword, forceFresh, (msg) => {
            send("scraping", msg);
          }, topic);

          send("filtering", `${posts.length} posts collected`);

          if (posts.length === 0) {
            const noPostsMsg = "Apify returned no posts. Check that APIFY_API_TOKEN is set in Vercel → Settings → Environment Variables, then redeploy.";
            send("error", noPostsMsg);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, patterns: null, error: noPostsMsg })}\n\n`));
            controller.close();
            return;
          }

          send("extracting", "Extracting patterns...");

          // ── RAW POSTS snapshot for UI (before hook extraction) ──
          const rawPosts = posts
            .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
            .slice(0, 20)
            .map(p => ({
              url: p.url || undefined,
              platform,
              views: p.views || undefined,
              likes: p.likes || undefined,
              comments: p.comments || undefined,
              shares: p.shares || undefined,
              engagement_rate: p.engagement_rate || undefined,
              caption: (p.caption || p.transcript || "").slice(0, 120).trim() || undefined,
            }));

          // ── HOOKS: extract directly from posts, preserving source URL + stats ──
          // No Claude needed — take opening line from each post's caption/transcript
          const hooks: HookSource[] = posts
            .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
            .slice(0, 12)
            .reduce<HookSource[]>((acc, p) => {
              const hookText = extractHookLine(p.caption || p.transcript || "");
              if (!hookText || hookText.length <= 8) return acc;
              acc.push({
                text: hookText,
                pattern_type: classifyHookPattern(hookText),
                avg_er: p.engagement_rate ?? 0,
                sample_count: 1,
                source_url: p.url || undefined,
                source_platform: platform,
                views: p.views || undefined,
                likes: p.likes || undefined,
                comments: p.comments || undefined,
                shares: p.shares || undefined,
                scraped_from: keyword,
              });
              return acc;
            }, []);

          // ── CTAs + FORMATS: still use Claude (harder to extract without NLP) ──
          const apiKey = (process.env.ANTHROPIC_API_KEY || "").replace(/[\u2013\u2014\u2212]/g, "-").trim();
          const client = new Anthropic({ apiKey });

          const postsJson = JSON.stringify(
            posts.slice(0, 10).map((p) => ({
              caption: p.caption?.slice(0, 400),
              engagement_rate: p.engagement_rate,
            })),
            null,
            2
          );

          const ctaPrompt = `Analyse these ${platform} posts about "${keyword}" and extract:\n1. CTAs (calls to action in the captions/transcripts)\n2. Structural formats that appear\n\nPosts:\n${postsJson}\n\nReturn:\n{\n  "ctas": [{ "phrase": "...", "type": "soft|hard|curiosity", "signal": "..." }],\n  "formats": [{ "description": "...", "structure": "..." }]\n}`;

          let ctas: PatternData["ctas"] = [];
          let formats: PatternData["formats"] = [];

          try {
            const response = await client.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 800,
              system: CTA_SYSTEM,
              messages: [{ role: "user", content: ctaPrompt }],
            });
            const rawJson = response.content[0].type === "text" ? response.content[0].text : "{}";
            const parsed = JSON.parse(rawJson.replace(/```json\n?|\n?```/g, "").trim());
            ctas = parsed.ctas ?? [];
            formats = parsed.formats ?? [];
          } catch {
            // CTAs/formats extraction failed — hooks still saved
          }

          const patterns: PatternData = {
            hooks,
            ctas,
            formats,
            scrapedAt: new Date().toISOString(),
            platform,
          };

          writePatterns(platform, keyword, patterns);

          send("done", `${hooks.length} hooks with source links saved.`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, patterns, rawPosts })}\n\n`));
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

function classifyHookPattern(text: string): string {
  const t = text.toLowerCase();
  if (t.match(/^\d+(%|k|m|\s+(reason|thing|mistake|step|way|tip))/)) return "Stat Drop";
  if (t.includes("everyone thinks") || t.includes("most people") || t.includes("myth")) return "Myth Bust";
  if (t.includes("stop ") || t.includes("never ") || t.includes("wrong")) return "Disruption";
  if (t.includes("?")) return "Question";
  if (t.includes("before") && t.includes("after")) return "Before/After";
  if (t.match(/\b(£|\$)\d/) || t.includes("cost") || t.includes("price")) return "Cost Hook";
  return "Inverse Hook";
}
