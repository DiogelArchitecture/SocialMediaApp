"use client";

import type { AnyDuration, Duration, LongFormDuration, Platform } from "@/lib/build-prompt";
import { isLongFormPlatform } from "@/lib/build-prompt";

interface DurationSelectorProps {
  value: AnyDuration;
  onChange: (v: AnyDuration) => void;
  platform: Platform;
}

const SHORT_DURATIONS: Duration[] = ["15s", "30s", "45s", "60s"];
const LONG_DURATIONS: LongFormDuration[] = ["5min", "10min", "15min", "20min"];

const LONG_WORD_COUNTS: Record<LongFormDuration, string> = {
  "5min": "750w",
  "10min": "1500w",
  "15min": "2250w",
  "20min": "3000w",
};

export default function DurationSelector({ value, onChange, platform }: DurationSelectorProps) {
  const isLong = isLongFormPlatform(platform);
  const options = isLong ? LONG_DURATIONS : SHORT_DURATIONS;

  return (
    <div>
      <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
        Duration
      </label>
      <div className="flex gap-2">
        {options.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`
              flex-1 py-2 text-xs font-mono border transition-all duration-150 flex flex-col items-center gap-0.5
              ${value === d
                ? "border-[#E8FF47] text-[#E8FF47] bg-[#E8FF47]/5"
                : "border-[#1E1E24] text-[#6B6B72] hover:border-[#6B6B72] hover:text-[#F2F2F0]"
              }
            `}
          >
            <span>{d}</span>
            {isLong && (
              <span className="text-[10px] opacity-60">{LONG_WORD_COUNTS[d as LongFormDuration]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
