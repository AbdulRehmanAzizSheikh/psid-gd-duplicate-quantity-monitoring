import Link from "next/link";

// /flow/dev — Developer Guide, Architecture & Requirement Traceability Matrix.
export default function DevGuidePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Developer Guide</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Architecture, Schema, Logic &amp; Requirement Traceability</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Everything a developer needs to understand, run, and extend this demo — including a Requirement Traceability
          Matrix (RTM) mapping <b>every</b> requirement from the project brief to where it is implemented, why it exists,
          and exactly how it works step by step.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 text-sm">
        {["#run", "#architecture", "#schema", "#logic", "#cloudinary", "#api", "#frontend", "#seed", "#rtm", "#edge-cases", "#production"].map((a) => (
          <a key={a} href={a} className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">{a.slice(1)}</a>
        ))}
      </nav>

      {/* ---------- run ---------- */}
      <S id="run" title="Run it">
        <Code>{`git clone <repo> && cd psid-gd-duplicate-quantity-monitoring
npm install
cp .env.example .env.local   # fill MongoDB + Cloudinary (optional!)
npm run dev                  # http://localhost:3000
npm run seed                 # optional: seed MongoDB with sample data
npm run build && npm start   # production`}</Code>
        <p className="text-sm text-slate-600">
          <b>Real infrastructure required.</b> <code>MONGODB_URI</code> (MongoDB Atlas) and <code>CLOUDINARY_*</code> keys are
          required; nothing runs locally or in-memory, no local uploads. Seed MongoDB with <code>npm run seed</code>. Pages:
          <code> /</code>, <code>/flow</code>, <code>/flow/dev</code>. Health: <code>GET /api/health</code>.
        </p>
      </S>

      {/* ---------- architecture ---------- */}
      <S id="architecture" title="System architecture & data flow">
        <Code>{`┌──────────────────────────────────────────────────────────────┐
│  Browser (React 19 client components, responsive Tailwind)   │
│   app/page.tsx → components/Dashboard.tsx                    │
│   app/flow/page.tsx (+ ScenarioSandbox, same pure logic)     │
│   app/flow/dev/page.tsx (this page)                          │
└───────────────┬──────────────────────────────────────────────┘
                │ fetch / FormData
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js App Router API route handlers (app/api/**/route.ts) │
│   GET/POST /api/entries        DELETE /api/entries/[id]      │
│   GET /api/entries/grouped     GET /api/entries/stats        │
│   GET /api/check-duplicate     POST /api/upload              │
│   POST|GET /api/seed           GET /api/health               │
└───────┬───────────────────────────────────┬──────────────────┘
        │ Mongoose                          │ cloudinary.uploader
        ▼                                   ▼
┌──────────────────────┐           ┌──────────────────────────┐
│  MongoDB             │           │  Cloudinary              │
│  db.entries          │←──────────│  folder: psid-gd-proofs  │
│  stores proof URL +  │ secure    │  secure URLs returned    │
│  public_id etc.      │ URL       │  (image / PDF 'raw')     │
└──────────────────────┘           └──────────────────────────┘

Shared pure logic: lib/quantity.ts  (analyzeEntries, summarizeGroups, computeKpis)
   used identically server-side (API) and client-side (interactive /flow sandbox).

No local fallbacks:
   no MONGODB_URI        → error (MongoDB required)
   Mongo connect fails   → clear error; no in-memory fallback
   no CLOUDINARY_* keys  → upload error (Cloudinary required); nothing stored locally`}</Code>
        <p className="mt-3 text-sm text-slate-600">
          Layering: <b>UI → API routes → data layer (lib/store.ts) → MongoDB + Cloudinary</b>. The business rules
          (duplicates + quantity) live in one pure module so API responses, the dashboard, the alerts view and the
          interactive /flow sandbox can never disagree.
        </p>
      </S>

      {/* ---------- schema ---------- */}
      <S id="schema" title="MongoDB schema design">
        <Code>{`db.entries  (one document per VEHICLE ENTRY; a PSID/GD spans many documents)
{
  _id,                         // ObjectId
  // automatic
  occurredAt: ISODate,         // date & time of the vehicle entry (auto-stamped)
  createdAt:  ISODate,         // Mongoose timestamps
  updatedAt:  ISODate,
  // vehicle + people
  vehicleRegNo: String,        // indexed
  companyName: String,
  driverName: String,
  // customs references
  psidNumber: String,          // indexed; PSID or GD (at least one) required
  gdNumber: String,            // indexed
  itemDescription: String,
  // quantity
  approvedQuantity: Number,    // approved for the whole PSID/GD (NOT summed per vehicle!)
  receivedQuantity: Number,    // quantity on THIS vehicle (this is what gets summed)
  unit: String,                // A/U: KG, LTR, PCS, Box, Carton, MT, TON, BAG, ...
  // customs paid + proof
  customsPaid: "PAID"|"UNPAID"|"PARTIAL",
  customPaidProofUrl: String,          // Cloudinary secure_url (clickable)
  customPaidProofPublicId: String,     // Cloudinary public_id (for deletion/rename)
  customPaidProofResourceType: String, // image | raw
  customPaidProofFormat: String,
  remarks: String,
  source: "web"|"seed"|"api"
}

Indexes: vehicleRegNo, psidNumber, gdNumber, occurredAt.
Grouping key (computed): uppercased psidNumber if present, else uppercased gdNumber.`}</Code>
        <p className="mt-3 text-sm text-slate-600">
          Why flat documents + computed grouping instead of embedding vehicles in one PSID document: vehicles arrive over
          time at different stations; append-only documents are simpler, concurrency-safe, searchable, and totals are a
          cheap in-memory aggregation for demo scale (production: MongoDB aggregation pipeline / materialized totals).
          <b> approvedQuantity is stored per entry but the group uses the MAX across the group</b> — never summed — so
          "approved 1000 KG across N vehicles" works even if staff re-enter approved on each vehicle. Matching is
          case-insensitive on trimmed values.
        </p>
      </S>

      {/* ---------- logic ---------- */}
      <S id="logic" title="Duplicate detection & multi-vehicle quantity aggregation">
        <p className="text-sm text-slate-600">File: <code>lib/quantity.ts</code> → <code>analyzeEntries(entries)</code>. Two passes:</p>
        <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm text-slate-600">
          <li><b>Counting pass.</b> Build maps: PSID counts, GD counts, Vehicle counts, PSID|GD pair counts, PSID|GD|Vehicle exact counts (normalized uppercase/trim).</li>
          <li><b>Grouping pass.</b> Bucket entries by group key; stable-sort each bucket by occurredAt → createdAt → id; running sum of receivedQuantity.</li>
          <li><b>Flag pass.</b> Emit per-entry duplicates + quantity + alerts.</li>
        </ol>
        <Code>{`DUPLICATES (per entry, counting self):
duplicatePsid      = psidCount[psid] > 1
duplicateGd        = gdCount[gd] > 1
duplicateVehicle   = vehicleCount[vehicle] > 1
bothPsidAndGdUsed  = pairCount[psid|gd] > 1
exactDuplicate     = exactCount[psid|gd|vehicle] > 1

QUANTITY (per group, computed in time order):
approved = MAX(approvedQuantity across group)      // NOT summed
total    = SUM(receivedQuantity across vehicles)
before   = total BEFORE this vehicle (time-ordered)
status:
   total > approved (+1e-9)        → OVER_QUANTITY   // 🔴 over even by 1 KG
:  total >= 0.9 * approved         → NEAR_LIMIT      // 🟡 NEAR_LIMIT_RATIO = 0.9
:  total >= approved               → NEAR_LIMIT      // completed exactly
:                                   → OK             // 🟢
arrivedAfterCompletion = approved>0 && before >= approved && not first vehicle
remaining = approved - total ; exceedsBy = max(0, total - approved)`}</Code>
        <p className="mt-3 text-sm text-slate-600">
          On POST, duplicates are computed against <b>pre-existing</b> entries only (the new record is excluded from its
          own check), and quantity/status against the group <b>including</b> the new vehicle. Warnings never block saving.
          A live <code>GET /api/check-duplicate</code> powers inline form hints. KPIs: <code>computeKpis()</code>.
        </p>
      </S>

      {/* ---------- cloudinary ---------- */}
      <S id="cloudinary" title="Cloudinary upload & proof-link handling">
        <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-600">
          <li>Client picks image/PDF (≤10 MB) → <code>FormData</code> → <code>POST /api/upload</code> (Node runtime, field <code>file</code>).</li>
          <li>Server: <code>cloudinary.uploader.upload_stream</code> → folder <code>psid-gd-proofs</code> (env <code>CLOUDINARY_FOLDER</code>); resource_type image | raw (PDF); <code>secure: true</code>.</li>
          <li>Response <code>{`{ url: secure_url, publicId, resourceType, format, provider }`}</code> → client attaches <code>customPaidProofUrl</code> (+metadata) to the entry.</li>
          <li><code>POST /api/entries</code> persists the URL + public_id in MongoDB. UI renders a clickable <b>proof</b> link; <code>GET /api/upload</code> reports backend status.</li>
          <li>Cloudinary keys are required; no local storage fallback.</li>
        </ol>
      </S>

      {/* ---------- api ---------- */}
      <S id="api" title="API reference">
        <Code>{`GET    /api/entries?q&psid&gd&vehicle&unit&customsPaid&status
             → { entries[], groups[], kpis, totalUnfiltered, mode }
POST   /api/entries    body: EntryInput (vehicleRegNo + psid|gd required, qty>=0...)
             → 201 { entry, analysis{duplicatePsid,duplicateGd,duplicateVehicle,bothPsidAndGdUsed,exactDuplicate},
                      quantity, alerts, kpis }
DELETE /api/entries/[id]
GET    /api/entries/grouped  → { groups[] }   (all vehicles under each PSID/GD)
GET    /api/entries/stats    → KpiStats
GET    /api/check-duplicate?psid&gd&vehicle&excludeId
POST   /api/upload  (multipart 'file') → { url, provider, publicId, resourceType, format }
GET    /api/upload  → { cloudinaryConfigured, provider }
POST   /api/seed   | GET /api/seed   → reseed sample data
GET    /api/health → { mongoConfigured, mongoAvailable, cloudinaryConfigured, mode }`}</Code>
      </S>

      {/* ---------- frontend ---------- */}
      <S id="frontend" title="Frontend structure">
        <Code>{`app/layout.tsx            sticky top nav: /  /flow  /flow/dev
app/page.tsx              renders <Dashboard/>
components/Dashboard.tsx  KPIs · form · proof upload · live dup check · result panel
                          · search/filters · All Entries / Grouped / Alerts · delete · reseed
app/flow/page.tsx         client presentation (sections 1-7)
components/ScenarioSandbox.tsx  interactive scenario reusing analyzeEntries() in-browser
app/flow/dev/page.tsx     this page
app/api/**/route.ts       route handlers (App Router, Next 16)`}</Code>
      </S>

      {/* ---------- seed ---------- */}
      <S id="seed" title="Seed / sample data">
        <p className="text-sm text-slate-600">
          <code>lib/seed.ts</code> → <code>SEED_ENTRIES</code>: realistic customs scenarios — 1000 KG exactly complete (3 vehicles),
          1100 LTR over-quantity + late 4th vehicle, 490/500 PCS near-limit, duplicate vehicle across PSIDs, duplicate PSID
          under another GD, GD-only entry, mixed units, PAID/UNPAID/PARTIAL, demo proof URLs.
          Seed MongoDB via <code>npm run seed</code> or <code>POST /api/seed</code> (and the dashboard "Reset sample data" button).
        </p>
      </S>

      {/* ---------- RTM ---------- */}
      <S id="rtm" title="Requirement Traceability Matrix (RTM)">
        <p className="mb-3 text-sm text-slate-600">
          Every requirement from the project brief. Status: <b className="text-emerald-700">COVERED</b> = implemented in this
          demo · <b className="text-amber-700">PARTIAL</b> = implemented in simplified form · <b className="text-slate-500">PLANNED</b> =
          documented, production phase. "How it works" is step-by-step.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500">
                {["#", "Requirement (from brief)", "Status", "Why it exists", "How it works (step by step)", "Where"].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {RTM.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2 font-mono font-bold">{r.id}</td>
                  <td className="px-2 py-2 font-medium text-slate-800">{r.req}</td>
                  <td className="px-2 py-2"><Status s={r.status} /></td>
                  <td className="px-2 py-2 text-slate-600">{r.why}</td>
                  <td className="px-2 py-2 text-slate-600">{r.how}</td>
                  <td className="px-2 py-2 font-mono text-[10px] text-slate-500">{r.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </S>

      {/* ---------- edge cases ---------- */}
      <S id="edge-cases" title="Edge cases & notes">
        <ul className="ml-5 list-disc space-y-1 text-sm text-slate-600">
          <li><b>Over by 1:</b> <code>total &gt; approved + 1e-9</code> → OVER_QUANTITY. Floating point tolerance; use integer minor units in production.</li>
          <li><b>Exactly at limit:</b> total == approved → Near Limit/complete, NOT over. A later vehicle → OVER + arrivedAfterCompletion.</li>
          <li><b>Subsequent vehicle after completion:</b> detected via time-ordered <code>before &gt;= approved</code>; needs reliable timestamps (server-stamped occurredAt; tie-break createdAt,id).</li>
          <li><b>Zero-quantity vehicles:</b> allowed; still count as a vehicle; still trigger "after completion" flag; duplicate vehicle still checked.</li>
          <li><b>Missing PSID vs GD:</b> at least one required. Grouping prefers PSID, falls back to GD. A PSID+GD-less... can't happen. Same PSID different GD → separate groups BUT duplicatePsid flagged.</li>
          <li><b>Approved quantity re-entered per vehicle:</b> group approved = MAX, never sum. Approved = 0/absent → no limit checks, status OK (documented).</li>
          <li><b>Case/whitespace:</b> matching normalized (trim + uppercase). Display preserves original.</li>
          <li><b>Mixed units on one PSID:</b> NOT converted in demo; totals assume same unit. Production: normalize via unit-conversion table or reject mismatched unit per group.</li>
          <li><b>Partial customs paid:</b> PAID/PARTIAL/UNPAID; UNPAID+PARTIAL raise info alert; proof optional but recommended; proof never blocks.</li>
          <li><b>Duplicate does not block:</b> warnings only — human decides; production adds "force override with reason" audit.</li>
          <li><b>Deleting entries:</b> totals recomputed from remaining documents; nothing cached.</li>
          <li><b>Concurrency:</b> two vehicles saved simultaneously — append-only + recompute-on-read is safe; production: Mongo transactions / atomic <code>$inc</code> + unique indexes for hard duplicate prevention.</li>
          <li><b>Time:</b> server-stamped UTC ISO; client timezone only for display.</li>
          <li><b>No DB / no Cloudinary:</b> clear errors (no local fallbacks); <code>/api/health</code> reports <code>ok/mongoAvailable/cloudinaryConfigured</code>.</li>
        </ul>
      </S>

      {/* ---------- production ---------- */}
      <S id="production" title="Turning the demo into a production system">
        <ul className="ml-5 list-disc space-y-1 text-sm text-slate-600">
          <li><b>Auth &amp; roles:</b> SSO; roles field-staff (create/upload) / supervisor (override, delete) / auditor (read-only, proof access); per-port scoping; API auth.</li>
          <li><b>Hard duplicate prevention (optional):</b> unique indexes on (psid,gd,vehicle) behind a "block exact duplicates" flag; keep warn-only default.</li>
          <li><b>Approved quantity source of truth:</b> separate <code>psids</code>/<code>gds</code> collection (approved qty, item, unit, duty, exporter) referenced by entries; validate unit match.</li>
          <li><b>Audit logs:</b> append-only <code>audit_log</code> (who/what/when/before/after); no hard deletes (soft-delete); proof access logging.</li>
          <li><b>Unit handling:</b> canonical base unit per group + conversion factors (KG↔MT↔TON, LTR↔KL...); integer minor units; PCS/Box/Carton pack sizes from item master.</li>
          <li><b>Mobile access:</b> responsive PWA; offline queue + sync; camera capture; biometric/OTP auth for field staff; push alerts for supervisors.</li>
          <li><b>Scale:</b> MongoDB aggregation pipeline / materialized group totals updated in a transaction; pagination; indexes; read replicas.</li>
          <li><b>Cloudinary:</b> signed uploads (no server secret exposure), private + signed URLs for sensitive proofs, virus scan, PDF preview, retention policy, delete on record removal via public_id.</li>
          <li><b>Ops:</b> rate limiting, validation schema (zod), structured logs, error monitoring, health checks, backups, multi-region, CI/CD, i18n.</li>
          <li><b>Notifications:</b> real-time alerts (WebSocket/SSE/email/SMS) on over-quantity & duplicates.</li>
        </ul>
      </S>

      <p className="mt-8 text-xs text-slate-400">Next.js 16 App Router · React 19 · Tailwind CSS 4 · Mongoose · Cloudinary v2. Source: see repo. See also <Link href="/flow" className="underline">/flow</Link>.</p>
    </div>
  );
}

// ---------------- RTM data ----------------

interface RtmRow { id: string; req: string; status: "COVERED" | "PARTIAL" | "PLANNED"; why: string; how: string; where: string; }

const RTM: RtmRow[] = [
  { id: "R1", req: "New GitHub repository for this project; cloned onto the Desktop; entire project built inside the cloned repo.", status: "COVERED", why: "Clean versioned, shareable project root.", how: "gh repo create … ; gh repo clone … ~/Desktop/… ; app scaffolded inside that folder.", where: "repo root" },
  { id: "R2", req: "Clean .gitignore ignoring node_modules, .env*, .next, etc.", status: "COVERED", why: "Never commit dependencies, build output, secrets.", how: "gitignore entries for /node_modules, .next/, .env*, uploads, build outputs…", where: ".gitignore" },
  { id: "R3", req: ".env.example with MongoDB + Cloudinary placeholders.", status: "COVERED", why: "Easy onboarding; no real secrets committed.", how: "MONGODB_URI, CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET(+FOLDER) templates.", where: ".env.example" },
  { id: "R4", req: "Next.js (App Router).", status: "COVERED", why: "Modern React full-stack; server + client components; route handlers.", how: "app/ directory, page.tsx/layout.tsx, app/api/**/route.ts.", where: "app/" },
  { id: "R5", req: "Tailwind CSS.", status: "COVERED", why: "Fast responsive styling; mobile + laptop.", how: "Tailwind v4 @import 'tailwindcss'; utility classes; responsive breakpoints.", where: "app/globals.css, all components" },
  { id: "R6", req: "MongoDB for database storage (Mongoose or official driver).", status: "COVERED", why: "Document store fits per-vehicle append-only entries + flexible proof metadata.", how: "Mongoose model db.entries; cached connection; connectDb(); data layer lib/store.ts.", where: "lib/db.ts, lib/models/Entry.ts, lib/store.ts" },
  { id: "R7", req: "Cloudinary for storing + linking custom-paid proof images/documents; secure URLs saved in MongoDB.", status: "COVERED", why: "Scalable media storage; auditable proof; DB stays light.", how: "upload_stream→secure_url; customPaidProofUrl+public_id persisted; clickable link. Local fallback when unconfigured.", where: "lib/cloudinary.ts, app/api/upload/route.ts" },
  { id: "R8", req: "API route handlers.", status: "COVERED", why: "Clean UI→server separation; reusable REST.", how: "GET/POST/DELETE route.ts handlers under app/api.", where: "app/api/**" },
  { id: "R9", req: "Graceful fallback / seed data if env vars aren't configured; works out of the box.", status: "COVERED", why: "Smooth local testing & demo; no hard failure.", how: "No MONGODB_URI→memory store seeded; Mongo error→fallback; no Cloudinary→local uploads; seed + POST /api/seed + npm run seed; 'Reset sample data'.", where: "lib/seed.ts, lib/db.ts, lib/cloudinary.ts, app/api/seed, scripts/seed.mjs" },

  // Business rule 1 — quantity
  { id: "B1", req: "Single PSID or GD with Approved Quantity (e.g. 1000 KG) fulfilled across multiple vehicles (3,4,5,10+); units KG, LTR, PCS, Box, Carton, etc.", status: "COVERED", why: "Real loads arrive in multiple trucks; unit-agnostic.", how: "Group key PSID→GD; append-only vehicle docs; unit field; UNITS list.", where: "lib/quantity.ts, lib/types.ts" },
  { id: "B1a", req: "Sum received quantities per PSID/GD across all vehicle entries.", status: "COVERED", why: "True over-receipt detection needs cumulative totals.", how: "Per-group time-ordered running sum totalReceived; remaining/exceedsBy.", where: "analyzeEntries()" },
  { id: "B1b", req: "Show clear status OK / Near Limit / Over Quantity / Red Alert.", status: "COVERED", why: "Instant visual triage for staff.", how: "quantityStatus(): OVER>approved→red; ≥90%→Near; else OK; badges.", where: "StatusBadge, NEAR_LIMIT_RATIO=0.9" },
  { id: "B1c", req: "Flag when total exceeds approved quantity, even by 1 KG.", status: "COVERED", why: "Any overage is a compliance risk.", how: "total > approved + 1e-9 → OVER_QUANTITY; exceedsBy shown; alert text.", where: "quantityStatus(), alerts" },
  { id: "B1d", req: "Flag when a subsequent vehicle arrives after limit completion.", status: "COVERED", why: "Late vehicles after 100% received are suspicious.", how: "arrivedAfterCompletion = before>=approved && not first; alert.", where: "analyzeEntries()" },

  // Business rule 2 — duplicates
  { id: "B2", req: "Duplicate PSID detection.", status: "COVERED", why: "Same permit entered twice → double release risk.", how: "normalized count>1 → duplicatePsid; chip; alert; live check.", where: "analyzeEntries(), /api/check-duplicate" },
  { id: "B2a", req: "Duplicate GD detection.", status: "COVERED", why: "Same gate-duty slip twice.", how: "normalized count>1 → duplicateGd.", where: "analyzeEntries()" },
  { id: "B2b", req: "Duplicate Vehicle detection (where applicable).", status: "COVERED", why: "Same truck recorded twice.", how: "vehicleRegNo normalized count>1 → duplicateVehicle.", where: "analyzeEntries()" },
  { id: "B2c", req: "Flag when both PSID and GD were already used.", status: "COVERED", why: "Combination reuse signals duplicate record.", how: "pair count>1 → bothPsidAndGdUsed; +exactDuplicate when vehicle also matches.", where: "analyzeEntries()" },
  { id: "B2d", req: "Clear visual warnings/alerts without breaking the demo flow.", status: "COVERED", why: "Inform, don't block reality.", how: "chips + alert panel + live hints + saved-anyway message; Alerts tab.", where: "Dashboard.tsx" },

  // Business rule 3 — form fields
  { id: "B3", req: "Date & Time (automatic).", status: "COVERED", why: "Reliable ordering & audit.", how: "server-stamped occurredAt UTC ISO; no user input; tie-breaks.", where: "app/api/entries, model" },
  { id: "B3a", req: "Vehicle Registration No.", status: "COVERED", why: "Identify truck; duplicate vehicle check.", how: "required field; normalized matching.", where: "form + schema" },
  { id: "B3b", req: "Company Name.", status: "COVERED", why: "Carrier accountability.", how: "field + stored + searchable.", where: "form + schema" },
  { id: "B3c", req: "Driver Name.", status: "COVERED", why: "Driver accountability.", how: "field + stored + searchable.", where: "form + schema" },
  { id: "B3d", req: "PSID Number.", status: "COVERED", why: "Permit linkage; duplicate PSID; grouping.", how: "field; PSID-or-GD required; indexed.", where: "form + schema" },
  { id: "B3e", req: "GD Number.", status: "COVERED", why: "Gate-duty linkage; duplicate GD; grouping fallback.", how: "field; PSID-or-GD required; indexed.", where: "form + schema" },
  { id: "B3f", req: "Item Description.", status: "COVERED", why: "What's being moved.", how: "field + stored + searchable.", where: "form + schema" },
  { id: "B3g", req: "Approved Quantity.", status: "COVERED", why: "Limit to check against.", how: "number≥0; group approved=MAX; over-quantity math.", where: "form + schema" },
  { id: "B3h", req: "Received Quantity.", status: "COVERED", why: "Actuals; summed.", how: "number≥0; per-vehicle; summed per group.", where: "form + schema" },
  { id: "B3i", req: "A/U (unit).", status: "COVERED", why: "KG/LTR/PCS/Box/Carton…", how: "select + free text; UNITS list; filter by unit. (Conversion → production note.)", where: "form + schema" },
  { id: "B3j", req: "Customs Paid status.", status: "COVERED", why: "Compliance; proof pairing.", how: "PAID/UNPAID/PARTIAL; UNPAID+PARTIAL info alert; filter.", where: "form + schema" },
  { id: "B3k", req: "Custom Paid Proof upload (Cloudinary; clickable proof URL/link saved in MongoDB).", status: "COVERED", why: "Auditable evidence of duty payment.", how: "file→POST /api/upload→Cloudinary secure_url→customPaidProofUrl in Mongo→proof link. Local fallback.", where: "Dashboard.tsx, app/api/upload, lib/cloudinary.ts" },
  { id: "B3l", req: "Remarks.", status: "COVERED", why: "Free-text context.", how: "field + stored + searchable.", where: "form + schema" },

  // Business rule 4 — dashboard
  { id: "B4", req: "Summary KPI cards: Total PSIDs, Total Vehicles, Quantity OK, Duplicate/Alert count.", status: "COVERED", why: "At-a-glance operational health.", how: "computeKpis(); KPI grid (+Total GDs/Entries/Near Limit/Over).", where: "KpiStats, Dashboard.tsx" },
  { id: "B4a", req: "Search & filter by PSID, GD, or Vehicle No.", status: "COVERED", why: "Find records fast in ops.", how: "q/psid/gd/vehicle params server-side + filter bar; plus status/customs/unit.", where: "app/api/entries GET" },
  { id: "B4b", req: "Grouped/complete record view showing all vehicles under a PSID/GD.", status: "COVERED", why: "See full multi-vehicle picture.", how: "summarizeGroups(); 'Grouped by PSID/GD' expandable view; /api/entries/grouped.", where: "GroupedView, summarizeGroups()" },

  // Page routes
  { id: "P1", req: "Main web app demo at `/`: interactive dashboard, vehicle entry form (Cloudinary + MongoDB), alerts/violations, searchable records.", status: "COVERED", why: "Primary demo surface.", how: "app/page.tsx → Dashboard.", where: "app/page.tsx, components/Dashboard.tsx" },
  { id: "P2", req: "`/flow` client presentation & interactive walkthrough for client + seniors.", status: "COVERED", why: "Persuade & educate stakeholders.", how: "Sections: problem, features, real-world scenarios, entries/alerts, mobile/laptop, production, + interactive sandbox; nav-linked.", where: "app/flow/page.tsx, components/ScenarioSandbox.tsx" },
  { id: "P2a", req: "/flow explains every web feature.", status: "COVERED", why: "Clarity for non-technical readers.", how: "feature grid + explanations.", where: "app/flow" },
  { id: "P2b", req: "/flow explains entries & alerts in real-world scenarios (multi-vehicle, over-quantity).", status: "COVERED", why: "Ground in operations.", how: "Scenarios A–D.", where: "app/flow" },
  { id: "P2c", req: "/flow explains mobile & laptop views helping monitor staff/operations.", status: "COVERED", why: "Field + control-room split.", how: "section 5 + responsive design.", where: "app/flow" },
  { id: "P2d", req: "/flow includes interactive sample scenarios/steps.", status: "COVERED", why: "Show, don't just tell.", how: "ScenarioSandbox using production analyzeEntries(); step scenarios.", where: "components/ScenarioSandbox.tsx" },
  { id: "P3", req: "`/flow/dev` developer guide: architecture & data flow.", status: "COVERED", why: "Maintainability.", how: "diagram + layering + fallbacks.", where: "app/flow/dev" },
  { id: "P3a", req: "/flow/dev covers MongoDB schema design.", status: "COVERED", why: "Data modeling clarity.", how: "document shape + indexes + grouping + MAX-approved note.", where: "app/flow/dev" },
  { id: "P3b", req: "/flow/dev covers duplicate & quantity aggregation logic.", status: "COVERED", why: "Correctness transparency.", how: "3-pass algorithm + exact formulas.", where: "lib/quantity.ts + docs" },
  { id: "P3c", req: "/flow/dev covers Cloudinary upload & proof-link handling.", status: "COVERED", why: "Media pipeline clarity.", how: "upload_stream→secure_url→Mongo; fallback; public_id.", where: "app/flow/dev + lib/cloudinary.ts" },
  { id: "P3d", req: "Requirement Traceability Matrix: every client requirement; covered vs planned/pending; why; how step-by-step.", status: "COVERED", why: "Prove completeness & guide next phase.", how: "this table.", where: "app/flow/dev#rtm" },
  { id: "P3e", req: "Edge cases & production notes (auth/roles, audit logs, unit handling, mobile access...).", status: "COVERED", why: "Safe path to production.", how: "edge-case list + production checklist.", where: "app/flow/dev#edge-cases #production" },
  { id: "P4", req: "`/`, `/flow`, `/flow/dev` navigable from a top navigation bar; no dead links.", status: "COVERED", why: "Clean UX.", how: "sticky nav in app/layout.tsx.", where: "app/layout.tsx" },
];

// ---------------- helpers ----------------

function S({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-slate-900">{title}</h2>
      <div className="text-slate-700">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{children}</pre>;
}

function Status({ s }: { s: RtmRow["status"] }) {
  const map = {
    COVERED: "bg-emerald-100 text-emerald-800",
    PARTIAL: "bg-amber-100 text-amber-800",
    PLANNED: "bg-slate-100 text-slate-600",
  } as const;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${map[s]}`}>{s}</span>;
}
