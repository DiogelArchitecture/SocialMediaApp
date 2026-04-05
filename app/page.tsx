"use client";

import { useState } from "react";
import Link from "next/link";
import ModeTab, { type AppMode } from "@/components/ModeTab";
import StepIndicator, { type Step } from "@/components/StepIndicator";
import HookPicker from "@/components/HookPicker";
import ConceptPicker from "@/components/ConceptPicker";
import DurationSelector from "@/components/DurationSelector";
import LocationInput from "@/components/LocationInput";
import ToggleGroup from "@/components/ToggleGroup";
import OutputPanel from "@/components/OutputPanel";
import RetentionTimeline from "@/components/RetentionTimeline";
import SpinoffCard from "@/components/SpinoffCard";
import type { Platform, Duration, Audience, HookStyle, Tone, Toggles, PatternData } from "@/lib/build-prompt";
import { parseAnalysis, type ParsedAnalysis } from "@/lib/analyse";
import type { ScrapeStep } from "@/components/ScrapeProgress";
import type { SpinoffIdea } from "@/lib/analyse";
import type { ScriptConcept } from "@/app/api/concepts/route";

const RANDOM_TOPICS = [
  "Loft conversion planning mistakes",
  "Single storey extension costs",
  "Planning permission for outbuildings",
  "Building regulations vs planning permission",
  "Party wall agreement timeline",
  "Kitchen extension structural mistakes",
  "Permitted development rights explained",
  "How to brief an architect",
  "Why renovation projects go over budget",
  "Garage conversion rules UK",
];

const DEFAULT_TOGGLES: Toggles = {
  viralCut: true,
  shotList: true,
  propsList: true,
  editNotes: true,
  vfxIdeas: false,
  packagingIdeas: false,
  scrapeFresh: false,
};

const DEFAULT_TOGGLES_QUICK: Toggles = {
  viralCut: true,
  shotList: true,
  propsList: false,
  editNotes: false,
  vfxIdeas: false,
  packagingIdeas: false,
  scrapeFresh: false,
};

export default function Home() {
  const [mode, setMode] = useState<AppMode>("forge");
  const [step, setStep] = useState<Step>(1);

  // Brief fields
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [duration, setDuration] = useState<Duration>("60s");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState<Audience>("First-time renovator");
  const [hookStyle, setHookStyle] = useState<HookStyle>("Auto");
  const [tone, setTone] = useState<Tone>("Calm authority");
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);

  // Step 2 — hooks
  const [patterns, setPatterns] = useState<PatternData | null>(null);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [hooksLoading, setHooksLoading] = useState(false);

  // Step 3 — concepts
  const [concepts, setConcepts] = useState<ScriptConcept[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptsError, setConceptsError] = useState<string | null>(null);

  // Step 4 — script
  const [rawOutput, setRawOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scrapeStep, setScrapeStep] = useState<ScrapeStep>("idle");
  const [scrapeDetail, setScrapeDetail] = useState<string | undefined>();

  // Analyse mode
  const [analyseUrl, setAnalyseUrl] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyseRaw, setAnalyseRaw] = useState("");
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);

  function handleModeChange(newMode: AppMode) {
    setMode(newMode);
    setStep(1);
    setToggles(newMode === "quick" ? DEFAULT_TOGGLES_QUICK : DEFAULT_TOGGLES);
    resetOutputState();
  }

  function resetOutputState() {
    setRawOutput("");
    setGenerateError(null);
    setScrapeStep("idle");
    setConcepts([]);
    setSelectedConceptId(null);
    setConceptsError(null);
  }

  function handleBack() {
    if (step === 2) { setStep(1); setSelectedHook(null); }
    else if (step === 3) { setStep(2); setSelectedConceptId(null); setConcepts([]); }
    else if (step === 4) { setStep(3); resetOutputState(); }
  }

  // Step 1 → 2: load hooks
  async function handleFindHooks() {
    setHooksLoading(true);
    setStep(2);
    try {
      const res = await fetch("/api/patterns");
      const data = await res.json();
      // Find pattern matching topic or use seed
      const match = (data.patterns ?? []).find((p: { niche: string; data: PatternData }) =>
        topic.toLowerCase().includes(p.niche.toLowerCase()) ||
        p.niche.toLowerCase().includes(topic.toLowerCase().split(" ")[0])
      );
      setPatterns(match?.data ?? (data.patterns?.[0]?.data ?? null));
    } catch {
      setPatterns(null);
    } finally {
      setHooksLoading(false);
    }
  }

  // Step 2 → 3: generate concepts
  async function handleBuildConcepts() {
    setConceptsLoading(true);
    setConceptsError(null);
    setConcepts([]);
    setStep(3);
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, duration, location, selectedHook, audience, tone }),
      });
      if (!res.body) throw new Error("No response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.concepts) setConcepts(msg.concepts);
            if (msg.error) setConceptsError(msg.error);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setConceptsError(err instanceof Error ? err.message : "Failed to build concepts");
    } finally {
      setConceptsLoading(false);
    }
  }

  // Step 3 → 4: generate script
  async function handleGenerateScript() {
    const selectedConcept = concepts.find(c => c.id === selectedConceptId) ?? null;
    setIsGenerating(true);
    setRawOutput("");
    setGenerateError(null);
    setStep(4);

    if (mode === "forge" && toggles.scrapeFresh) {
      await runScrape();
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, duration, location, audience, hookStyle, tone, toggles, mode, selectedConcept }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.text) { accumulated += msg.text; setRawOutput(accumulated); }
            if (msg.error) setGenerateError(msg.error);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsGenerating(false);
    }
  }

  // Random: pick topic, skip to script immediately
  async function handleRandom() {
    const randomTopic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setTopic(randomTopic);
    setSelectedHook(null);
    setSelectedConceptId(null);
    setConcepts([]);
    setConceptsError(null);

    // Build concept first then generate
    setConceptsLoading(true);
    setStep(3);
    let pickedConcept: ScriptConcept | null = null;
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: randomTopic, platform, duration, location, audience, tone }),
      });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const msg = JSON.parse(json);
              if (msg.concepts?.length) { setConcepts(msg.concepts); pickedConcept = msg.concepts[0]; }
            } catch { /* ignore */ }
          }
        }
      }
    } catch { /* fallback to no concept */ } finally {
      setConceptsLoading(false);
    }

    // Generate with picked concept
    setIsGenerating(true);
    setRawOutput("");
    setGenerateError(null);
    setStep(4);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: randomTopic, platform, duration, location, audience, hookStyle, tone, toggles, mode, selectedConcept: pickedConcept }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.text) { accumulated += msg.text; setRawOutput(accumulated); }
            if (msg.error) setGenerateError(msg.error);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Random generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function runScrape(): Promise<void> {
    setScrapeStep("scraping");
    return new Promise(resolve => {
      fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, keyword: topic, forceFresh: toggles.scrapeFresh }),
      }).then(async res => {
        if (!res.body) { setScrapeStep("idle"); resolve(); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const msg = JSON.parse(json);
              if (msg.step) { setScrapeStep(msg.step as ScrapeStep); setScrapeDetail(msg.detail); }
              if (msg.done) { setScrapeStep("idle"); resolve(); return; }
            } catch { /* ignore */ }
          }
        }
        setScrapeStep("idle"); resolve();
      }).catch(() => { setScrapeStep("idle"); resolve(); });
    });
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
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const msg = JSON.parse(json);
            if (msg.text) { accumulated += msg.text; setAnalyseRaw(accumulated); }
          } catch { /* ignore */ }
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
    setStep(1);
    resetOutputState();
  }

  const briefReady = topic.trim().length > 2 && location.trim().length > 2;

  const PLATFORMS: Platform[] = ["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook Reels"];

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1E1E24] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-lg text-[#E8FF47]" style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}>REPLANIT</span>
            <span className="text-lg text-[#F2F2F0]" style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}>SCRIPT-FORGE</span>
          </div>
          <p className="text-xs text-[#6B6B72] mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>Built on what&apos;s already working.</p>
        </div>
        <div className="flex items-center gap-4">
          <ModeTab mode={mode} onChange={handleModeChange} />
          <Link href="/library" className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors border border-[#1E1E24] hover:border-[#E8FF47]/50 px-3 py-1.5" style={{ fontFamily: "Inter, sans-serif" }}>
            Format Library
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── ANALYSE MODE ── */}
        {mode === "analyse" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="w-full lg:w-80 xl:w-96 border-r border-[#1E1E24] p-6 space-y-5 flex-shrink-0 overflow-y-auto">
              <div>
                <span className="text-xs text-[#FF4F1F] uppercase tracking-widest" style={{ fontFamily: "Anton, sans-serif" }}>Analyse Mode</span>
                <p className="text-xs text-[#6B6B72] font-mono mt-1">Paste a URL. Get a retention report.</p>
              </div>
              <div>
                <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Video URL</label>
                <input type="url" value={analyseUrl} onChange={e => setAnalyseUrl(e.target.value)}
                  placeholder="Paste TikTok, Instagram, YouTube or Facebook URL"
                  className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono placeholder:text-[#6B6B72]/50 focus:outline-none focus:border-[#FF4F1F]/50 transition-colors" />
              </div>
              <button onClick={handleAnalyse} disabled={!analyseUrl.trim() || isAnalysing}
                className={`w-full py-3.5 text-sm transition-all ${analyseUrl.trim() && !isAnalysing ? "bg-[#FF4F1F] text-[#F2F2F0] hover:bg-[#e8441a] cursor-pointer" : "bg-[#1E1E24] text-[#6B6B72] cursor-not-allowed"}`}
                style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}>
                {isAnalysing ? "ANALYSING..." : "ANALYSE VIDEO"}
              </button>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {!analyseRaw && !isAnalysing && (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[#1E1E24] text-center p-8">
                  <p className="text-sm text-[#6B6B72] font-mono">Paste a video URL and hit Analyse.</p>
                </div>
              )}
              {isAnalysing && !analyseRaw && (
                <div className="flex items-center gap-3 py-4 px-4 bg-[#111114] border border-[#1E1E24]">
                  <div className="flex gap-1">{[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                  <span className="text-xs font-mono text-[#6B6B72]">Fetching transcript and analysing...</span>
                </div>
              )}
              {parsedAnalysis?.hookRate && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F]" /><span className="text-xs uppercase tracking-widest text-[#FF4F1F]" style={{ fontFamily: "Anton, sans-serif" }}>Hook Rate</span></div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.hookRate}</pre>
                </div>
              )}
              {parsedAnalysis && parsedAnalysis.dropOffPoints.length > 0 && <RetentionTimeline dropOffPoints={parsedAnalysis.dropOffPoints} />}
              {parsedAnalysis?.strengths && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" /><span className="text-xs uppercase tracking-widest text-[#E8FF47]" style={{ fontFamily: "Anton, sans-serif" }}>Strengths</span></div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.strengths}</pre>
                </div>
              )}
              {parsedAnalysis?.verdict && (
                <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
                  <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-1.5 rounded-full bg-[#6B6B72]" /><span className="text-xs uppercase tracking-widest text-[#6B6B72]" style={{ fontFamily: "Anton, sans-serif" }}>Overall Verdict</span></div>
                  <pre className="text-sm font-mono text-[#F2F2F0] whitespace-pre-wrap">{parsedAnalysis.verdict}</pre>
                </div>
              )}
              {parsedAnalysis && parsedAnalysis.spinoffs.length > 0 && (
                <div className="card-enter space-y-3">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" /><span className="text-xs uppercase tracking-widest text-[#E8FF47]" style={{ fontFamily: "Anton, sans-serif" }}>Spinoff Ideas</span></div>
                  {parsedAnalysis.spinoffs.map((s, i) => <SpinoffCard key={i} spinoff={s} index={i} onForge={handleForgeSpinoff} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── QUICK / FORGE PIPELINE ── */}
        {(mode === "quick" || mode === "forge") && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* Left — step content */}
            <div className="w-full lg:w-[420px] xl:w-[480px] border-r border-[#1E1E24] flex flex-col flex-shrink-0">
              {/* Step indicator */}
              <div className="px-6 py-4 border-b border-[#1E1E24]">
                <StepIndicator current={step} onBack={step > 1 ? handleBack : undefined} />
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* ── STEP 1: BRIEF ── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 ${mode === "quick" ? "bg-[#FF4F1F] text-[#F2F2F0]" : "bg-[#E8FF47]/10 text-[#E8FF47] border border-[#E8FF47]/30"}`}
                        style={{ fontFamily: "Anton, sans-serif" }}>
                        {mode === "quick" ? "QUICK MODE" : "FORGE MODE"}
                      </span>
                      <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                        {mode === "quick" ? "Pattern library only" : "Full pipeline"}
                      </span>
                    </div>

                    {/* Topic */}
                    <div>
                      <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Topic</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                        placeholder="e.g. loft conversion planning mistakes"
                        className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono placeholder:text-[#6B6B72]/50 focus:outline-none focus:border-[#E8FF47]/50 transition-colors" />
                    </div>

                    {/* Platform */}
                    <div>
                      <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Platform</label>
                      <select value={platform} onChange={e => setPlatform(e.target.value as Platform)}
                        className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer">
                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <DurationSelector value={duration} onChange={setDuration} />
                    <LocationInput value={location} onChange={setLocation} />

                    {/* Forge-only fields */}
                    {mode === "forge" && (
                      <>
                        <div>
                          <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Target Audience</label>
                          <select value={audience} onChange={e => setAudience(e.target.value as Audience)}
                            className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer">
                            {(["First-time renovator","Experienced homeowner","Investor"] as Audience[]).map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Tone</label>
                          <select value={tone} onChange={e => setTone(e.target.value as Tone)}
                            className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer">
                            {(["High energy","Calm authority","Comedic","Urgent"] as Tone[]).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <ToggleGroup toggles={toggles} onChange={key => setToggles(p => ({ ...p, [key]: !p[key] }))} mode={mode} />
                      </>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-1">
                      <button onClick={handleFindHooks} disabled={!briefReady}
                        className={`flex-1 py-3.5 text-sm transition-all ${briefReady ? "bg-[#E8FF47] text-[#0A0A0B] hover:bg-[#d4eb2a] btn-generate-ready cursor-pointer" : "bg-[#1E1E24] text-[#6B6B72] cursor-not-allowed"}`}
                        style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}>
                        FIND HOOKS →
                      </button>
                      <button onClick={handleRandom}
                        className="px-4 py-3.5 text-sm border border-[#1E1E24] text-[#6B6B72] hover:border-[#FF4F1F]/60 hover:text-[#FF4F1F] transition-all cursor-pointer flex-shrink-0"
                        style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
                        title="Pick a random UK renovation topic and skip straight to the script">
                        RANDOM
                      </button>
                    </div>
                    <p className="text-xs text-[#6B6B72]/60 text-center" style={{ fontFamily: "DM Mono, monospace" }}>RANDOM picks a UK reno topic and generates immediately</p>
                  </div>
                )}

                {/* ── STEP 2: HOOKS ── */}
                {step === 2 && (
                  <HookPicker
                    patterns={patterns}
                    topic={topic}
                    selected={selectedHook}
                    onSelect={setSelectedHook}
                    onContinue={handleBuildConcepts}
                    isLoading={hooksLoading}
                  />
                )}

                {/* ── STEP 3: CONCEPTS ── */}
                {step === 3 && (
                  <ConceptPicker
                    concepts={concepts}
                    selected={selectedConceptId}
                    onSelect={setSelectedConceptId}
                    onContinue={handleGenerateScript}
                    isLoading={conceptsLoading}
                    error={conceptsError}
                  />
                )}

                {/* ── STEP 4: SCRIPT (left panel summary) ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    {concepts.find(c => c.id === selectedConceptId) && (
                      <div className="border border-[#E8FF47]/20 bg-[#E8FF47]/3 p-4 space-y-2">
                        <span className="text-xs text-[#E8FF47] uppercase tracking-widest" style={{ fontFamily: "Anton, sans-serif" }}>Generating</span>
                        <p className="text-sm font-mono text-[#F2F2F0]">{concepts.find(c => c.id === selectedConceptId)?.title}</p>
                        <p className="text-xs text-[#6B6B72] font-mono italic">&ldquo;{concepts.find(c => c.id === selectedConceptId)?.hook}&rdquo;</p>
                      </div>
                    )}
                    <div className="space-y-2 text-xs text-[#6B6B72] font-mono">
                      <p>Topic: <span className="text-[#F2F2F0]">{topic}</span></p>
                      <p>Platform: <span className="text-[#F2F2F0]">{platform}</span></p>
                      <p>Duration: <span className="text-[#F2F2F0]">{duration}</span></p>
                      <p>Location: <span className="text-[#F2F2F0]">{location}</span></p>
                    </div>
                    <button onClick={() => { setStep(1); resetOutputState(); }}
                      className="w-full py-2.5 text-xs border border-[#1E1E24] text-[#6B6B72] hover:text-[#F2F2F0] hover:border-[#6B6B72] transition-colors"
                      style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}>
                      ← START OVER
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right — output */}
            <div className="flex-1 p-6 overflow-y-auto">
              {step < 4 && (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[#1E1E24] text-center p-8">
                  <div className="text-4xl mb-4 opacity-10" style={{ fontFamily: "Anton, sans-serif" }}>SCRIPT-FORGE</div>
                  <p className="text-sm text-[#6B6B72] font-mono max-w-xs">
                    {step === 1 && "Fill in your brief and hit Find Hooks to begin."}
                    {step === 2 && "Pick a hook — or skip to let Claude choose."}
                    {step === 3 && "Choose a concept. The full script generates next."}
                  </p>
                </div>
              )}

              {step === 4 && (
                <>
                  {generateError && (
                    <div className="mb-4 border border-[#FF4F1F]/50 bg-[#FF4F1F]/5 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F]" />
                        <span className="text-xs text-[#FF4F1F] uppercase tracking-widest" style={{ fontFamily: "Anton, sans-serif" }}>Error</span>
                      </div>
                      <p className="text-sm font-mono text-[#F2F2F0]">{generateError}</p>
                    </div>
                  )}
                  <OutputPanel
                    rawOutput={rawOutput}
                    isGenerating={isGenerating}
                    scrapeStep={scrapeStep}
                    scrapeDetail={scrapeDetail}
                    onRegenerate={() => handleGenerateScript()}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
