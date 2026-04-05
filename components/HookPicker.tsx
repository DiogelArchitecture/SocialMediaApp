"use client";

import type { PatternData } from "@/lib/build-prompt";

interface HookPickerProps {
  patterns: PatternData | null;
  topic: string;
  selected: string | null;
  onSelect: (hook: string) => void;
  onContinue: () => void;
  isLoading: boolean;
}

export default function HookPicker({ patterns, topic, selected, onSelect, onContinue, isLoading }: HookPickerProps) {
  const hooks = patterns?.hooks ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[#6B6B72] font-mono mb-1">
          Top hooks for <span className="text-[#F2F2F0]">{topic}</span>
        </p>
        <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
          Pick the hook that fits best — or skip to let Claude choose.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-8">
          <div className="flex gap-1">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <span className="text-xs text-[#6B6B72] font-mono">Fetching hooks...</span>
        </div>
      ) : hooks.length === 0 ? (
        <div className="border border-dashed border-[#1E1E24] p-6 text-center">
          <p className="text-sm text-[#6B6B72] font-mono mb-1">No scraped hooks for this topic yet.</p>
          <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
            Using pattern library. Enable "Scrape fresh data" in Forge mode to pull live results.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hooks.slice(0, 8).map((hook, i) => (
            <button
              key={i}
              onClick={() => onSelect(selected === hook.text ? "" : hook.text)}
              className={`w-full text-left p-3 border transition-all duration-150 ${
                selected === hook.text
                  ? "border-[#E8FF47] bg-[#E8FF47]/5"
                  : "border-[#1E1E24] hover:border-[#6B6B72]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  selected === hook.text ? "border-[#E8FF47] bg-[#E8FF47]" : "border-[#6B6B72]"
                }`}>
                  {selected === hook.text && (
                    <div className="w-2 h-2 rounded-full bg-[#0A0A0B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-[#F2F2F0] leading-snug">&ldquo;{hook.text}&rdquo;</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-mono text-[#E8FF47]">
                      {(hook.avg_er * 100).toFixed(1)}% ER
                    </span>
                    {hook.pattern_type && (
                      <span className="text-xs text-[#6B6B72] border border-[#1E1E24] px-1.5 py-0.5">
                        {hook.pattern_type}
                      </span>
                    )}
                    <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                      n={hook.sample_count}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onContinue}
          className="flex-1 py-3 text-sm bg-[#E8FF47] text-[#0A0A0B] hover:bg-[#d4eb2a] transition-colors"
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
        >
          {selected ? "BUILD CONCEPTS WITH THIS HOOK →" : "BUILD CONCEPTS (AUTO HOOK) →"}
        </button>
      </div>
    </div>
  );
}
