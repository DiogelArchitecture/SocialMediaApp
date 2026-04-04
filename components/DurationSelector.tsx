"use client";

import type { Duration } from "@/lib/build-prompt";

interface DurationSelectorProps {
  value: Duration;
  onChange: (v: Duration) => void;
}

const DURATIONS: Duration[] = ["15s", "30s", "45s", "60s"];

export default function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div>
      <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
        Duration
      </label>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`
              flex-1 py-2 text-xs font-mono border transition-all duration-150
              ${value === d
                ? "border-[#E8FF47] text-[#E8FF47] bg-[#E8FF47]/5"
                : "border-[#1E1E24] text-[#6B6B72] hover:border-[#6B6B72] hover:text-[#F2F2F0]"
              }
            `}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
