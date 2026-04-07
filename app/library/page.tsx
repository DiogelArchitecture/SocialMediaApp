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

interface SavedScript {
  id: string;
  topic: string;
  platform: string;
  date: string;
  hook?: string;
  sections: Record<string, string>;
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"formats" | "patterns" | "saved">("formats");
  const [patterns, setPatterns] = useState<PatternEntry[]>([]);
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patterns")
      .then((r) => r.json())
      .then((data) => {
        setPatterns(data.patterns ?? []);
        setFormats(data.formats ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load saved scripts from localStorage
    try {
      setSavedScripts(JSON.parse(localStorage.getItem("replanit-scripts") ?? "[]"));
    } catch { /* ignore */ }
  }, []);

  function handleDeleteScript(id: string) {
    const next = savedScripts.filter((s) => s.id !== id);
    setSavedScripts(next);
    localStorage.setItem("replanit-scripts", JSON.stringify(next));
  }

  function handleExportScript(script: SavedScript) {
    const text = Object.entries(script.sections)
      .map(([k, v]) => `${k.toUpperCase()}\n${"─".repeat(40)}\n${v}`)
      .join("\n\n");
    const slug = script.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = script.date.split("T")[0];
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}-${date}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

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
          {(["formats", "patterns", "saved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                activeTab === tab ? "border-[#E8FF47] text-[#E8FF47]" : "border-transparent text-[#6B6B72] hover:text-[#F2F2F0]"
              }`}
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {tab === "formats" ? "Format Breakdowns" : tab === "patterns" ? "Pattern Library" : `Saved Scripts${savedScripts.length > 0 ? ` (${savedScripts.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab !== "saved" && loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : (
          <>
            {activeTab === "formats" && <FormatBrowser formats={formats} onForgeWithFormat={handleForgeWithFormat} />}
            {activeTab === "patterns" && <PatternLibrary patterns={patterns} onUseHook={handleUseHook} />}
            {activeTab === "saved" && (
              <div className="max-w-2xl space-y-3">
                {savedScripts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-[#1E1E24] text-center p-8">
                    <p className="text-sm text-[#6B6B72] font-mono mb-1">No saved scripts yet.</p>
                    <p className="text-xs text-[#6B6B72]" style={{ fontFamily: "Inter, sans-serif" }}>Generate a script and hit <span className="text-[#E8FF47]">★ Save</span> to store it here.</p>
                  </div>
                ) : savedScripts.map((script) => (
                  <div key={script.id} className="border border-[#1E1E24] bg-[#111114]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <button onClick={() => setExpandedId(expandedId === script.id ? null : script.id)} className="flex-1 text-left min-w-0">
                        <p className="text-sm font-mono text-[#F2F2F0] truncate">{script.topic}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#6B6B72]">{script.platform}</span>
                          <span className="text-xs text-[#6B6B72]/60">{new Date(script.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {script.hook && <span className="text-xs text-[#6B6B72] italic truncate max-w-[180px]">&ldquo;{script.hook.slice(0, 60)}&rdquo;</span>}
                        </div>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleExportScript(script)} className="text-xs text-[#6B6B72] hover:text-[#E8FF47] border border-[#1E1E24] hover:border-[#E8FF47]/50 px-2 py-1 transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
                          TXT ↓
                        </button>
                        <button onClick={() => handleDeleteScript(script.id)} className="text-xs text-[#6B6B72] hover:text-[#FF4F1F] border border-[#1E1E24] hover:border-[#FF4F1F]/50 px-2 py-1 transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {/* Expanded sections */}
                    {expandedId === script.id && (
                      <div className="border-t border-[#1E1E24] px-4 py-3 space-y-3 max-h-[500px] overflow-y-auto">
                        {Object.entries(script.sections).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs uppercase tracking-widest text-[#E8FF47] mb-1" style={{ fontFamily: "Anton, sans-serif" }}>{key}</p>
                            <pre className="text-xs font-mono text-[#F2F2F0] whitespace-pre-wrap leading-relaxed">{value}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
