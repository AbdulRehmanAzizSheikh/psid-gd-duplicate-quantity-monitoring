# PSID & GD Duplicate and Quantity Monitoring System

A clean, working **demo web application** for customs PSID & GD duplicate detection plus **multi-vehicle quantity
monitoring** — built with **Next.js (App Router)**, **Tailwind CSS**, **MongoDB** (Mongoose), and **Cloudinary**
(for custom-paid proof images/documents).

**Real infrastructure only:** nothing runs locally or in-memory. **MongoDB** (`MONGODB_URI`, e.g. Atlas) and **Cloudinary** keys are **required**. Seed MongoDB with `npm run seed`; proof uploads always go to **Cloudinary**.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # REQUIRED — fill MongoDB + Cloudinary
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

Seed MongoDB (sample data; also "Reset sample data" button + `POST /api/seed`):

```bash
npm run seed                 # reads MONGODB_URI
```

## Pages

| Route | What it is |
|---|---|
| **`/`** | Main live demo: interactive dashboard (KPI cards), vehicle entry form (proof upload + MongoDB persistence), live duplicate checks, alerts/violations view, search & filters, **grouped per PSID/GD** record view. |
| **`/flow`** | Client presentation & interactive walkthrough for client + seniors: every feature, real-world scenarios (multi-vehicle loading, over-quantity), mobile & laptop usage, **interactive sample scenario**. |
| **`/flow/dev`** | Developer guide: **architecture & data flow**, MongoDB schema, duplicate/quantity aggregation logic, Cloudinary proof handling, **Requirement Traceability Matrix** (every brief requirement → status + why + how), edge cases, production notes. |

All three are linked from the top navigation bar. API docs are on `/flow/dev`.

## Core business rules implemented

1. **Multi-vehicle quantity tracking.** One PSID/GD has an *approved quantity* (e.g. `1000 KG`) and can be fulfilled
   across any number of vehicles. Received quantities are **summed per PSID/GD**. Units: `KG, LTR, PCS, Box, Carton,
   MT, TON, BAG, Drum, Pallet, SET`, … Status: **OK / Near Limit (≥90%) / Over Quantity — Red Alert**. Over-quantity
   fires when total exceeds approved **even by 1 KG**, and when a **subsequent vehicle arrives after limit completion**.
2. **Duplicate detection.** Flags **Duplicate PSID**, **Duplicate GD**, **Duplicate Vehicle**, **both PSID + GD used**,
   and exact duplicates — visual warnings + a live in-form check + an alerts view. **Never blocks** the demo flow.
3. **Vehicle entry fields.** Date & Time (automatic), Vehicle Registration No, Company Name, Driver Name, PSID Number,
   GD Number, Item Description, Approved Quantity, Received Quantity, **A/U**, **Customs Paid** (PAID/UNPAID/PARTIAL),
   **Custom Paid Proof upload → Cloudinary, secure URL saved in MongoDB**, Remarks.
4. **Dashboard.** KPI cards (Total PSIDs, Total Vehicles, Total Entries, Total GDs, Quantity OK, Near Limit,
   Over/Duplicate alerts), search & filter by PSID / GD / Vehicle No / status / customs, grouped complete record view.

## Tech stack

- **Next.js 16 App Router** + React 19 + TypeScript; route handlers under `app/api/**`
- **Tailwind CSS v4**
- **MongoDB** via **Mongoose** (`lib/models/Entry.ts`, `lib/db.ts`, `lib/store.ts`); **required**, no in-memory fallback
- **Cloudinary** (`lib/cloudinary.ts`, `POST /api/upload`); **required** for proofs, no local fallback
- Pure shared domain logic `lib/quantity.ts` (used server-side **and** client-side)

## Environment variables (`.env.example`)

```
MONGODB_URI=mongodb://127.0.0.1:27017/psid-gd-monitor   # or Atlas mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=psid-gd-proofs                        # optional (default: psid-gd-proofs)
```

MongoDB + Cloudinary keys are **required**. `GET /api/health` reports what's active.

## API routes

```
GET    /api/entries?q&psid&gd&vehicle&unit&customsPaid&status
POST   /api/entries
DELETE /api/entries/[id]
GET    /api/entries/grouped
GET    /api/entries/stats
GET    /api/check-duplicate?psid&gd&vehicle&excludeId
POST   /api/upload            (multipart 'file', ≤10MB image/PDF)
GET    /api/upload
POST|GET /api/seed
GET    /api/health
```

## Project layout

```
app/                 pages + API route handlers (App Router)
  page.tsx           dashboard
  flow/page.tsx      client presentation
  flow/dev/page.tsx  developer guide + RTM
  api/**/route.ts
components/          Dashboard.tsx, ScenarioSandbox.tsx
lib/                 quantity.ts, types.ts, db.ts, store.ts, seed.ts, cloudinary.ts, models/Entry.ts
scripts/seed.mjs     npm run seed
.env.example
```
