"use client";

export type AppMode = "quick" | "forge" | "analyse";

interface ModeTabProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES: { id: AppMode; label: string }[] = [
  { id: "quick", label: "QUICK" },
  { id: "forge", label: "FORGE" },
  { id: "analyse", label: "ANALYSE" },
];

export default function ModeTab({ mode, onChange }: ModeTabProps) {
  return (
    <div className="flex items-center gap-1 bg-[#111114] border border-[#1E1E24] rounded-sm p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`
            px-4 py-1.5 text-xs font-display tracking-widest transition-all duration-200
            ${mode === m.id
              ? m.id === "quick"
                ? "bg-[#FF4F1F] text-[#0A0A0B]"
                : "bg-[#E8FF47] text-[#0A0A0B]"
              : "text-[#6B6B72] hover:text-[#F2F2F0]"
            }
          `}
          style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.12em" }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
