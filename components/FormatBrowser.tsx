"use client";

import { useState } from "react";
import type { FormatEntry } from "@/lib/pattern-store";

interface FormatBrowserProps {
  formats: FormatEntry[];
  onForgeWithFormat?: (formatName: string) => void;
}

const CATEGORIES = [
  "All",
  "Challenge",
  "Education",
  "Storytelling",
  "Skits",
  "Wait For It",
  "Inverse Hook",
];

export default function FormatBrowser({ formats, onForgeWithFormat }: FormatBrowserProps) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? formats
    : formats.filter((f) => f.category === activeCategory);

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              activeCategory === cat
                ? cat === "Inverse Hook"
                  ? "border-[#E8FF47] bg-[#E8FF47] text-[#0A0A0B]"
                  : "border-[#E8FF47] text-[#E8FF47]"
                : "border-[#1E1E24] text-[#6B6B72] hover:text-[#F2F2F0] hover:border-[#6B6B72]"
            }`}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Format cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((fmt) => (
          <div
            key={fmt.id}
            className={`bg-[#111114] border p-5 ${
              fmt.category === "Inverse Hook"
                ? "border-[#E8FF47]/30"
                : "border-[#1E1E24]"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {fmt.category === "Inverse Hook" && (
                    <span className="text-[9px] text-[#0A0A0B] bg-[#E8FF47] px-1.5 py-0.5 font-mono">
                      ADAM&apos;S FORMAT
                    </span>
                  )}
                  <span
                    className="text-xs text-[#6B6B72] uppercase tracking-widest"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {fmt.category}
                  </span>
                </div>
                <h3
                  className="text-base text-[#F2F2F0]"
                  style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.05em" }}
                >
                  {fmt.name}
                </h3>
              </div>
              {fmt.er_range && (
                <span className="text-xs font-mono text-[#E8FF47] flex-shrink-0">
                  {fmt.er_range} ER
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-[#6B6B72] mb-3 font-mono">{fmt.description}</p>

            {/* Structure */}
            {fmt.structure && (
              <div className="bg-[#0A0A0B] border border-[#1E1E24] p-3 mb-3">
                <p className="text-xs text-[#6B6B72] mb-1 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
                  Structure
                </p>
                <p className="text-xs font-mono text-[#F2F2F0]/80 whitespace-pre-line">{fmt.structure}</p>
              </div>
            )}

            {/* Example hook */}
            {fmt.example_hook && (
              <div className="mb-4">
                <p className="text-xs text-[#6B6B72] mb-1 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
                  Example Hook
                </p>
                <p className="text-sm font-mono text-[#F2F2F0] italic">&ldquo;{fmt.example_hook}&rdquo;</p>
              </div>
            )}

            {/* CTA */}
            {onForgeWithFormat && (
              <button
                onClick={() => onForgeWithFormat(fmt.name)}
                className="w-full py-2 text-xs bg-[#1E1E24] text-[#E8FF47] hover:bg-[#E8FF47] hover:text-[#0A0A0B] transition-all border border-[#E8FF47]/20 hover:border-[#E8FF47]"
                style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
              >
                FORGE WITH THIS FORMAT →
              </button>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[#6B6B72] font-mono text-center py-8">
          No formats in this category yet.
        </p>
      )}
    </div>
  );
}
