"use client";

import { useState } from "react";
import type { SectionKey } from "@/lib/parse-output";
import { SECTION_LABELS } from "@/lib/parse-output";

interface OutputCardProps {
  section: SectionKey;
  content: string;
  onRegenerate?: (section: SectionKey) => void;
  isStreaming?: boolean;
  videoDuration?: string;
}

function getShotTiming(content: string, videoDuration?: string): string | null {
  if (!videoDuration) return null;
  const secs = parseInt(videoDuration, 10);
  if (!secs || isNaN(secs)) return null;
  const shotCount = (content.match(/^SHOT \d+/gm) ?? []).length;
  if (shotCount === 0) return null;
  const perShot = (secs / shotCount).toFixed(1);
  return `${shotCount} shots · ~${perShot}s each`;
}

export default function OutputCard({ section, content, onRegenerate, isStreaming, videoDuration }: OutputCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accentColor = section === "belief" ? "#FF4F1F" : section === "hook" ? "#E8FF47" : "#E8FF47";

  // Hero treatment for the hook section
  if (section === "hook") {
    return (
      <div className="card-enter bg-[#111114] border border-[#E8FF47]/30 overflow-hidden">
        {/* Hero header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E8FF47]/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E8FF47]" />
            <span
              className="text-xs uppercase tracking-widest text-[#E8FF47]"
              style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.15em" }}
            >
              {SECTION_LABELS[section]}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors px-2 py-1 border border-[#1E1E24] hover:border-[#E8FF47]/50"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Hero content */}
        <div className="px-5 py-6">
          <p
            className="text-[#E8FF47] leading-tight"
            style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", lineHeight: 1.15 }}
          >
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-6 bg-[#E8FF47] ml-1 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    );
  }

  const shotTiming = section === "shotList" ? getShotTiming(content, videoDuration) : null;

  // Standard card for all other sections
  return (
    <div className="card-enter bg-[#111114] border border-[#1E1E24] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E1E24]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: "Anton, sans-serif", color: accentColor, letterSpacing: "0.1em" }}
          >
            {SECTION_LABELS[section]}
          </span>
          {shotTiming && (
            <span className="text-xs text-[#6B6B72] border border-[#1E1E24] px-1.5 py-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
              {shotTiming}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(section)}
              className="text-xs text-[#6B6B72] hover:text-[#F2F2F0] transition-colors px-2 py-1 border border-[#1E1E24] hover:border-[#6B6B72]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              ↺ Regenerate
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors px-2 py-1 border border-[#1E1E24] hover:border-[#E8FF47]/50"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Card content */}
      <div className="px-4 py-4">
        <pre
          className="text-sm text-[#F2F2F0] font-mono whitespace-pre-wrap leading-relaxed"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-[#E8FF47] ml-0.5 animate-pulse" />
          )}
        </pre>
      </div>
    </div>
  );
}
