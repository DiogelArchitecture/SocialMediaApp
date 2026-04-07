"use client";

import { useState } from "react";
import type { SavedIdea } from "./HookPicker";

interface SavedIdeasBarProps {
  ideas: SavedIdea[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export default function SavedIdeasBar({ ideas, onRemove, onClearAll }: SavedIdeasBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (ideas.length === 0) return null;

  return (
    <div className="border border-[#E8FF47]/30 bg-[#E8FF47]/5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#E8FF47]">★</span>
          <span className="text-xs text-[#E8FF47] font-mono">
            {ideas.length} idea{ideas.length !== 1 ? "s" : ""} saved — will inform your concepts
          </span>
        </div>
        <span className="text-xs text-[#6B6B72]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#E8FF47]/20 px-3 py-2 space-y-1.5">
          {ideas.map((idea) => (
            <div key={idea.id} className="flex items-start gap-2">
              <p className="flex-1 text-xs font-mono text-[#F2F2F0] line-clamp-2">
                &ldquo;{idea.text}&rdquo;
              </p>
              <button
                onClick={() => onRemove(idea.id)}
                className="text-xs text-[#6B6B72] hover:text-[#FF4F1F] flex-shrink-0 mt-0.5 transition-colors"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-[#6B6B72] hover:text-[#FF4F1F] transition-colors mt-1"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
