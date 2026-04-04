"use client";

import { parseStreamingOutput, SECTION_ORDER, type SectionKey } from "@/lib/parse-output";
import OutputCard from "./OutputCard";
import ScrapeProgress, { type ScrapeStep } from "./ScrapeProgress";

interface OutputPanelProps {
  rawOutput: string;
  isGenerating: boolean;
  scrapeStep: ScrapeStep;
  scrapeDetail?: string;
  onRegenerate?: (section: SectionKey) => void;
}

export default function OutputPanel({
  rawOutput,
  isGenerating,
  scrapeStep,
  scrapeDetail,
  onRegenerate,
}: OutputPanelProps) {
  const parsed = parseStreamingOutput(rawOutput);
  const availableSections = SECTION_ORDER.filter((key) => parsed[key]);

  const isEmpty = !rawOutput && scrapeStep === "idle" && !isGenerating;

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
