"use client";

import type { SpinoffIdea } from "@/lib/analyse";

interface SpinoffCardProps {
  spinoff: SpinoffIdea;
  index: number;
  onForge: (spinoff: SpinoffIdea) => void;
}

export default function SpinoffCard({ spinoff, index, onForge }: SpinoffCardProps) {
  return (
    <div className="card-enter bg-[#111114] border border-[#1E1E24] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-[#6B6B72]">#{index + 1}</span>
            <span
              className="text-xs uppercase tracking-widest text-[#E8FF47]"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {spinoff.format}
            </span>
          </div>
          <p className="text-sm font-mono text-[#F2F2F0] mb-1.5">{spinoff.title}</p>
          {spinoff.hook && (
            <p className="text-xs text-[#6B6B72] font-mono italic">&ldquo;{spinoff.hook}&rdquo;</p>
          )}
        </div>
        <button
          onClick={() => onForge(spinoff)}
          className="flex-shrink-0 text-xs bg-[#E8FF47] text-[#0A0A0B] px-3 py-2 hover:bg-[#d4eb2a] transition-colors whitespace-nowrap"
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
        >
          FORGE THIS →
        </button>
      </div>
    </div>
  );
}
