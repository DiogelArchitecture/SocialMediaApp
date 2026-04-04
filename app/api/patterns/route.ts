import { NextResponse } from "next/server";
import { listAllPatterns } from "@/lib/pattern-store";
import { readFormats } from "@/lib/pattern-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const patterns = listAllPatterns();
    const formats = readFormats();
    return NextResponse.json({ patterns, formats });
  } catch (err) {
    console.error("Patterns route error:", err);
    return NextResponse.json({ error: "Failed to load patterns" }, { status: 500 });
  }
}
