"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnalyzedEntry,
  CustomsPaid,
  GroupSummary,
  KpiStats,
  QuantityStatus,
  UNITS,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Main interactive dashboard (client component)
// ---------------------------------------------------------------------------

interface FetchResult {
  entries: AnalyzedEntry[];
  groups: GroupSummary[];
  kpis: KpiStats;
  totalUnfiltered: number;
  mode: "mongodb" | "memory";
}

const EMPTY_FORM = {
  vehicleRegNo: "",
  companyName: "",
  driverName: "",
  psidNumber: "",
  gdNumber: "",
  itemDescription: "",
  approvedQuantity: "0",
  receivedQuantity: "0",
  unit: "KG",
  customsPaid: "UNPAID" as CustomsPaid,
  customPaidProofUrl: "",
  customPaidProofPublicId: "",
  customPaidProofResourceType: "",
  customPaidProofFormat: "",
  remarks: "",
};

interface LiveDup {
  duplicatePsid: boolean;
  duplicateGd: boolean;
  duplicateVehicle: boolean;
  bothPsidAndGdUsed: boolean;
  psidMatchCount: number;
  gdMatchCount: number;
  vehicleMatchCount: number;
  bothMatchCount: number;
}

export default function Dashboard() {
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { kind: "ok" | "warn" | "err"; message: string; details: string[] }>(null);
  const [liveDup, setLiveDup] = useState<LiveDup | null>(null);
  const [search, setSearch] = useState("");
  const [psidFilter, setPsidFilter] = useState("");
  const [gdFilter, setGdFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customsFilter, setCustomsFilter] = useState("");
  const [view, setView] = useState<"entries" | "grouped" | "alerts">("entries");
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- data loading ----
  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (psidFilter) params.set("psid", psidFilter);
    if (gdFilter) params.set("gd", gdFilter);
    if (vehicleFilter) params.set("vehicle", vehicleFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (customsFilter) params.set("customsPaid", customsFilter);
    const res = await fetch(`/api/entries?${params.toString()}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, psidFilter, gdFilter, vehicleFilter, statusFilter, customsFilter]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 200); // debounce
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  // ---- live duplicate check while typing ----
  useEffect(() => {
    const psid = form.psidNumber.trim();
    const gd = form.gdNumber.trim();
    const vehicle = form.vehicleRegNo.trim();
    if (!psid && !gd && !vehicle) {
      setLiveDup(null);
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams({ psid, gd, vehicle });
      fetch(`/api/check-duplicate?${p}`).then((r) => r.json()).then(setLiveDup).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.psidNumber, form.gdNumber, form.vehicleRegNo]);

  // ---- form helpers ----
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleFile(f: File | null) {
    setFile(f);
    setForm((prev) => ({ ...prev, customPaidProofUrl: "", customPaidProofPublicId: "" }));
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setForm((prev) => ({
        ...prev,
        customPaidProofUrl: json.url,
        customPaidProofPublicId: json.publicId ?? "",
        customPaidProofResourceType: json.resourceType ?? "",
        customPaidProofFormat: json.format ?? "",
      }));
    } catch (e) {
      setResult({ kind: "err", message: `Proof upload failed: ${(e as Error).message}`, details: [] });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          approvedQuantity: Number(form.approvedQuantity) || 0,
          receivedQuantity: Number(form.receivedQuantity) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ kind: "err", message: json.error || "Failed", details: json.errors ?? [] });
        return;
      }
      const details: string[] = [];
      const a = json.analysis ?? {};
      if (a.duplicatePsid) details.push(`Duplicate PSID detected: ${form.psidNumber}`);
      if (a.duplicateGd) details.push(`Duplicate GD detected: ${form.gdNumber}`);
      if (a.duplicateVehicle) details.push(`Duplicate Vehicle detected: ${form.vehicleRegNo}`);
      if (a.bothPsidAndGdUsed) details.push(`Both PSID and GD were already used together`);
      if (a.exactDuplicate) details.push(`Exact duplicate (PSID + GD + Vehicle) already exists`);
      const q = json.quantity;
      if (q?.status === "OVER_QUANTITY")
        details.push(`OVER QUANTITY / RED ALERT: total ${q.totalReceived} ${form.unit} exceeds approved ${q.approvedQuantity} ${form.unit} by ${q.exceedsBy} ${form.unit}`);
      else if (q?.status === "NEAR_LIMIT") details.push(`NEAR LIMIT: total ${q.totalReceived} of ${q.approvedQuantity} ${form.unit}`);
      if (q?.arrivedAfterCompletion) details.push(`Subsequent vehicle arrived AFTER limit completion (${q.totalReceivedBefore} ${form.unit} already received)`);
      const isWarn = details.length > 0;
      setResult({
        kind: isWarn ? "warn" : "ok",
        message: isWarn
          ? `Entry saved (${json.entry?.id}) — with warnings. The demo flow is NOT blocked.`
          : `Entry saved (${json.entry?.id}). No duplicate / quantity issues.`,
        details,
      });
      setForm({ ...EMPTY_FORM });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setResult({ kind: "err", message: (err as Error).message, details: [] });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleSeed() {
    await fetch("/api/seed", { method: "POST" });
    await load();
    setResult({ kind: "ok", message: "Sample data re-seeded.", details: [] });
  }

  const kpis = data?.kpis;
  const alerts = useMemo(() => (data?.entries ?? []).filter((e) => e.alerts.length > 0), [data]);

  // ---------------- render ----------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PSID &amp; GD Duplicate &amp; Quantity Monitoring</h1>
          <p className="text-sm text-slate-500">
            Customs duty PSID/GD duplicate detection · multi-vehicle quantity tracking · proof uploads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health?.mongoAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {health?.mongoAvailable ? "MongoDB connected" : "Demo memory mode"}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health?.cloudinaryConfigured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {health?.cloudinaryConfigured ? "Cloudinary on" : "Cloudinary off (local fallback)"}
          </span>
          <button onClick={handleSeed} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Reset sample data
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total PSIDs" value={kpis?.totalPsids ?? 0} />
        <Kpi label="Total Vehicles" value={kpis?.totalVehicles ?? 0} />
        <Kpi label="Total Entries" value={kpis?.totalEntries ?? 0} />
        <Kpi label="Quantity OK" value={kpis?.quantityOk ?? 0} tone="green" />
        <Kpi label="Near Limit" value={kpis?.nearLimit ?? 0} tone="amber" />
        <Kpi label="Over / Alerts" value={(kpis?.overQuantity ?? 0) + (kpis?.duplicateCount ?? 0)} tone="red" hint={`${kpis?.overQuantity ?? 0} over-qty · ${kpis?.duplicateCount ?? 0} duplicate`} />
      </div>

      {/* Entry form */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Vehicle Entry Form</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Vehicle Registration No *" value={form.vehicleRegNo} onChange={(v) => set("vehicleRegNo", v)} placeholder="e.g. LEA-4521" />
            <Field label="Company Name" value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="e.g. Karachi Port Logistics" />
            <Field label="Driver Name" value={form.driverName} onChange={(v) => set("driverName", v)} placeholder="e.g. Ahmed Khan" />
            <Field label="PSID Number" value={form.psidNumber} onChange={(v) => set("psidNumber", v)} placeholder="e.g. PS-2024-000123" />
            <Field label="GD Number" value={form.gdNumber} onChange={(v) => set("gdNumber", v)} placeholder="e.g. 1234567" />
            <Field label="Item Description" value={form.itemDescription} onChange={(v) => set("itemDescription", v)} placeholder="e.g. Basmati Rice" />
            <Field label="Approved Quantity" type="number" value={form.approvedQuantity} onChange={(v) => set("approvedQuantity", v)} />
            <Field label="Received Quantity (this vehicle)" type="number" value={form.receivedQuantity} onChange={(v) => set("receivedQuantity", v)} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">A/U (Unit)</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Customs Paid status</label>
              <select value={form.customsPaid} onChange={(e) => set("customsPaid", e.target.value as CustomsPaid)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="PAID">PAID</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIAL">PARTIAL</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Remarks</label>
              <input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="any notes..." />
            </div>
          </div>

          {/* Proof upload */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Custom Paid Proof (image / PDF → Cloudinary, clickable URL saved in MongoDB)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {uploading && <p className="mt-2 text-xs text-slate-500">Uploading proof...</p>}
            {form.customPaidProofUrl && (
              <p className="mt-2 text-xs">
                Proof uploaded:{" "}
                <a href={form.customPaidProofUrl} target="_blank" rel="noreferrer" className="break-all text-indigo-600 underline">
                  {form.customPaidProofUrl}
                </a>
              </p>
            )}
            {file && !form.customPaidProofUrl && !uploading && <p className="mt-2 text-xs text-amber-600">{file.name} selected...</p>}
          </div>

          {/* live duplicate hints */}
          {liveDup && (liveDup.duplicatePsid || liveDup.duplicateGd || liveDup.duplicateVehicle || liveDup.bothPsidAndGdUsed) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>⚠ Live duplicate check:</strong>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {liveDup.duplicatePsid && <li>PSID already used ({liveDup.psidMatchCount} existing)</li>}
                {liveDup.duplicateGd && <li>GD already used ({liveDup.gdMatchCount} existing)</li>}
                {liveDup.duplicateVehicle && <li>Vehicle No already used ({liveDup.vehicleMatchCount} existing)</li>}
                {liveDup.bothPsidAndGdUsed && <li>This PSID + GD combination already exists ({liveDup.bothMatchCount})</li>}
              </ul>
              <p className="mt-1 italic">Warning only — submission is not blocked.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting || uploading} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Saving..." : "Add Vehicle Entry"}
            </button>
            <span className="text-xs text-slate-500">Date &amp; Time are added automatically. * PSID or GD required.</span>
          </div>
        </form>

        {/* result panel */}
        {result && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${
            result.kind === "err" ? "border-red-300 bg-red-50 text-red-900"
            : result.kind === "warn" ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
            <p className="font-semibold">{result.message}</p>
            {result.details.length > 0 && <ul className="ml-4 mt-1 list-disc space-y-0.5">{result.details.map((d, i) => <li key={i}>{d}</li>)}</ul>}
          </div>
        )}
      </section>

      {/* Records */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">PSID / GD Vehicle Records</h2>
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            {(["entries", "grouped", "alerts"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 font-medium ${view === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {v === "entries" ? "All Entries" : v === "grouped" ? "Grouped by PSID/GD" : `Alerts (${alerts.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* search & filters */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input placeholder="Search anything..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <input placeholder="Filter PSID" value={psidFilter} onChange={(e) => setPsidFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <input placeholder="Filter GD" value={gdFilter} onChange={(e) => setGdFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <input placeholder="Filter Vehicle No" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Any status</option>
            <option value="OK">OK</option>
            <option value="NEAR_LIMIT">Near Limit</option>
            <option value="OVER_QUANTITY">Over Quantity</option>
          </select>
          <select value={customsFilter} onChange={(e) => setCustomsFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Any customs</option>
            <option value="PAID">PAID</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : view === "entries" ? (
          <EntriesTable entries={data?.entries ?? []} onDelete={handleDelete} />
        ) : view === "grouped" ? (
          <GroupedView groups={data?.groups ?? []} />
        ) : (
          <AlertsView alerts={alerts} />
        )}
        <p className="mt-3 text-xs text-slate-400">
          Showing {data?.entries.length ?? 0} of {data?.totalUnfiltered ?? 0} entries · storage: {data?.mode ?? "..."}
        </p>
      </section>
    </div>
  );
}

// ---------------- small subcomponents ----------------

function Kpi({ label, value, tone = "slate", hint }: { label: string; value: number; tone?: string; hint?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-white text-slate-900",
    green: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    red: "bg-red-50 text-red-900",
  };
  return (
    <div className={`rounded-xl border border-slate-200 p-3 shadow-sm ${tones[tone] ?? tones.slate}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] opacity-60">{hint}</p>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

function StatusBadge({ status }: { status: QuantityStatus }) {
  const map: Record<QuantityStatus, string> = {
    OK: "bg-emerald-100 text-emerald-800",
    NEAR_LIMIT: "bg-amber-100 text-amber-800",
    OVER_QUANTITY: "bg-red-100 text-red-800",
  };
  const label: Record<QuantityStatus, string> = { OK: "OK", NEAR_LIMIT: "Near Limit", OVER_QUANTITY: "Over Quantity / Red Alert" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${map[status]}`}>{label[status]}</span>;
}

function DupChips({ e }: { e: AnalyzedEntry }) {
  const chips: { label: string; cls: string }[] = [];
  if (e.duplicates.duplicatePsid) chips.push({ label: "Dup PSID", cls: "bg-amber-100 text-amber-800" });
  if (e.duplicates.duplicateGd) chips.push({ label: "Dup GD", cls: "bg-amber-100 text-amber-800" });
  if (e.duplicates.duplicateVehicle) chips.push({ label: "Dup Vehicle", cls: "bg-amber-100 text-amber-800" });
  if (e.duplicates.bothPsidAndGdUsed) chips.push({ label: "PSID+GD used", cls: "bg-red-100 text-red-800" });
  if (e.duplicates.exactDuplicate) chips.push({ label: "Exact dup", cls: "bg-red-100 text-red-800" });
  if (e.quantity.arrivedAfterCompletion) chips.push({ label: "After completion", cls: "bg-red-100 text-red-800" });
  if (chips.length === 0) return <span className="text-xs text-slate-400">—</span>;
  return <div className="flex flex-wrap gap-1">{chips.map((c, i) => <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>{c.label}</span>)}</div>;
}

function EntriesTable({ entries, onDelete }: { entries: AnalyzedEntry[]; onDelete: (id: string) => void }) {
  if (entries.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No entries match.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            {["Date & Time", "Vehicle", "Company", "Driver", "PSID", "GD", "Item", "Approved", "Received", "A/U", "Total / Approved", "Status", "Customs", "Proof", "Duplicates", "Remarks", ""].map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
              <td className="whitespace-nowrap px-2 py-2">{new Date(e.occurredAt).toLocaleString()}</td>
              <td className="px-2 py-2 font-mono font-semibold">{e.vehicleRegNo}</td>
              <td className="px-2 py-2">{e.companyName || "—"}</td>
              <td className="px-2 py-2">{e.driverName || "—"}</td>
              <td className="px-2 py-2 font-mono">{e.psidNumber || "—"}</td>
              <td className="px-2 py-2 font-mono">{e.gdNumber || "—"}</td>
              <td className="px-2 py-2">{e.itemDescription || "—"}</td>
              <td className="px-2 py-2 text-right">{e.quantity.approvedQuantity}</td>
              <td className="px-2 py-2 text-right font-semibold">{e.receivedQuantity}</td>
              <td className="px-2 py-2">{e.unit}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right">{e.quantity.totalReceived} / {e.quantity.approvedQuantity}{e.quantity.exceedsBy > 0 ? <span className="text-red-600"> (+{e.quantity.exceedsBy})</span> : null}</td>
              <td className="px-2 py-2"><StatusBadge status={e.quantity.status} /></td>
              <td className="px-2 py-2">{e.customsPaid}</td>
              <td className="px-2 py-2">
                {e.customPaidProofUrl ? <a href={e.customPaidProofUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">proof</a> : <span className="text-slate-400">—</span>}
              </td>
              <td className="px-2 py-2"><DupChips e={e} /></td>
              <td className="max-w-[160px] px-2 py-2 text-slate-500">{e.remarks || "—"}</td>
              <td className="px-2 py-2"><button onClick={() => onDelete(e.id)} className="text-red-500 hover:text-red-700" title="Delete entry">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupedView({ groups }: { groups: GroupSummary[] }) {
  if (groups.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No groups match.</p>;
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <details key={g.groupKey} className="rounded-lg border border-slate-200" open={g.status !== "OK"}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{g.groupBy}</span>
            <span className="font-mono font-bold">{g.groupKey}</span>
            <span className="text-slate-500">{g.itemDescription}</span>
            <span className="text-slate-500">PSID {g.psidNumber || "—"} · GD {g.gdNumber || "—"}</span>
            <span className="ml-auto flex items-center gap-3">
              <span className="font-semibold">{g.totalReceived} / {g.approvedQuantity} {g.unit}</span>
              <span className="text-slate-500">{g.vehicleCount} vehicle{g.vehicleCount === 1 ? "" : "s"}</span>
              <StatusBadge status={g.status} />
              {g.exceedsBy > 0 && <span className="text-xs font-bold text-red-600">+{g.exceedsBy} {g.unit}</span>}
              {g.duplicateVehicle && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Dup vehicle</span>}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-slate-100 px-4 py-2">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-slate-500">{["#", "Date & Time", "Vehicle", "Driver", "Received", "A/U", "Total after", "Customs", "Proof", "Flags", "Remarks"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {g.entries.map((e, i) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{new Date(e.occurredAt).toLocaleString()}</td>
                    <td className="px-2 py-1.5 font-mono font-semibold">{e.vehicleRegNo}</td>
                    <td className="px-2 py-1.5">{e.driverName || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{e.receivedQuantity}</td>
                    <td className="px-2 py-1.5">{e.unit}</td>
                    <td className="px-2 py-1.5 text-right">{e.quantity.totalReceived}</td>
                    <td className="px-2 py-1.5">{e.customsPaid}</td>
                    <td className="px-2 py-1.5">{e.customPaidProofUrl ? <a href={e.customPaidProofUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">proof</a> : "—"}</td>
                    <td className="px-2 py-1.5"><DupChips e={e} /></td>
                    <td className="px-2 py-1.5 text-slate-500">{e.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

function AlertsView({ alerts }: { alerts: AnalyzedEntry[] }) {
  if (alerts.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No alerts. All clear.</p>;
  return (
    <div className="space-y-2">
      {alerts.map((e) => (
        <div key={e.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold text-amber-900">
            <span className="font-mono">{e.vehicleRegNo}</span>
            <span>PSID {e.psidNumber || "—"}</span>
            <span>GD {e.gdNumber || "—"}</span>
            <span className="text-xs font-normal">{new Date(e.occurredAt).toLocaleString()}</span>
          </div>
          <ul className="ml-4 list-disc space-y-0.5 text-xs text-amber-900">{e.alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
