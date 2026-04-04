"use client";

interface LocationInputProps {
  value: string;
  onChange: (v: string) => void;
}

export default function LocationInput({ value, onChange }: LocationInputProps) {
  return (
    <div>
      <label className="block text-xs text-[#6B6B72] mb-2 uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
        Shooting Location
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. kitchen counter, home office desk, on site"
        className="w-full bg-[#111114] border border-[#1E1E24] text-[#F2F2F0] text-sm px-3 py-2.5 font-mono placeholder:text-[#6B6B72]/50 focus:outline-none focus:border-[#E8FF47]/50 transition-colors"
      />
      <p className="text-xs text-[#6B6B72]/60 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
        Grounds prop and visual suggestions in what is physically available.
      </p>
    </div>
  );
}
