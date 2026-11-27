import { NextRequest, NextResponse } from "next/server";
import { listEntries } from "@/lib/store";


// GET /api/check-duplicate?psid=&gd=&vehicle=&excludeId=
// Live duplicate check for the entry form — never blocks, just informs.
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const norm = (s: string | null) => (s || "").trim().toUpperCase();
    const psid = norm(sp.get("psid"));
    const gd = norm(sp.get("gd"));
    const vehicle = norm(sp.get("vehicle"));
    const excludeId = sp.get("excludeId") || "";

    const entries = (await listEntries()).filter((e) => e.id !== excludeId);

    const psidMatches = psid ? entries.filter((e) => norm(e.psidNumber) === psid) : [];
    const gdMatches = gd ? entries.filter((e) => norm(e.gdNumber) === gd) : [];
    const vehicleMatches = vehicle ? entries.filter((e) => norm(e.vehicleRegNo) === vehicle) : [];
    const bothMatches =
      psid && gd ? entries.filter((e) => norm(e.psidNumber) === psid && norm(e.gdNumber) === gd) : [];

    return NextResponse.json({
      duplicatePsid: psidMatches.length > 0,
      duplicateGd: gdMatches.length > 0,
      duplicateVehicle: vehicleMatches.length > 0,
      bothPsidAndGdUsed: bothMatches.length > 0,
      psidMatchCount: psidMatches.length,
      gdMatchCount: gdMatches.length,
      vehicleMatchCount: vehicleMatches.length,
      bothMatchCount: bothMatches.length,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
