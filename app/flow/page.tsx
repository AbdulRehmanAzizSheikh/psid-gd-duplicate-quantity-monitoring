import Link from "next/link";
import ScenarioSandbox from "@/components/ScenarioSandbox";

// /flow — Client presentation & interactive walkthrough.
export default function FlowPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Client Presentation</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">PSID &amp; GD Duplicate &amp; Quantity Monitoring</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          A simple guided tour for you and your seniors. Everything below explains what the system does, why it exists,
          how it works in real customs-clearing scenarios, and ends with a live interactive sample you can play with.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Open the live demo →</Link>
          <Link href="/flow/dev" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Developer guide</Link>
        </div>
      </header>

      {/* ---- What it does ---- */}
      <Section title="1 · The problem" icon="🎯">
        <p>
          At customs gates and bonded warehouses, one Permit/Shipment ID (<b>PSID</b>) or one Gate Duty slip number (<b>GD</b>)
          can arrive on <b>multiple vehicles</b>. Two failure modes hurt operations:
        </p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li><b>Duplicates:</b> the same PSID / GD / vehicle number entered twice (fraud, data entry error, re-weighing) — goods could be released twice.</li>
          <li><b>Quantity overruns:</b> total received across all vehicles exceeds the <b>approved quantity</b>, even by <b>1 KG</b>, or a vehicle arrives <b>after</b> the limit was already completed.</li>
        </ul>
        <p className="mt-2">This system catches both instantly, on any screen, without stopping your workflow.</p>
      </Section>

      <Section title="2 · Core features on the live demo" icon="✨">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Multi-vehicle tracking", "One PSID/GD, 3, 4, 5 or 10+ vehicles. Received quantities are SUMMED per PSID/GD across every vehicle entry. Units: KG, LTR, PCS, Box, Carton, MT, TON, BAG, Drum..."],
            ["Approved vs received", "Each PSID/GD has an approved quantity (e.g. 1000 KG). See total received, remaining, and how much over it is."],
            ["Clear status", "🟢 OK · 🟡 Near Limit (≥90%) · 🔴 Over Quantity / Red Alert (exceeds approved, even by 1 KG, or vehicle after completion)."],
            ["Duplicate detection", "Highlights Duplicate PSID, Duplicate GD, Duplicate Vehicle, and when BOTH PSID + GD were already used. Warns live while typing. Never blocks the demo."],
            ["Vehicle entry form", "Vehicle Reg No, Company, Driver, PSID, GD, Item, Approved Qty, Received Qty, A/U, Customs Paid, Proof upload, Remarks. Date & Time added automatically."],
            ["Custom paid proof", "Upload images/PDFs of customs-paid proof. Stored on Cloudinary; clickable secure URL saved in MongoDB next to the entry."],
            ["Dashboard KPIs", "Total PSIDs, Total Vehicles, Total Entries, Quantity OK, Near Limit, Over/Duplicate alerts..."],
            ["Search & grouped view", "Search/filter by PSID, GD, Vehicle No, status, customs paid. Grouped view shows EVERY vehicle under a PSID/GD."],
            ["Mobile & laptop", "Responsive layout. Field staff can enter on a phone at the gate; supervisors monitor the same live data on a laptop."],
            ["Alerts view", "All duplicate / quantity / customs-paid warnings in one place, with reasons."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-800">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Real-world scenarios ---- */}
      <Section title="3 · Real-world scenarios" icon="🚚">
        <div className="space-y-4 text-sm">
          <Scenario
            title="Scenario A — one PSID, four vehicles, exactly 1000 KG"
            steps={[
              "Supervisor records PSID PS-2024-000123, GD 1234567, approved 1000 KG Basmati Rice.",
              "Vehicle 1 arrives: 400 KG → total 400/1000 · OK.",
              "Vehicle 2 arrives: 350 KG → total 750/1000 · OK.",
              "Vehicle 3 arrives: 250 KG → total 1000/1000 · Near Limit (complete) — no over-quantity.",
              "No further vehicles. Nothing exceeds the limit.",
            ]}
            outcome="🟡 Near Limit (exactly complete, nothing over). Full history of all vehicles under the PSID."
          />
          <Scenario
            title="Scenario B — over quantity by 100 KG + late vehicle"
            steps={[
              "Same PSID approved 1000 LTR. Vehicles deliver 400 + 350 + 350 = 1100 LTR.",
              "3rd vehicle pushes total to 1100 → 🔴 Over Quantity / Red Alert, +100 LTR.",
              "A 4th vehicle (10 LTR) arrives AFTER the 1000 limit was already reached → flagged 'subsequent vehicle after limit completion' AND total 1110.",
            ]}
            outcome="🔴 Red alert on the exact vehicle that crossed the line; supervisor can block release / investigate."
          />
          <Scenario
            title="Scenario C — duplicate detection"
            steps={[
              "A vehicle number is scanned twice for two different PSIDs → Duplicate Vehicle.",
              "The same PSID is used under a different GD → Duplicate PSID.",
              "The same GD appears twice → Duplicate GD.",
              "Same PSID + same GD + same vehicle repeated → both flags + exact-duplicate flag.",
            ]}
            outcome="⚠ Clear warnings; nothing is blocked so field staff can still record reality."
          />
          <Scenario
            title="Scenario D — customs paid proof"
            steps={[
              "Driver pays customs duty; staff photographs the receipt or uploads the PDF.",
              "File goes to Cloudinary (secure URL); URL + metadata saved on the entry in MongoDB.",
              "Supervisors click the proof link from any record, on any device. Customs Paid = PAID / PARTIAL / UNPAID.",
            ]}
            outcome="🔗 Auditable proof attached to every vehicle entry."
          />
        </div>
      </Section>

      {/* ---- How entries & alerts work ---- */}
      <Section title="4 · How entries & alerts work" icon="⚙️">
        <ol className="ml-5 list-decimal space-y-1 text-sm">
          <li>Staff fill the <b>Vehicle Entry Form</b> on `/`. Date &amp; Time are stamped automatically.</li>
          <li>As you type PSID/GD/vehicle number, a <b>live duplicate check</b> queries existing records and shows warnings.</li>
          <li>Optional proof file is uploaded first (<code>/api/upload</code> → Cloudinary) and its URL is attached to the entry.</li>
          <li>On save (<code>POST /api/entries</code>), the server validates, stores in MongoDB, then runs the shared analysis engine.</li>
          <li>The response returns duplicate flags + quantity summary for THIS entry, plus updated KPIs. Warnings are shown; saving still succeeds.</li>
          <li>Quantity totals are computed per group (PSID, else GD), ordered by time; status recalculated across the whole group every time.</li>
        </ol>
      </Section>

      {/* ---- Mobile vs laptop ---- */}
      <Section title="5 · Mobile & laptop for monitoring staff" icon="📱💻">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold">At the gate / on site (mobile)</p>
            <ul className="ml-4 mt-1 list-disc space-y-0.5 text-slate-600">
              <li>Single-column responsive form, big tap targets.</li>
              <li>Snap a photo of the customs-paid proof with the phone camera.</li>
              <li>See duplicate warnings instantly while typing.</li>
              <li>Submit even on patchy connectivity once back online; data persists server-side.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold">Control room (laptop)</p>
            <ul className="ml-4 mt-1 list-disc space-y-0.5 text-slate-600">
              <li>Full-width KPI dashboard + alerts view.</li>
              <li>Search & filter; grouped PSID/GD drill-down.</li>
              <li>Click proof links; verify customs paid; investigate over-quantity.</li>
              <li>Same live data as field staff see.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ---- Interactive sandbox ---- */}
      <Section title="6 · Try it yourself — interactive sample scenario" icon="🎮">
        <ScenarioSandbox />
        <p className="mt-3 text-xs text-slate-500">
          This sandbox runs the same <code>analyzeEntries()</code> engine used by the production API, on sample data, in your browser.
          Want it live against MongoDB? Go to <Link href="/" className="text-indigo-600 underline">the live demo</Link>.
        </p>
      </Section>

      <Section title="7 · Next steps for production" icon="🏗️">
        <p className="text-sm text-slate-600">
          Auth &amp; roles (field staff vs supervisor vs auditor), audit logs, per-PSID approved-quantity source of truth, unit conversion,
          mobile app / offline sync, PDF proof preview, CSV export... full detail in the{" "}
          <Link href="/flow/dev" className="text-indigo-600 underline">Developer Guide</Link>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-slate-900"><span className="mr-2">{icon}</span>{title}</h2>
      <div className="text-slate-700">{children}</div>
    </section>
  );
}

function Scenario({ title, steps, outcome }: { title: string; steps: string[]; outcome: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="font-semibold text-slate-800">{title}</p>
      <ol className="ml-5 mt-1 list-decimal space-y-0.5 text-slate-600">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="mt-2 text-slate-800"><b>Result:</b> {outcome}</p>
    </div>
  );
}
