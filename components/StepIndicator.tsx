"use client";

export type Step = 1 | 2 | 3 | 4;

interface StepIndicatorProps {
  current: Step;
  onBack?: () => void;
}

const STEPS = [
  { n: 1, label: "BRIEF" },
  { n: 2, label: "HOOKS" },
  { n: 3, label: "CONCEPT" },
  { n: 4, label: "SCRIPT" },
] as const;

export default function StepIndicator({ current, onBack }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = step.n < current;
        const active = step.n === current;
        return (
          <div key={step.n} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              {/* Connector line */}
              {i > 0 && (
                <div className={`h-px flex-1 transition-colors duration-300 ${done ? "bg-[#E8FF47]" : "bg-[#1E1E24]"}`} />
              )}
              {/* Step dot + label */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                    done
                      ? "bg-[#E8FF47] text-[#0A0A0B]"
                      : active
                      ? "bg-[#E8FF47]/20 border-2 border-[#E8FF47] text-[#E8FF47]"
                      : "bg-[#1E1E24] text-[#6B6B72]"
                  }`}
                  style={{ fontFamily: "Anton, sans-serif" }}
                >
                  {done ? "✓" : step.n}
                </div>
                <span
                  className={`text-[9px] uppercase tracking-widest transition-colors duration-300 ${
                    active ? "text-[#E8FF47]" : done ? "text-[#E8FF47]/60" : "text-[#6B6B72]"
                  }`}
                  style={{ fontFamily: "Anton, sans-serif" }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {onBack && current > 1 && (
        <button
          onClick={onBack}
          className="ml-4 text-xs text-[#6B6B72] hover:text-[#F2F2F0] transition-colors flex-shrink-0 border border-[#1E1E24] px-2 py-1"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
