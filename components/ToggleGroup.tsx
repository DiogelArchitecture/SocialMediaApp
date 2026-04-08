"use client";

import type { Toggles } from "@/lib/build-prompt";
import type { AppMode } from "./ModeTab";

interface ToggleGroupProps {
  toggles: Toggles;
  onChange: (key: keyof Toggles) => void;
  mode: AppMode;
}

interface ToggleDef {
  key: keyof Toggles;
  label: string;
  description: string;
  forgeOnly?: boolean;
}

const TOGGLE_DEFS: ToggleDef[] = [
  { key: "viralCut", label: "Full viral cut", description: "30s HOOK / RETAIN / REWARD version" },
  { key: "shotList", label: "Shot list", description: "Numbered shots with visual, audio & text" },
  { key: "propsList", label: "Props list", description: "Min 3 props with usage and rationale", forgeOnly: true },
  { key: "editNotes", label: "Edit notes", description: "Cuts, captions, overlays, loop mechanic", forgeOnly: true },
  { key: "vfxIdeas", label: "VFX / AI overlay ideas", description: "Specific VFX moments for editor", forgeOnly: true },
  { key: "packagingIdeas", label: "Packaging ideas", description: "3 title/thumbnail concepts", forgeOnly: true },
  { key: "scrapeFresh",   label: "Scrape fresh data",  description: "Trigger Apify — bypasses cache",               forgeOnly: true },
  { key: "equipment",    label: "Equipment list",     description: "Camera, audio & gear for the shoot location",  forgeOnly: true },
  { key: "filmingTips",  label: "Filming tips",       description: "3–5 practical tips referencing shot numbers",  forgeOnly: true },
  { key: "caption",      label: "Social caption",     description: "Platform-native caption with hashtags",        forgeOnly: true },
];

export default function ToggleGroup({ toggles, onChange, mode }: ToggleGroupProps) {
  const visible = TOGGLE_DEFS.filter((t) => {
    if (mode === "quick" && t.forgeOnly) return false;
    return true;
  });

  return (
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
  );
}
