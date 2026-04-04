"use client";

import type { DropOffPoint } from "@/lib/analyse";

interface RetentionTimelineProps {
  dropOffPoints: DropOffPoint[];
  durationSeconds?: number;
}

export default function RetentionTimeline({ dropOffPoints, durationSeconds = 60 }: RetentionTimelineProps) {
  if (!dropOffPoints.length) return null;

  return (
    <div className="bg-[#111114] border border-[#1E1E24] p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F1F]" />
        <span
          className="text-xs uppercase tracking-widest text-[#FF4F1F]"
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.1em" }}
        >
          Drop-off Timeline
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 bg-[#0A0A0B] border border-[#1E1E24] rounded-sm overflow-hidden mb-4">
        {/* Gradient base */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: "linear-gradient(90deg, #E8FF47 0%, #FF4F1F 100%)" }}
        />

        {/* Drop-off markers */}
        {dropOffPoints.map((point, i) => {
          const leftPct = (point.startSeconds / durationSeconds) * 100;
          const widthPct = Math.max(
            ((point.endSeconds - point.startSeconds) / durationSeconds) * 100,
            2
          );

          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 bg-[#FF4F1F]/80 border-l border-[#FF4F1F]"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`${point.timestamp}: ${point.reason}`}
            />
          );
        })}

        {/* Time labels */}
        {[0, 15, 30, 45, 60].filter((t) => t <= durationSeconds).map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 flex items-end pb-0.5"
            style={{ left: `${(t / durationSeconds) * 100}%` }}
          >
            <span className="text-[9px] text-[#6B6B72] pl-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
              {t}s
            </span>
          </div>
        ))}
      </div>

      {/* Drop-off detail cards */}
      <div className="space-y-3">
        {dropOffPoints.map((point, i) => (
          <div key={i} className="border border-[#FF4F1F]/20 p-3 bg-[#FF4F1F]/3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#FF4F1F]">{point.timestamp}</span>
              <span className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>
                {point.reason}
              </span>
            </div>
            {point.line && (
              <p className="text-xs font-mono text-[#F2F2F0]/80 italic mb-1.5">&ldquo;{point.line}&rdquo;</p>
            )}
            {point.fix && (
              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[#1E1E24]">
                <span className="text-[#E8FF47] text-xs flex-shrink-0" style={{ fontFamily: "Inter, sans-serif" }}>
                  FIX
                </span>
                <p className="text-xs text-[#F2F2F0] font-mono">{point.fix}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
