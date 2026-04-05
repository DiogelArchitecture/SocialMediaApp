"use client";

import type { ScriptConcept } from "@/app/api/concepts/route";

interface ConceptPickerProps {
  concepts: ScriptConcept[];
  selected: string | null;
  onSelect: (id: string) => void;
  onContinue?: () => void;
  isLoading: boolean;
  error?: string | null;
}

const CTA_LABELS = {
  soft: { label: "Save this", colour: "text-[#6B6B72] border-[#6B6B72]/40" },
  hard: { label: "Book a call", colour: "text-[#FF4F1F] border-[#FF4F1F]/40" },
  curiosity: { label: "Comment bait", colour: "text-[#E8FF47] border-[#E8FF47]/40" },
};

export default function ConceptPicker({ concepts, selected, onSelect, onContinue, isLoading, error }: ConceptPickerProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 py-4">
          <div className="flex gap-1">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <span className="text-xs text-[#6B6B72] font-mono">Building 3 concepts...</span>
        </div>
        {/* Skeleton cards */}
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-[#1E1E24] p-4 animate-pulse space-y-2">
            <div className="h-3 bg-[#1E1E24] rounded w-1/3" />
            <div className="h-4 bg-[#1E1E24] rounded w-2/3" />
            <div className="h-3 bg-[#1E1E24] rounded w-full" />
            <div className="h-3 bg-[#1E1E24] rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[#FF4F1F]/40 bg-[#FF4F1F]/5 p-4">
        <p className="text-sm font-mono text-[#FF4F1F]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
          3 different angles — pick the one that feels right.
        </p>
      </div>

      <div className="space-y-3">
        {concepts.map((concept, i) => {
          const isSelected = selected === concept.id;
          const ctaStyle = CTA_LABELS[concept.cta] ?? CTA_LABELS.soft;

          return (
            <button
              key={concept.id}
              onClick={() => onSelect(isSelected ? "" : concept.id)}
              className={`w-full text-left p-4 border transition-all duration-150 ${
                isSelected ? "border-[#E8FF47] bg-[#E8FF47]/5" : "border-[#1E1E24] hover:border-[#6B6B72]"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Number / selector */}
                <div
                  className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs mt-0.5 transition-all ${
                    isSelected ? "bg-[#E8FF47] text-[#0A0A0B]" : "bg-[#1E1E24] text-[#6B6B72]"
                  }`}
                  style={{ fontFamily: "Anton, sans-serif" }}
                >
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Format + CTA badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs border border-[#E8FF47]/30 text-[#E8FF47] px-1.5 py-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
                      {concept.format}
                    </span>
                    <span className={`text-xs border px-1.5 py-0.5 ${ctaStyle.colour}`} style={{ fontFamily: "Inter, sans-serif" }}>
                      {ctaStyle.label}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-base text-[#F2F2F0]" style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.05em" }}>
                    {concept.title}
                  </p>

                  {/* Hook */}
                  <p className="text-sm font-mono text-[#E8FF47] italic">&ldquo;{concept.hook}&rdquo;</p>

                  {/* Belief */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#FF4F1F] flex-shrink-0 font-mono mt-0.5">CHALLENGES:</span>
                    <p className="text-xs text-[#6B6B72] font-mono">{concept.belief}</p>
                  </div>

                  {/* Premise */}
                  <p className="text-xs text-[#F2F2F0]/70 font-mono leading-relaxed">{concept.premise}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          onClick={onContinue}
          className="w-full py-3 text-sm bg-[#E8FF47] text-[#0A0A0B] hover:bg-[#d4eb2a] transition-colors card-enter"
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
        >
          GENERATE FULL SCRIPT →
        </button>
      )}
    </div>
  );
}
