"use client";

import type { Platform, Duration, Audience, HookStyle, Tone, Toggles } from "@/lib/build-prompt";
import type { AppMode } from "./ModeTab";
import DurationSelector from "./DurationSelector";
import LocationInput from "./LocationInput";
import ToggleGroup from "./ToggleGroup";

interface InputPanelProps {
  mode: AppMode;
  topic: string;
  platform: Platform;
  duration: Duration;
  location: string;
  audience: Audience;
  hookStyle: HookStyle;
  tone: Tone;
  toggles: Toggles;
  isGenerating: boolean;
  onTopicChange: (v: string) => void;
  onPlatformChange: (v: Platform) => void;
  onDurationChange: (v: Duration) => void;
  onLocationChange: (v: string) => void;
  onAudienceChange: (v: Audience) => void;
  onHookStyleChange: (v: HookStyle) => void;
  onToneChange: (v: Tone) => void;
  onToggleChange: (key: keyof Toggles) => void;
  onGenerate: () => void;
}

const PLATFORMS: Platform[] = ["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook Reels"];
const AUDIENCES: Audience[] = ["First-time renovator", "Experienced homeowner", "Investor"];
const HOOK_STYLES: HookStyle[] = ["Auto", "Inverse", "Disruption", "Question", "Stat-led"];
const TONES: Tone[] = ["High energy", "Calm authority", "Comedic", "Urgent"];

function isReady(mode: AppMode, topic: string, location: string): boolean {
  return topic.trim().length > 2 && location.trim().length > 2;
}

export default function InputPanel({
  mode, topic, platform, duration, location, audience, hookStyle, tone, toggles,
  isGenerating, onTopicChange, onPlatformChange, onDurationChange, onLocationChange,
  onAudienceChange, onHookStyleChange, onToneChange, onToggleChange, onGenerate,
}: InputPanelProps) {
  const ready = isReady(mode, topic, location);

  return (
    <div className="space-y-5">
      {/* Topic */}
      <div>
        <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
          Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. loft conversion planning mistakes"
          className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono placeholder:text-[#6B6B72]/50 focus:outline-none focus:border-[#E8FF47]/50 transition-colors"
        />
      </div>

      {/* Platform */}
      <div>
        <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value as Platform)}
          className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <DurationSelector value={duration} onChange={onDurationChange} />

      {/* Location */}
      <LocationInput value={location} onChange={onLocationChange} />

      {/* Forge-only fields */}
      {mode === "forge" && (
        <>
          <div>
            <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
              Target Audience
            </label>
            <select
              value={audience}
              onChange={(e) => onAudienceChange(e.target.value as Audience)}
              className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer"
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
              Hook Style
            </label>
            <select
              value={hookStyle}
              onChange={(e) => onHookStyleChange(e.target.value as HookStyle)}
              className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer"
            >
              {HOOK_STYLES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => onToneChange(e.target.value as Tone)}
              className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#E8FF47]/50 transition-colors appearance-none cursor-pointer"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Toggles */}
      <ToggleGroup toggles={toggles} onChange={onToggleChange} mode={mode} />

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!ready || isGenerating}
        className={`
          w-full py-3.5 text-sm font-display tracking-widest transition-all duration-200 mt-2
          ${ready && !isGenerating
            ? "bg-[#E8FF47] text-[#0A0A0B] hover:bg-[#d4eb2a] btn-generate-ready cursor-pointer"
            : "bg-[#1E1E24] text-[#6B6B72] cursor-not-allowed"
          }
          ${isGenerating ? "opacity-70" : ""}
        `}
        style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
      >
        {isGenerating ? "GENERATING..." : "GENERATE SCRIPT"}
      </button>
    </div>
  );
}
