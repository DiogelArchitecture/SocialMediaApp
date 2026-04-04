"use client";

export type ScrapeStep = "scraping" | "filtering" | "extracting" | "done" | "error" | "idle";

interface ScrapeProgressProps {
  step: ScrapeStep;
  detail?: string;
}

const STEPS: { id: ScrapeStep; label: string }[] = [
  { id: "scraping", label: "Scraping content..." },
  { id: "filtering", label: "Filtering by engagement rate..." },
  { id: "extracting", label: "Extracting patterns..." },
  { id: "done", label: "Patterns ready" },
];

function stepIndex(step: ScrapeStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export default function ScrapeProgress({ step, detail }: ScrapeProgressProps) {
  if (step === "idle") return null;

  const currentIdx = stepIndex(step);
  const isError = step === "error";

  return (
    <div className="bg-[#111114] border border-[#1E1E24] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isError ? "bg-[#FF4F1F]" : "bg-[#E8FF47] animate-pulse"}`} />
        <span className="text-xs font-mono text-[#E8FF47]">
          {isError ? "SCRAPE ERROR" : "SCRAPING LIVE DATA"}
        </span>
      </div>

      {/* Step indicators */}
      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={s.id} className="flex items-center gap-3">
              <div
                className={`
                  w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${isPast ? "bg-[#E8FF47]" : isCurrent ? "bg-[#E8FF47] animate-pulse" : "bg-[#1E1E24]"}
                `}
              />
              <span
                className={`text-xs font-mono ${
                  isPast || isCurrent ? "text-[#F2F2F0]" : "text-[#6B6B72]"
                }`}
              >
                {isCurrent && detail ? detail : s.label}
                {isPast && " ✓"}
              </span>
            </div>
          );
        })}
      </div>

      {isError && detail && (
        <p className="text-xs text-[#FF4F1F] font-mono mt-2">{detail}</p>
      )}
    </div>
  );
}
