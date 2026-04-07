"use client";

import { useState } from "react";
import { parseStreamingOutput, SECTION_ORDER, SECTION_LABELS, type SectionKey } from "@/lib/parse-output";
import OutputCard from "./OutputCard";
import ScrapeProgress, { type ScrapeStep } from "./ScrapeProgress";

interface OutputPanelProps {
  rawOutput: string;
  isGenerating: boolean;
  scrapeStep: ScrapeStep;
  scrapeDetail?: string;
  onRegenerate?: (section: SectionKey) => void;
  topic?: string;
  platform?: string;
  selectedHook?: string | null;
}

export default function OutputPanel({
  rawOutput,
  isGenerating,
  scrapeStep,
  scrapeDetail,
  onRegenerate,
  topic,
  platform,
  selectedHook,
}: OutputPanelProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [saved, setSaved] = useState(false);
  const parsed = parseStreamingOutput(rawOutput);
  const availableSections = SECTION_ORDER.filter((key) => parsed[key]);

  const isEmpty = !rawOutput && scrapeStep === "idle" && !isGenerating;
  const isDone = !isGenerating && availableSections.length > 0;

  function buildPlainText(): string {
    return availableSections
      .map((key) => `${SECTION_LABELS[key].toUpperCase()}\n${"─".repeat(40)}\n${parsed[key]}`)
      .join("\n\n");
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(buildPlainText());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function handleSave() {
    const scripts = (() => { try { return JSON.parse(localStorage.getItem("replanit-scripts") ?? "[]"); } catch { return []; } })();
    const entry = {
      id: Date.now().toString(),
      topic: topic ?? "Untitled",
      platform: platform ?? "",
      date: new Date().toISOString(),
      hook: selectedHook ?? parsed.hook ?? "",
      sections: Object.fromEntries(availableSections.map((k) => [k, parsed[k] ?? ""])),
    };
    scripts.unshift(entry);
    localStorage.setItem("replanit-scripts", JSON.stringify(scripts.slice(0, 30)));
    setSaved(true);
  }

  function handleExportTxt() {
    const text = buildPlainText();
    const slug = (topic || "script").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().split("T")[0];
    const filename = `${slug}-${date}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 min-h-[400px]">
      {/* Scrape progress */}
      {scrapeStep !== "idle" && (
        <ScrapeProgress step={scrapeStep} detail={scrapeDetail} />
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[#1E1E24] text-center p-8">
          <div className="text-4xl mb-4 opacity-20" style={{ fontFamily: "Anton, sans-serif" }}>
            SCRIPT-FORGE
          </div>
          <p className="text-sm text-[#6B6B72] font-mono max-w-sm">
            Fill in the inputs and hit Generate. Your script will appear here, section by section.
          </p>
          <p className="text-xs text-[#6B6B72]/60 mt-3 font-mono">
            Built on what&apos;s already working.
          </p>
        </div>
      )}

      {/* Generating indicator (before first content) */}
      {isGenerating && !rawOutput && (
        <div className="flex items-center gap-3 py-4 px-4 bg-[#111114] border border-[#1E1E24]">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-mono text-[#6B6B72]">Generating script...</span>
        </div>
      )}

      {/* Copy All + Export bar — shown once generation is complete */}
      {isDone && (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 transition-colors ${saved ? "border-[#E8FF47]/50 text-[#E8FF47]" : "border-[#1E1E24] text-[#6B6B72] hover:text-[#E8FF47] hover:border-[#E8FF47]/50"}`}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {saved ? "★ Saved" : "★ Save"}
          </button>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-[#6B6B72] hover:text-[#E8FF47] border border-[#1E1E24] hover:border-[#E8FF47]/50 px-3 py-1.5 transition-colors"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {copiedAll ? "✓ Copied" : "Copy All"}
          </button>
          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 text-xs text-[#6B6B72] hover:text-[#E8FF47] border border-[#1E1E24] hover:border-[#E8FF47]/50 px-3 py-1.5 transition-colors"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Export TXT ↓
          </button>
        </div>
      )}

      {/* Output sections */}
      {availableSections.map((key) => (
        <OutputCard
          key={key}
          section={key}
          content={parsed[key] ?? ""}
          onRegenerate={onRegenerate}
          isStreaming={isGenerating && key === availableSections[availableSections.length - 1]}
        />
      ))}

      {/* Streaming raw (before any delimiters appear) */}
      {isGenerating && rawOutput && availableSections.length === 0 && (
        <div className="bg-[#111114] border border-[#1E1E24] p-4">
          <pre className="text-sm text-[#F2F2F0] font-mono whitespace-pre-wrap leading-relaxed">
            {rawOutput}
            <span className="inline-block w-1.5 h-4 bg-[#E8FF47] ml-0.5 animate-pulse" />
          </pre>
        </div>
      )}
    </div>
  );
}
