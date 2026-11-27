import { NextRequest, NextResponse } from "next/server";
import { analyzeEntries, computeKpis, summarizeGroups } from "@/lib/quantity";
import { addEntry, listEntries, storageMode } from "@/lib/store";
import { EntryInput, UNITS } from "@/lib/types";


// GET /api/entries — analyzed list + groups + KPIs, with search/filters.
export async function GET(req: NextRequest) {
  try {
    const raw = await listEntries();
    const mode = await storageMode();
    let analyzed = analyzeEntries(raw);

    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim().toLowerCase();
    const psid = (sp.get("psid") || "").trim().toLowerCase();
    const gd = (sp.get("gd") || "").trim().toLowerCase();
    const vehicle = (sp.get("vehicle") || "").trim().toLowerCase();
    const unit = (sp.get("unit") || "").trim().toUpperCase();
    const customsPaid = (sp.get("customsPaid") || "").trim().toUpperCase();
    const status = (sp.get("status") || "").trim().toUpperCase();

    // KPIs computed on the FULL dataset, filters applied to the returned list.
    const kpis = computeKpis(analyzed, mode);

    let filtered = analyzed;
    if (q) {
      filtered = filtered.filter((e) =>
        [e.psidNumber, e.gdNumber, e.vehicleRegNo, e.companyName, e.driverName, e.itemDescription, e.remarks]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (psid) filtered = filtered.filter((e) => e.psidNumber.toLowerCase().includes(psid));
    if (gd) filtered = filtered.filter((e) => e.gdNumber.toLowerCase().includes(gd));
    if (vehicle) filtered = filtered.filter((e) => e.vehicleRegNo.toLowerCase().includes(vehicle));
    if (unit) filtered = filtered.filter((e) => e.unit.toUpperCase() === unit);
    if (customsPaid) filtered = filtered.filter((e) => e.customsPaid === customsPaid);
    if (status) filtered = filtered.filter((e) => e.quantity.status === status);

    const ordered = [...filtered].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return NextResponse.json({
      entries: ordered,
      groups: summarizeGroups(filtered),
      kpis,
      totalUnfiltered: analyzed.length,
      mode,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/entries — create a vehicle entry. Returns duplicate + quantity analysis. Never blocks on duplicates.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ---- validation ----
    const errors: string[] = [];
    if (!String(body.vehicleRegNo || "").trim()) errors.push("Vehicle Registration No is required");
    if (!String(body.psidNumber || "").trim() && !String(body.gdNumber || "").trim())
      errors.push("Provide at least one of PSID Number or GD Number");
    const received = Number(body.receivedQuantity);
    const approved = Number(body.approvedQuantity);
    if (!Number.isFinite(received) || received < 0) errors.push("Received Quantity must be a number >= 0");
    if (!Number.isFinite(approved) || approved < 0) errors.push("Approved Quantity must be a number >= 0");
    if (body.customsPaid && !["PAID", "UNPAID", "PARTIAL"].includes(body.customsPaid))
      errors.push("Customs Paid must be PAID, UNPAID or PARTIAL");
    if (errors.length) return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });

    const input: EntryInput = {
      vehicleRegNo: String(body.vehicleRegNo).trim(),
      companyName: String(body.companyName || "").trim(),
      driverName: String(body.driverName || "").trim(),
      psidNumber: String(body.psidNumber || "").trim(),
      gdNumber: String(body.gdNumber || "").trim(),
      itemDescription: String(body.itemDescription || "").trim(),
      approvedQuantity: approved,
      receivedQuantity: received,
      unit: String(body.unit || "KG").trim() || "KG",
      customsPaid: (body.customsPaid || "UNPAID") as EntryInput["customsPaid"],
      customPaidProofUrl: String(body.customPaidProofUrl || "").trim(),
      customPaidProofPublicId: String(body.customPaidProofPublicId || "").trim(),
      customPaidProofResourceType: String(body.customPaidProofResourceType || "").trim(),
      customPaidProofFormat: String(body.customPaidProofFormat || "").trim(),
      remarks: String(body.remarks || "").trim(),
      occurredAt: body.occurredAt ? new Date(body.occurredAt).toISOString() : undefined, // automatic if omitted
    };

    // snapshot existing entries to compare against (before insert)
    const before = await listEntries();
    const created = await addEntry(input);
    const after = await listEntries();
    const analyzedAfter = analyzeEntries(after);
    const me = analyzedAfter.find((e) => e.id === created.id);

    // duplicate check against PRE-EXISTING entries only (excluding the one we just created)
    const norm = (s: string) => s.trim().toUpperCase();
    const psidKey = norm(input.psidNumber);
    const gdKey = norm(input.gdNumber);
    const vehKey = norm(input.vehicleRegNo);
    const existing = before.filter((e) => e.id !== created.id);
    const analysis = {
      duplicatePsid: psidKey !== "" && existing.some((e) => norm(e.psidNumber) === psidKey),
      duplicateGd: gdKey !== "" && existing.some((e) => norm(e.gdNumber) === gdKey),
      duplicateVehicle: vehKey !== "" && existing.some((e) => norm(e.vehicleRegNo) === vehKey),
      bothPsidAndGdUsed:
        psidKey !== "" && gdKey !== "" &&
        existing.some((e) => norm(e.psidNumber) === psidKey && norm(e.gdNumber) === gdKey),
      exactDuplicate: existing.some(
        (e) => norm(e.psidNumber) === psidKey && norm(e.gdNumber) === gdKey && norm(e.vehicleRegNo) === vehKey
      ),
    };

    return NextResponse.json(
      {
        entry: me ?? created,
        analysis,
        quantity: me?.quantity ?? null,
        alerts: me?.alerts ?? [],
        kpis: computeKpis(analyzedAfter, await storageMode()),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
