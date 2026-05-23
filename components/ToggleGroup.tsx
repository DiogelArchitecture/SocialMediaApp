"use client";

import type { Toggles, Platform } from "@/lib/build-prompt";
import { isLongFormPlatform } from "@/lib/build-prompt";
import type { AppMode } from "./ModeTab";

interface ToggleGroupProps {
  toggles: Toggles;
  onChange: (key: keyof Toggles) => void;
  mode: AppMode;
  platform: Platform;
}

interface ToggleDef {
  key: keyof Toggles;
  label: string;
  description: string;
  forgeOnly?: boolean;
  shortFormOnly?: boolean;
  longFormOnly?: boolean;
}

const TOGGLE_DEFS: ToggleDef[] = [
  // Short-form only
  { key: "viralCut",      label: "Full viral cut",          description: "30s HOOK / RETAIN / REWARD version",                  shortFormOnly: true },
  { key: "shotList",      label: "Shot list",               description: "Numbered shots with visual, audio & text" },
  { key: "propsList",     label: "Props list",              description: "Min 3 props with usage and rationale",                 forgeOnly: true, shortFormOnly: true },
  { key: "editNotes",     label: "Edit notes",              description: "Cuts, captions, overlays, loop mechanic",              forgeOnly: true, shortFormOnly: true },
  { key: "vfxIdeas",      label: "VFX / AI overlay ideas",  description: "Specific VFX moments for editor",                     forgeOnly: true, shortFormOnly: true },
  { key: "packagingIdeas",label: "Packaging ideas",         description: "3 title/thumbnail concepts",                          forgeOnly: true, shortFormOnly: true },
  { key: "scrapeFresh",   label: "Scrape fresh data",       description: "Trigger Apify — bypasses cache",                      forgeOnly: true },
  { key: "equipment",     label: "Equipment list",          description: "Camera, audio & gear for the shoot location",          forgeOnly: true },
  { key: "filmingTips",   label: "Filming tips",            description: "3–5 practical tips referencing shot numbers",          forgeOnly: true },
  { key: "caption",       label: "Social caption",          description: "Platform-native caption with hashtags",               forgeOnly: true, shortFormOnly: true },
  // Long-form only (YouTube)
  { key: "chapterMarkers",label: "Chapter markers",         description: "Timestamped chapters for YouTube description",        forgeOnly: true, longFormOnly: true },
  { key: "youtubeCta",    label: "YouTube CTA block",       description: "Subscribe / comment / next video prompts",            forgeOnly: true, longFormOnly: true },
];

export default function ToggleGroup({ toggles, onChange, mode, platform }: ToggleGroupProps) {
  const isLong = isLongFormPlatform(platform);
  const visible = TOGGLE_DEFS.filter((t) => {
    if (mode === "quick" && t.forgeOnly) return false;
    if (isLong && t.shortFormOnly) return false;
    if (!isLong && t.longFormOnly) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-[#6B6B72] mb-3 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
          Output Options
        </label>
        <div className="space-y-2">
          {visible.map((def) => (
            <div
              key={def.key}
              className="flex items-center justify-between py-2 border-b border-[#1E1E24]/60 last:border-0"
            >
              <div>
                <p className="text-sm text-[#F2F2F0] font-mono">{def.label}</p>
                <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                  {def.description}
                </p>
              </div>
              <label className="toggle-switch flex-shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={toggles[def.key]}
                  onChange={() => onChange(def.key)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {!isLong && (
        <div
          className={`rounded-lg border p-4 transition-colors ${
            toggles.boardGameMode
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-[#1E1E24] bg-[#0D0D10]"
          }`}
        >
          <label className="block text-xs mb-3 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif", color: toggles.boardGameMode ? "#f97316" : "#6B6B72" }}>
            Video Style
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-mono font-semibold ${toggles.boardGameMode ? "text-orange-400" : "text-[#F2F2F0]"}`}>
                Board Game Mode
              </p>
              <p className="text-xs mt-0.5" style={{ fontFamily: "Inter, sans-serif", color: toggles.boardGameMode ? "#fb923c" : "#6B6B72" }}>
                First 40s in board game world — then homeowner pivot
              </p>
            </div>
            <label className="toggle-switch flex-shrink-0 ml-4">
              <input
                type="checkbox"
                checked={toggles.boardGameMode}
                onChange={() => onChange("boardGameMode")}
              />
              <span className="toggle-slider" style={toggles.boardGameMode ? { backgroundColor: "#f97316" } : {}} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
