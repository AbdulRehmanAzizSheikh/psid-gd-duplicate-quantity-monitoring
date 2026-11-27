import { Entry, EntryInput } from "./types";

// ---------------------------------------------------------------------------
// Sample / seed data for a smooth out-of-the-box demo.
// Covers: multi-vehicle loading, over-quantity, near-limit, duplicates,
// duplicate vehicles, GD-only entries, mixed units, customs-paid variations.
// ---------------------------------------------------------------------------

const DEMO_PROOF = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
const DEMO_PROOF_2 = "https://res.cloudinary.com/demo/image/upload/sample_people.jpg";

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600_000).toISOString();
}

export const SEED_ENTRIES: (EntryInput & { occurredAt: string })[] = [
  // --- PSID-PS-2024-000123 / GD 1234567 : 1000 KG approved, 3 vehicles, EXACTLY complete (1000 KG total) ---
  {
    vehicleRegNo: "LEA-4521", companyName: "Karachi Port Logistics", driverName: "Ahmed Khan",
    psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice",
    approvedQuantity: 1000, receivedQuantity: 400, unit: "KG", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, customPaidProofPublicId: "seed/proof-1", remarks: "1st vehicle",
    occurredAt: iso(26),
  },
  {
    vehicleRegNo: "LEB-9087", companyName: "Karachi Port Logistics", driverName: "Bilal Raza",
    psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice",
    approvedQuantity: 1000, receivedQuantity: 350, unit: "KG", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, customPaidProofPublicId: "seed/proof-2", remarks: "2nd vehicle",
    occurredAt: iso(24),
  },
  {
    vehicleRegNo: "LEC-3312", companyName: "Karachi Port Logistics", driverName: "Usman Sheikh",
    psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice",
    approvedQuantity: 1000, receivedQuantity: 250, unit: "KG", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF_2, remarks: "3rd vehicle - completes 1000 KG",
    occurredAt: iso(22),
  },

  // --- PS-2024-000456 / GD 7654321 : 1000 KG approved, 3 vehicles = 1100 KG -> OVER QUANTITY / RED ALERT ---
  {
    vehicleRegNo: "LED-7710", companyName: "Faisal Movers", driverName: "Imran Qureshi",
    psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil",
    approvedQuantity: 1000, receivedQuantity: 400, unit: "LTR", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, remarks: "1st tanker",
    occurredAt: iso(20),
  },
  {
    vehicleRegNo: "LEE-2233", companyName: "Faisal Movers", driverName: "Naveed Ali",
    psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil",
    approvedQuantity: 1000, receivedQuantity: 350, unit: "LTR", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, remarks: "2nd tanker",
    occurredAt: iso(18),
  },
  {
    vehicleRegNo: "LEF-5566", companyName: "Faisal Movers", driverName: "Shahid Afridi",
    psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil",
    approvedQuantity: 1000, receivedQuantity: 350, unit: "LTR", customsPaid: "PARTIAL",
    customPaidProofUrl: DEMO_PROOF_2, remarks: "3rd tanker - OVER by 100 LTR",
    occurredAt: iso(16),
  },
  {
    // subsequent vehicle arrives AFTER limit completion
    vehicleRegNo: "LEG-8899", companyName: "Faisal Movers", driverName: "Zubair Khan",
    psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil",
    approvedQuantity: 1000, receivedQuantity: 10, unit: "LTR", customsPaid: "UNPAID",
    remarks: "Late 4th vehicle after 1000 LTR already reached", occurredAt: iso(14),
  },

  // --- PS-2024-000789 / GD 2468101 : 500 PCS approved, 2 vehicles = 490 PCS -> NEAR LIMIT ---
  {
    vehicleRegNo: "LEH-1122", companyName: "Citrus Traders", driverName: "Kamran Malik",
    psidNumber: "PS-2024-000789", gdNumber: "2468101", itemDescription: "Canned Tuna",
    approvedQuantity: 500, receivedQuantity: 240, unit: "PCS", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, remarks: "box truck 1", occurredAt: iso(12),
  },
  {
    vehicleRegNo: "LEI-3344", companyName: "Citrus Traders", driverName: "Rehan Butt",
    psidNumber: "PS-2024-000789", gdNumber: "2468101", itemDescription: "Canned Tuna",
    approvedQuantity: 500, receivedQuantity: 250, unit: "PCS", customsPaid: "UNPAID",
    remarks: "box truck 2 - 490/500 near limit", occurredAt: iso(10),
  },

  // --- PS-2024-000999 : duplicate vehicle usage (same vehicle, different PSIDs) ---
  {
    vehicleRegNo: "LEH-1122", companyName: "Citrus Traders", driverName: "Kamran Malik",
    psidNumber: "PS-2024-000999", gdNumber: "1357911", itemDescription: "Bottled Water",
    approvedQuantity: 100, receivedQuantity: 100, unit: "Carton", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, remarks: "Duplicate Vehicle flag - LEH-1122 already used", occurredAt: iso(8),
  },

  // --- GD-only entry (no PSID) ---
  {
    vehicleRegNo: "LEJ-9900", companyName: "Blue Ocean Shipping", driverName: "Tariq Hassan",
    psidNumber: "", gdNumber: "9876543", itemDescription: "Steel Coils",
    approvedQuantity: 50, receivedQuantity: 50, unit: "MT", customsPaid: "PAID",
    customPaidProofUrl: DEMO_PROOF, remarks: "GD-only customs entry, no PSID", occurredAt: iso(6),
  },

  // --- Duplicate PSID + Duplicate GD example: reuse PS-2024-000123 with a DIFFERENT GD ---
  {
    vehicleRegNo: "LEK-5522", companyName: "Karachi Port Logistics", driverName: "Fahad Nawaz",
    psidNumber: "PS-2024-000123", gdNumber: "1122334", itemDescription: "Basmati Rice",
    approvedQuantity: 1000, receivedQuantity: 0, unit: "KG", customsPaid: "UNPAID",
    remarks: "Duplicate PSID flag - PSID already used under another GD", occurredAt: iso(4),
  },
];

export function buildSeedEntries(startId = 1): Entry[] {
  return SEED_ENTRIES.map((e, i) => ({
    ...e,
    id: String(startId + i),
    customPaidProofPublicId: e.customPaidProofPublicId ?? "",
    customPaidProofResourceType: "image",
    customPaidProofFormat: "jpg",
    createdAt: e.occurredAt,
  }));
}
