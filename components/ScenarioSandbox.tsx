"use client";

import { useMemo, useState } from "react";
import { analyzeEntries, summarizeGroups } from "@/lib/quantity";
import { Entry } from "@/lib/types";

// Interactive sample scenario for /flow.
// Uses the SAME production logic (analyzeEntries) on in-browser sample data.

const SCENARIO = {
  psidNumber: "PS-DEMO-000001",
  gdNumber: "9990001",
  itemDescription: "Basmati Rice",
  unit: "KG",
  approvedQuantity: 1000,
  vehicles: [
    { vehicleRegNo: "DEMO-01", receivedQuantity: 400 },
    { vehicleRegNo: "DEMO-02", receivedQuantity: 350 },
    { vehicleRegNo: "DEMO-03", receivedQuantity: 250 },
    { vehicleRegNo: "DEMO-04", receivedQuantity: 100 }, // over / after completion
  ],
};

export default function ScenarioSandbox() {
  const [count, setCount] = useState(0); // how many vehicles have arrived
  const [extra, setExtra] = useState(0); // tweak last vehicle received qty
  const [dup, setDup] = useState(false); // re-use same vehicle no / PSID+GD on last

  const entries = useMemo<Entry[]>(() => {
    const list = SCENARIO.vehicles.slice(0, count).map((v, i) => ({
      id: `demo-${i}`,
      vehicleRegNo: v.vehicleRegNo,
      companyName: "Demo Carrier",
      driverName: `Driver ${i + 1}`,
      psidNumber: SCENARIO.psidNumber,
      gdNumber: SCENARIO.gdNumber,
      itemDescription: SCENARIO.itemDescription,
      approvedQuantity: SCENARIO.approvedQuantity,
      receivedQuantity: i === count - 1 ? v.receivedQuantity + extra : v.receivedQuantity,
      unit: SCENARIO.unit,
      customsPaid: "PAID" as const,
      customPaidProofUrl: "",
      remarks: "",
      occurredAt: new Date(2024, 0, 1, 8 + i).toISOString(),
      createdAt: new Date(2024, 0, 1, 8 + i).toISOString(),
    }));
    if (dup && list.length > 1) {
      list[list.length - 1] = { ...list[list.length - 1], vehicleRegNo: list[0].vehicleRegNo };
    }
    return list;
  }, [count, extra, dup]);

  const analyzed = useMemo(() => analyzeEntries(entries), [entries]);
  const groups = useMemo(() => summarizeGroups(analyzed), [analyzed]);
  const g = groups[0];
  const last = analyzed[analyzed.length - 1];

  const totalReceived = g?.totalReceived ?? 0;
  const pct = Math.min(100, Math.round((totalReceived / SCENARIO.approvedQuantity) * 100));
  const over = totalReceived > SCENARIO.approvedQuantity;

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold">Interactive Sample Scenario</h3>
      <p className="mb-4 text-sm text-slate-500">
        One PSID <b className="font-mono">{SCENARIO.psidNumber}</b> · GD <b className="font-mono">{SCENARIO.gdNumber}</b> ·
        approved <b>{SCENARIO.approvedQuantity} {SCENARIO.unit}</b> · <b>{SCENARIO.itemDescription}</b>. Add vehicles one by one.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setCount(0)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Reset</button>
        <button onClick={() => setCount((c) => Math.min(SCENARIO.vehicles.length, c + 1))} disabled={count >= SCENARIO.vehicles.length} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          + Next vehicle arrives
        </button>
        <button onClick={() => setCount((c) => Math.max(0, c - 1))} disabled={count === 0} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">− Remove</button>
        <label className="ml-2 flex items-center gap-1 text-sm text-slate-600">
          last vehicle +{extra} KG
          <input type="range" min={0} max={500} step={10} value={extra} onChange={(e) => setExtra(Number(e.target.value))} disabled={count === 0} />
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" checked={dup} onChange={(e) => setDup(e.target.checked)} disabled={count < 2} />
          duplicate vehicle no
        </label>
      </div>

      {/* progress bar */}
      <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mb-4 text-sm">
        Received <b>{totalReceived}</b> / <b>{SCENARIO.approvedQuantity} {SCENARIO.unit}</b> ({pct}%) · vehicles: <b>{g?.vehicleCount ?? 0}</b> ·{" "}
        {g ? <StatusLine status={g.status} /> : <span className="text-slate-400">no vehicles yet</span>}
        {over && <span className="ml-2 font-bold text-red-600">+{round(totalReceived - SCENARIO.approvedQuantity)} {SCENARIO.unit} OVER</span>}
      </p>

      {/* per-vehicle list */}
      {analyzed.length > 0 && (
        <table className="mb-4 w-full text-left text-xs">
          <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-1.5">#</th><th>Vehicle</th><th>Received</th><th>Total after</th><th>Status</th><th>Flags</th></tr></thead>
          <tbody>
            {analyzed.map((e, i) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="py-1.5">{i + 1}</td>
                <td className="font-mono font-semibold">{e.vehicleRegNo}</td>
                <td>{e.receivedQuantity} {e.unit}</td>
                <td>{e.quantity.totalReceived} {e.unit}</td>
                <td><StatusLine status={e.quantity.status} /></td>
                <td className="text-[11px] text-amber-800">
                  {e.duplicates.duplicateVehicle && "Dup vehicle "}
                  {e.quantity.arrivedAfterCompletion && "After completion "}
                  {e.quantity.status === "OVER_QUANTITY" && `+${e.quantity.exceedsBy} over`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* live alerts from the same engine */}
      {last && last.alerts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="mb-1 font-semibold">Alerts generated for the last vehicle (same engine as production):</p>
          <ul className="ml-4 list-disc space-y-0.5">{last.alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function StatusLine({ status }: { status: string }) {
  const map: Record<string, string> = { OK: "🟢 OK", NEAR_LIMIT: "🟡 Near Limit", OVER_QUANTITY: "🔴 Over Quantity / Red Alert" };
  return <span>{map[status] ?? status}</span>;
}

function round(n: number) { return Math.round(n * 100) / 100; }
