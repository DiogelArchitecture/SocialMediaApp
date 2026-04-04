"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PatternLibrary from "@/components/PatternLibrary";
import FormatBrowser from "@/components/FormatBrowser";
import type { PatternData } from "@/lib/build-prompt";
import type { FormatEntry } from "@/lib/pattern-store";

interface PatternEntry {
  platform: string;
  niche: string;
  data: PatternData;
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"patterns" | "formats">("formats");
  const [patterns, setPatterns] = useState<PatternEntry[]>([]);
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patterns")
      .then((r) => r.json())
      .then((data) => {
        setPatterns(data.patterns ?? []);
        setFormats(data.formats ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleUseHook(hookText: string) {
    // Navigate to main page with hook pre-filled via URL params
    router.push(`/?topic=${encodeURIComponent(hookText)}&mode=forge`);
  }

  function handleForgeWithFormat(formatName: string) {
    router.push(`/?hookStyle=${encodeURIComponent(formatName)}&mode=forge`);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1E1E24] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="text-lg text-[#E8FF47] hover:opacity-80 transition-opacity"
              style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
            >
              REPLANIT
            </Link>
            <span
              className="text-lg text-[#F2F2F0]"
              style={{ fontFamily: "Anton, sans-serif", letterSpacing: "0.08em" }}
            >
              FORMAT LIBRARY
            </span>
          </div>
          <p className="text-xs text-[#6B6B72] mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
            Patterns that are already working. Use them.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs text-[#6B6B72] hover:text-[#E8FF47] transition-colors border border-[#1E1E24] hover:border-[#E8FF47]/50 px-3 py-1.5"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          ← Back to Forge
        </Link>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#1E1E24] px-6">
        <div className="flex gap-0">
          {(["formats", "patterns"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-[#E8FF47] text-[#E8FF47]"
                  : "border-transparent text-[#6B6B72] hover:text-[#F2F2F0]"
              }`}
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {tab === "formats" ? "Format Breakdowns" : "Pattern Library"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : (
          <>
            {activeTab === "formats" && (
              <FormatBrowser formats={formats} onForgeWithFormat={handleForgeWithFormat} />
            )}
            {activeTab === "patterns" && (
              <PatternLibrary
                patterns={patterns}
                onUseHook={handleUseHook}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
