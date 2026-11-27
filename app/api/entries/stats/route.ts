import { NextResponse, connection } from "next/server";
import { analyzeEntries, computeKpis } from "@/lib/quantity";
import { listEntries, storageMode } from "@/lib/store";


// GET /api/entries/stats — summary KPIs.
export async function GET() {
  await connection(); // force request-time rendering (no prerendering)
  try {
    const raw = await listEntries();
    const kpis = computeKpis(analyzeEntries(raw), await storageMode());
    return NextResponse.json(kpis);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
