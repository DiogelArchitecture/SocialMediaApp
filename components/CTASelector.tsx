"use client";

import type { PatternData } from "@/lib/build-prompt";

type CTAType = "soft" | "hard" | "curiosity";

interface CTASelectorProps {
  selected: CTAType | null;
  phrase: string;
  patterns: PatternData | null;
  onSelectType: (type: CTAType) => void;
  onEditPhrase: (phrase: string) => void;
}

export const DEFAULT_CTA_PHRASES: Record<CTAType, string> = {
  soft: "Save this for when you start planning.",
  hard: "Book a Build, Wait or Move Call via the link in bio.",
  curiosity: "Comment 'PLANS' and I'll tell you exactly what yours needs.",
};

const TYPE_META: Record<CTAType, { label: string; activeColour: string; dot: string; description: string }> = {
  soft: {
    label: "SOFT",
    activeColour: "text-[#6B6B72]",
    dot: "#6B6B72",
    description: "Saves & follows — reference content",
  },
  hard: {
    label: "HARD",
    activeColour: "text-[#FF4F1F]",
    dot: "#FF4F1F",
    description: "Direct booking — decision-stage content",
  },
  curiosity: {
    label: "CURIOSITY",
    activeColour: "text-[#E8FF47]",
    dot: "#E8FF47",
    description: "Comment engagement — personalised offer",
  },
};

export default function CTASelector({ selected, phrase, patterns, onSelectType, onEditPhrase }: CTASelectorProps) {
  function getDefaultPhrase(type: CTAType): string {
    return patterns?.ctas?.find(c => c.type === type)?.phrase ?? DEFAULT_CTA_PHRASES[type];
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" />
        <span
          className="text-xs uppercase tracking-widest text-[#E8FF47]"
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
        >
          Choose CTA
        </span>
      </div>

      {(["soft", "hard", "curiosity"] as CTAType[]).map(type => {
        const meta = TYPE_META[type];
        const isSelected = selected === type;

        return (
          <div
            key={type}
            onClick={() => {
              onSelectType(type);
              if (!isSelected) onEditPhrase(getDefaultPhrase(type));
            }}
            className={`border p-3 cursor-pointer transition-all ${
              isSelected
                ? "border-[#E8FF47]/40 bg-[#E8FF47]/5"
                : "border-[#1E1E24] hover:border-[#6B6B72]/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isSelected ? meta.dot : "#2A2A30" }}
              />
              <span
                className={`text-xs uppercase tracking-widest ${isSelected ? meta.activeColour : "text-[#3A3A40]"}`}
                style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
              >
                {meta.label}
              </span>
              <span className="text-xs text-[#6B6B72]/60" style={{ fontFamily: "Inter, sans-serif" }}>
                {meta.description}
              </span>
            </div>

            {isSelected ? (
              <textarea
                value={phrase}
                onChange={e => onEditPhrase(e.target.value)}
                onClick={e => e.stopPropagation()}
                rows={2}
                className="w-full bg-[#0A0A0B] border border-[#1E1E24] text-sm text-[#F2F2F0] font-mono px-2 py-1.5 resize-none focus:outline-none focus:border-[#E8FF47]/40 transition-colors mt-1"
                placeholder="Type your CTA..."
              />
            ) : (
              <p className="text-xs font-mono text-[#6B6B72]/50 truncate">
                {getDefaultPhrase(type)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
