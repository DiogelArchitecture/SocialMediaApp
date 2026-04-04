"use client";

import { useState } from "react";
import Link from "next/link";
import ModeTab, { type AppMode } from "@/components/ModeTab";
import InputPanel from "@/components/InputPanel";
import OutputPanel from "@/components/OutputPanel";
import RetentionTimeline from "@/components/RetentionTimeline";
import SpinoffCard from "@/components/SpinoffCard";
import type {
  Platform,
  Duration,
  Audience,
  HookStyle,
  Tone,
  Toggles,
} from "@/lib/build-prompt";
import type { SectionKey } from "@/lib/parse-output";
import { parseAnalysis, type ParsedAnalysis } from "@/lib/analyse";
import type { ScrapeStep } from "@/components/ScrapeProgress";
import type { SpinoffIdea } from "@/lib/analyse";

const DEFAULT_TOGGLES_FORGE: Toggles = {
  viralCut: true,
  shotBreakdown: true,
  propsList: true,
  editNotes: true,
  vfxIdeas: false,
  packagingIdeas: false,
  scrapeFresh: false,
};

const DEFAULT_TOGGLES_QUICK: Toggles = {
  viralCut: true,
  shotBreakdown: true,
  propsList: false,
  editNotes: false,
  vfxIdeas: false,
  packagingIdeas: false,
  scrapeFresh: false,
};

export default function Home() {
  const [mode, setMode] = useState<AppMode>("forge");

  // Shared fields
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [duration, setDuration] = useState<Duration>("60s");
  const [location, setLocation] = useState("");

  // Forge-only fields
  const [audience, setAudience] = useState<Audience>("First-time renovator");
  const [hookStyle, setHookStyle] = useState<HookStyle>("Auto");
  const [tone, setTone] = useState<Tone>("Calm authority");
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES_FORGE);

  // Output state
  const [rawOutput, setRawOutput] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scrapeStep, setScrapeStep] = useState<ScrapeStep>("idle");
  const [scrapeDetail, setScrapeDetail] = useState<string | undefined>();

  // Analyse mode
  const [analyseUrl, setAnalyseUrl] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyseRaw, setAnalyseRaw] = useState("");
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);

  function handleModeChange(newMode: AppMode) {
    setMode(newMode);
    setToggles(newMode === "quick" ? DEFAULT_TOGGLES_QUICK : DEFAULT_TOGGLES_FORGE);
    setRawOutput("");
    setScrapeStep("idle");
  }

  function handleToggleChange(key: keyof Toggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function runScrape(): Promise<void> {
    setScrapeStep("scraping");
    setScrapeDetail(undefined);

    return new Promise((resolve) => {
      fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, keyword: topic, forceFresh: toggles.scrapeFresh }),
      }).then(async (res) => {
        if (!res.body) { setScrapeStep("idle"); resolve(); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const msg = JSON.parse(json);
              if (msg.step) {
                setScrapeStep(msg.step as ScrapeStep);
                setScrapeDetail(msg.detail);
              }
              if (msg.done) {
                setScrapeStep("idle");
                resolve();
                return;
              }
            } catch {
              // ignore parse errors
            }
          }
        }
        setScrapeStep("idle");
        resolve();
      }).catch(() => { setScrapeStep("idle"); resolve(); });
    });
  }

  async function handleGenerate() {
    if (isGenerating) return;
    setIsGenerating(true);
    setRawOutput("");
    setGenerateError(null);
    setScrapeStep("idle");

    // Run scrape first if Forge mode with scrapeFresh
    if (mode === "forge" && toggles.scrapeFresh) {
      await runScrape();
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          duration,
          location,
          audience,
          hookStyle,
          tone,
          toggles,
          mode,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.text) {
              accumulated += msg.text;
              setRawOutput(accumulated);
            }
            if (msg.error) {
              setGenerateError(msg.error);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAnalyse() {
    if (isAnalysing || !analyseUrl.trim()) return;
    setIsAnalysing(true);
    setAnalyseRaw("");
    setParsedAnalysis(null);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyseUrl }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.text) {
              accumulated += msg.text;
              setAnalyseRaw(accumulated);
            }
          } catch {
            // ignore
          }
        }
      }

      setParsedAnalysis(parseAnalysis(accumulated));
    } catch (err) {
      console.error("Analyse error:", err);
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleForgeSpinoff(spinoff: SpinoffIdea) {
    setTopic(spinoff.title);
    if (spinoff.format.toLowerCase().includes("inverse")) setHookStyle("Inverse");
    else if (spinoff.format.toLowerCase().includes("stat")) setHookStyle("Stat-led");
    else if (spinoff.format.toLowerCase().includes("question")) setHookStyle("Question");
    else setHookStyle("Auto");
    setMode("forge");
    setToggles(DEFAULT_TOGGLES_FORGE);
    setRawOutput("");
  }

  function handleRegenerate(_section: SectionKey) {
    handleGenerate();
  }

  const analyseReady =
    analyseUrl.trim().length > 10 &&
    (analyseUrl.includes("tiktok") ||
      analyseUrl.includes("instagram") ||
      analyseUrl.includes("youtube") ||
      analyseUrl.includes("facebook") ||
      analyseUrl.includes("youtu.be"));

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1E1E24] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <span
              className="text-lg text-[#E8FF47]"
              style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
            >
              REPLANIT
            </span>
            <span
              className="text-lg text-[#F2F2F0]"
              style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
            >
              SCRIPT-FORGE
            </span>
          </div>
          <p className="text-xs text-[#6B6B72] mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
            Built on what&apos;s already working.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ModeTab mode={mode} onChange={handleModeChange} />
          <Link
            href="/library"
            className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors border border-[#1E1E24] hover:border-[#E8FF47]/50 px-3 py-1.5"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Format Library
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ========== ANALYSE MODE ========== */}
        {mode === "analyse" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left — URL input */}
            <div className="w-full lg:w-80 xl:w-96 border-r border-[#1E1E24] p-6 space-y-5 flex-shrink-0 overflow-y-auto">
              <div>
                <span
                  className="text-xs text-[#FF4F1F] uppercase tracking-widest"
                  style={{ fontFamily: "Anton, sans-serif" }}
                >
                  Analyse Mode
                </span>
                <p className="text-xs text-[#6B6B72] font-mono mt-1">
                  Paste a video URL. Get a retention report. Close the loop.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Video URL
                </label>
                <input
                  type="url"
                  value={analyseUrl}
                  onChange={(e) => setAnalyseUrl(e.target.value)}
                  placeholder="Paste TikTok, Instagram, YouTube or Facebook URL"
                  className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono placeholder:text-[#6B6B72]/50 focus:outline-none focus:border-[#FF4F1F]/50 transition-colors"
                />
                <p
                  className="text-xs text-[#6B6B72]/60 mt-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  TikTok · Instagram Reels · YouTube Shorts · Facebook Reels
                </p>
              </div>

              <button
                onClick={handleAnalyse}
                disabled={!analyseReady || isAnalysing}
                className={`
                  w-full py-3.5 text-sm transition-all duration-200
                  ${analyseReady && !isAnalysing
                    ? "bg-[#FF4F1F] text-[#F2F2F0] hover:bg-[#e8441a] cursor-pointer"
                    : "bg-[#1E1E24] text-[#6B6B72] cursor-not-allowed"
                  }
                `}
                style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
              >
                {isAnalysing ? "ANALYSING..." : "ANALYSE VIDEO"}
              </button>
            </div>

            {/* Right — Analysis output */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {!analyseRaw && !isAnalysing && (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[#1E1E24] text-center p-8">
                  <div
                    className="text-3xl mb-4 opacity-20"
                    style={{ fontFamily: "Anton, sans-serif" }}
                  >
                    ANALYSE
                  </div>
                  <p className="text-sm text-[#6B6B72] font-mono max-w-sm">
                    Paste any video URL and hit Analyse. You&apos;ll get a full retention report with drop-off points, strengths, and spinoff ideas.
                  </p>
                </div>
              )}

              {isAnalysing && !analyseRaw && (
                <div className="flex items-center gap-3 py-4 px-4 bg-[#111114] border border-[#1E1E24]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs font-mono text-[#6B6B72]">Fetching transcript and analysing...</span>
                </div>
              )}

              {parsedAnalysis?.hookRate && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F]" />
                    <span
                      className="text-xs uppercase tracking-widest text-[#FF4F1F]"
                      style={{ fontFamily: "Anton, sans-serif" }}
                    >
                      Hook Rate
                    </span>
                  </div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.hookRate}</pre>
                </div>
              )}

              {parsedAnalysis && parsedAnalysis.dropOffPoints.length > 0 && (
                <RetentionTimeline dropOffPoints={parsedAnalysis.dropOffPoints} />
              )}

              {parsedAnalysis?.strengths && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" />
                    <span
                      className="text-xs uppercase tracking-widest text-[#E8FF47]"
                      style={{ fontFamily: "Anton, sans-serif" }}
                    >
                      Strengths
                    </span>
                  </div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.strengths}</pre>
                </div>
              )}

              {parsedAnalysis?.verdict && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6B6B72]" />
                    <span
                      className="text-xs uppercase tracking-widest text-[#6B6B72]"
                      style={{ fontFamily: "Anton, sans-serif" }}
                    >
                      Overall Verdict
                    </span>
                  </div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.verdict}</pre>
                </div>
              )}

              {parsedAnalysis && parsedAnalysis.spinoffs.length > 0 && (
                <div className="card-enter space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" />
                    <span
                      className="text-xs uppercase tracking-widest text-[#E8FF47]"
                      style={{ fontFamily: "Anton, sans-serif" }}
                    >
                      Spinoff Ideas
                    </span>
                  </div>
                  {parsedAnalysis.spinoffs.map((spinoff, i) => (
                    <SpinoffCard key={i} spinoff={spinoff} index={i} onForge={handleForgeSpinoff} />
                  ))}
                </div>
              )}

              {isAnalysing && analyseRaw && !parsedAnalysis && (
                <div className="bg-[#111114] border border-[#1E1E24] p-4">
                  <pre className="text-sm text-[#F2F2F0] font-mono whitespace-pre-wrap">
                    {analyseRaw}
                    <span className="inline-block w-1.5 h-4 bg-[#FF4F1F] ml-0.5 animate-pulse" />
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== QUICK / FORGE MODE ========== */}
        {(mode === "quick" || mode === "forge") && (
          <>
            {/* Left panel — inputs */}
            <div className="w-full lg:w-80 xl:w-96 border-r border-[#1E1E24] p-6 overflow-y-auto flex-shrink-0">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className={`text-xs px-2 py-0.5 ${
                    mode === "quick"
                      ? "bg-[#FF4F1F] text-[#F2F2F0]"
                      : "bg-[#E8FF47]/10 text-[#E8FF47] border border-[#E8FF47]/30"
                  }`}
                  style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
                >
                  {mode === "quick" ? "QUICK MODE" : "FORGE MODE"}
                </span>
                <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                  {mode === "quick" ? "No scraping — uses cached patterns" : "Full pipeline available"}
                </span>
              </div>

              <InputPanel
                mode={mode}
                topic={topic}
                platform={platform}
                duration={duration}
                location={location}
                audience={audience}
                hookStyle={hookStyle}
                tone={tone}
                toggles={toggles}
                isGenerating={isGenerating}
                onTopicChange={setTopic}
                onPlatformChange={setPlatform}
                onDurationChange={setDuration}
                onLocationChange={setLocation}
                onAudienceChange={setAudience}
                onHookStyleChange={setHookStyle}
                onToneChange={setTone}
                onToggleChange={handleToggleChange}
                onGenerate={handleGenerate}
              />
            </div>

            {/* Right panel — output */}
            <div className="flex-1 p-6 overflow-y-auto">
              {generateError && (
                <div className="mb-4 border border-[#FF4F1F]/50 bg-[#FF4F1F]/5 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F]" />
                    <span className="text-xs text-[#FF4F1F] uppercase tracking-widest" style={{ fontFamily: "Anton, sans-serif" }}>
                      Error
                    </span>
                  </div>
                  <p className="text-sm font-mono text-[#F2F2F0]">{generateError}</p>
                </div>
              )}
              <OutputPanel
                rawOutput={rawOutput}
                isGenerating={isGenerating}
                scrapeStep={scrapeStep}
                scrapeDetail={scrapeDetail}
                onRegenerate={handleRegenerate}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
