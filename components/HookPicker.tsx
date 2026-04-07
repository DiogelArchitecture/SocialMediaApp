"use client";

import type { PatternData, HookSource } from "@/lib/build-prompt";

export interface SavedIdea {
  id: string;
  text: string;
  pattern_type: string;
  views?: number;
  avg_er?: number;
  source_url?: string;
  savedAt: string;
}

interface HookPickerProps {
  patterns: PatternData | null;
  topic: string;
  selected: string | null;
  onSelect: (hook: string) => void;
  onContinue: () => void;
  isLoading: boolean;
  savedIdeas: SavedIdea[];
  onToggleSave: (hook: HookSource) => void;
}

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  "Stat Drop":    "Lead with a number that reframes the situation immediately.",
  "Myth Bust":    "Call out what everyone believes — then flip it.",
  "Disruption":   "Say the thing people aren't saying. Stop. Challenge. Redirect.",
  "Question":     "Open a loop the viewer needs closed.",
  "Before/After": "Show the transformation. Make the gap feel real.",
  "Cost Hook":    "Anchor on price or value — the number does the work.",
  "Inverse Hook": "Start where everyone else ends. Reverse the expected narrative.",
};

function formatNumber(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const PLATFORM_COLOURS: Record<string, string> = {
  TikTok: "text-[#F2F2F0] border-[#F2F2F0]/20",
  "Instagram Reels": "text-[#E040FB] border-[#E040FB]/20",
  "YouTube Shorts": "text-[#FF4F1F] border-[#FF4F1F]/20",
  "Facebook Reels": "text-[#4A90D9] border-[#4A90D9]/20",
};

function HookCard({
  hook,
  isSelected,
  isSaved,
  onSelect,
  onToggleSave,
}: {
  hook: HookSource;
  isSelected: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
}) {
  const platformColour = PLATFORM_COLOURS[hook.source_platform ?? ""] ?? "text-[#6B6B72] border-[#6B6B72]/20";
  const formatDescription = FORMAT_DESCRIPTIONS[hook.pattern_type] ?? null;

  return (
    <div className={`border transition-all duration-150 ${isSelected ? "border-[#E8FF47] bg-[#E8FF47]/5" : "border-[#1E1E24] hover:border-[#6B6B72]"}`}>
      {/* Main hook row */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Radio */}
          <button onClick={onSelect} className="mt-1 flex-shrink-0">
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? "border-[#E8FF47] bg-[#E8FF47]" : "border-[#6B6B72]"}`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0A0A0B]" />}
            </div>
          </button>

          <div className="flex-1 min-w-0">
            {/* Hook text */}
            <button onClick={onSelect} className="w-full text-left">
              <p className="text-sm font-mono text-[#F2F2F0] leading-snug mb-1.5">
                &ldquo;{hook.text}&rdquo;
              </p>
            </button>

            {/* Format description */}
            {formatDescription && (
              <p className="text-xs text-[#6B6B72] italic mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
                {hook.pattern_type}: {formatDescription}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-[#E8FF47] font-medium">
                {(hook.avg_er * 100).toFixed(1)}% ER
              </span>
              {hook.views !== undefined && (
                <span className="text-xs text-[#6B6B72] font-mono">{formatNumber(hook.views)} views</span>
              )}
              {hook.likes !== undefined && (
                <span className="text-xs text-[#6B6B72] font-mono">{formatNumber(hook.likes)} likes</span>
              )}
              {hook.pattern_type && (
                <span className="text-xs border border-[#1E1E24] text-[#6B6B72] px-1.5 py-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
                  {hook.pattern_type}
                </span>
              )}
              {hook.source_platform && (
                <span className={`text-xs border px-1.5 py-0.5 ${platformColour}`} style={{ fontFamily: "Inter, sans-serif" }}>
                  {hook.source_platform}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
            title={isSaved ? "Remove from ideas" : "Save as idea"}
            className={`flex-shrink-0 text-base transition-colors px-1 ${isSaved ? "text-[#E8FF47]" : "text-[#6B6B72] hover:text-[#E8FF47]"}`}
          >
            {isSaved ? "★" : "☆"}
          </button>
        </div>
      </div>

      {/* Source link */}
      {hook.source_url && (
        <div className="px-3 pb-3 pt-0 flex items-center gap-2 border-t border-[#1E1E24]/60">
          <a
            href={hook.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors flex items-center gap-1.5 group"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <span className="text-[10px] border border-[#1E1E24] group-hover:border-[#E8FF47]/50 px-1.5 py-0.5 transition-colors">WATCH →</span>
            <span className="truncate max-w-[200px] opacity-50 group-hover:opacity-100 transition-opacity">
              {hook.source_url.replace(/^https?:\/\//, "").split("?")[0]}
            </span>
          </a>
          {hook.comments !== undefined && (
            <span className="text-xs text-[#6B6B72]/60 font-mono ml-auto">
              {formatNumber(hook.comments)} comments · {formatNumber(hook.shares)} shares
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function HookPicker({ patterns, topic, selected, onSelect, onContinue, isLoading, savedIdeas, onToggleSave }: HookPickerProps) {
  const hooks = patterns?.hooks ?? [];
  const scrapedAt = patterns?.scrapedAt
    ? new Date(patterns.scrapedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[#6B6B72] font-mono mb-1">
          Hooks for <span className="text-[#F2F2F0]">{topic}</span>
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
            Pick the hook that fits — or skip and let Claude choose. ☆ to save ideas.
          </p>
          {scrapedAt && (
            <span className="text-xs text-[#6B6B72]/50 font-mono flex-shrink-0 ml-2">scraped {scrapedAt}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-8">
          <div className="flex gap-1">
            {[0, 150, 300].map((d) => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <span className="text-xs text-[#6B6B72] font-mono">Loading pattern library...</span>
        </div>
      ) : hooks.length === 0 ? (
        <div className="border border-dashed border-[#1E1E24] p-6 text-center">
          <p className="text-sm text-[#6B6B72] font-mono mb-1">No hooks scraped yet.</p>
          <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
            Run a scrape in Forge mode to pull live hooks with source links.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hooks.slice(0, 10).map((hook, i) => (
            <HookCard
              key={i}
              hook={hook}
              isSelected={selected === hook.text}
              isSaved={savedIdeas.some((s) => s.id === hook.text.slice(0, 80))}
              onSelect={() => onSelect(selected === hook.text ? "" : hook.text)}
              onToggleSave={() => onToggleSave(hook)}
            />
          ))}
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-3 text-sm bg-[#E8FF47] text-[#0A0A0B] hover:bg-[#d4eb2a] transition-colors"
        style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
      >
        {selected ? "BUILD CONCEPTS WITH THIS HOOK →" : "BUILD CONCEPTS (AUTO HOOK) →"}
      </button>
    </div>
  );
}
