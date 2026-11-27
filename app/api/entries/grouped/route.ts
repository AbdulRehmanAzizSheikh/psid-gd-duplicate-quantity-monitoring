import { NextResponse, connection } from "next/server";
import { analyzeEntries, summarizeGroups } from "@/lib/quantity";
import { listEntries, storageMode } from "@/lib/store";


// GET /api/entries/grouped — complete grouped record view: every vehicle under a PSID/GD.
export async function GET() {
  await connection(); // force request-time rendering (no prerendering)
  try {
    const raw = await listEntries();
    const groups = summarizeGroups(analyzeEntries(raw));
    return NextResponse.json({ groups, total: groups.length, mode: await storageMode() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
