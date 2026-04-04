"use client";

import { useState } from "react";
import type { PatternData } from "@/lib/build-prompt";

interface PatternEntry {
  platform: string;
  niche: string;
  data: PatternData;
}

interface PatternLibraryProps {
  patterns: PatternEntry[];
  onUseHook?: (hookText: string) => void;
  onUseCta?: (ctaPhrase: string) => void;
}

type FilterType = "all" | "soft" | "hard" | "curiosity";
type HookFilterType = "all" | "inverse" | "stat" | "question" | "disruption";

export default function PatternLibrary({ patterns, onUseHook, onUseCta }: PatternLibraryProps) {
  const [activeTab, setActiveTab] = useState<"hooks" | "ctas" | "formats">("hooks");
  const [ctaFilter, setCtaFilter] = useState<FilterType>("all");

  const allHooks = patterns.flatMap((p) =>
    p.data.hooks.map((h) => ({ ...h, platform: p.platform, niche: p.niche, date: p.data.scrapedAt }))
  );
  const allCtas = patterns.flatMap((p) =>
    p.data.ctas.map((c) => ({ ...c, platform: p.platform, niche: p.niche }))
  );
  const allFormats = patterns.flatMap((p) =>
    p.data.formats.map((f) => ({ ...f, platform: p.platform, niche: p.niche }))
  );

  const filteredCtas = ctaFilter === "all" ? allCtas : allCtas.filter((c) => c.type === ctaFilter);

  if (!patterns.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#6B6B72] font-mono">
          No patterns yet. Run a Forge with Scrape Fresh Data enabled to populate the library.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1E1E24]">
        {(["hooks", "ctas", "formats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#E8FF47] text-[#E8FF47]"
                : "border-transparent text-[#6B6B72] hover:text-[#F2F2F0]"
            }`}
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Hooks tab */}
      {activeTab === "hooks" && (
        <div className="space-y-2">
          {allHooks.length === 0 ? (
            <p className="text-sm text-[#6B6B72] font-mono">No hooks scraped yet.</p>
          ) : (
            allHooks
              .sort((a, b) => (b.avg_er ?? 0) - (a.avg_er ?? 0))
              .map((hook, i) => (
                <div key={i} className="bg-[#111114] border border-[#1E1E24] p-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[#F2F2F0] mb-1">&ldquo;{hook.text}&rdquo;</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-[#E8FF47] font-mono">
                        ER: {(hook.avg_er * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                        n={hook.sample_count}
                      </span>
                      <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                        {hook.platform}
                      </span>
                      {hook.pattern_type && (
                        <span className="text-xs text-[#6B6B72] border border-[#1E1E24] px-1.5 py-0.5">
                          {hook.pattern_type}
                        </span>
                      )}
                    </div>
                  </div>
                  {onUseHook && (
                    <button
                      onClick={() => onUseHook(hook.text)}
                      className="text-xs text-[#E8FF47] border border-[#E8FF47]/30 px-2 py-1 hover:bg-[#E8FF47]/10 transition-colors whitespace-nowrap flex-shrink-0"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Use in Forge →
                    </button>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* CTAs tab */}
      {activeTab === "ctas" && (
        <div>
          <div className="flex gap-2 mb-4">
            {(["all", "soft", "hard", "curiosity"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setCtaFilter(f)}
                className={`px-3 py-1 text-xs border transition-colors ${
                  ctaFilter === f
                    ? "border-[#E8FF47] text-[#E8FF47]"
                    : "border-[#1E1E24] text-[#6B6B72] hover:text-[#F2F2F0]"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredCtas.length === 0 ? (
              <p className="text-sm text-[#6B6B72] font-mono">No CTAs matching filter.</p>
            ) : (
              filteredCtas.map((cta, i) => (
                <div key={i} className="bg-[#111114] border border-[#1E1E24] p-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[#F2F2F0] mb-1">&ldquo;{cta.phrase}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs border px-1.5 py-0.5 ${
                        cta.type === "hard" ? "border-[#FF4F1F]/50 text-[#FF4F1F]"
                        : cta.type === "curiosity" ? "border-[#E8FF47]/50 text-[#E8FF47]"
                        : "border-[#6B6B72]/50 text-[#6B6B72]"
                      }`} style={{ fontFamily: "Inter, sans-serif" }}>
                        {cta.type}
                      </span>
                      <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                        {cta.platform}
                      </span>
                    </div>
                  </div>
                  {onUseCta && (
                    <button
                      onClick={() => onUseCta(cta.phrase)}
                      className="text-xs text-[#E8FF47] border border-[#E8FF47]/30 px-2 py-1 hover:bg-[#E8FF47]/10 transition-colors whitespace-nowrap flex-shrink-0"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Use in Forge →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Formats tab */}
      {activeTab === "formats" && (
        <div className="space-y-2">
          {allFormats.length === 0 ? (
            <p className="text-sm text-[#6B6B72] font-mono">No formats scraped yet.</p>
          ) : (
            allFormats.map((fmt, i) => (
              <div key={i} className="bg-[#111114] border border-[#1E1E24] p-3">
                <p className="text-sm font-mono text-[#F2F2F0] mb-1">{fmt.description}</p>
                {fmt.structure && (
                  <p className="text-xs text-[#6B6B72] font-mono">{fmt.structure}</p>
                )}
                <p className="text-xs text-[#6B6B72] mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                  {fmt.platform} — {fmt.niche}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
