// npm run seed — insert sample data into MongoDB (no-op safe).
// Uses the same seed definitions as the app (lib/seed.ts) — here re-implemented
// in plain JS so it runs with plain node without a TS loader.

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

const DEMO_PROOF = "https://res.cloudinary.com/demo/image/upload/sample.jpg";

function iso(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 3600_000);
}

const SEED = [
  { vehicleRegNo: "LEA-4521", companyName: "Karachi Port Logistics", driverName: "Ahmed Khan", psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice", approvedQuantity: 1000, receivedQuantity: 400, unit: "KG", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "1st vehicle", occurredAt: iso(26) },
  { vehicleRegNo: "LEB-9087", companyName: "Karachi Port Logistics", driverName: "Bilal Raza", psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice", approvedQuantity: 1000, receivedQuantity: 350, unit: "KG", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "2nd vehicle", occurredAt: iso(24) },
  { vehicleRegNo: "LEC-3312", companyName: "Karachi Port Logistics", driverName: "Usman Sheikh", psidNumber: "PS-2024-000123", gdNumber: "1234567", itemDescription: "Basmati Rice", approvedQuantity: 1000, receivedQuantity: 250, unit: "KG", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "3rd vehicle - completes 1000 KG", occurredAt: iso(22) },
  { vehicleRegNo: "LED-7710", companyName: "Faisal Movers", driverName: "Imran Qureshi", psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil", approvedQuantity: 1000, receivedQuantity: 400, unit: "LTR", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "1st tanker", occurredAt: iso(20) },
  { vehicleRegNo: "LEE-2233", companyName: "Faisal Movers", driverName: "Naveed Ali", psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil", approvedQuantity: 1000, receivedQuantity: 350, unit: "LTR", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "2nd tanker", occurredAt: iso(18) },
  { vehicleRegNo: "LEF-5566", companyName: "Faisal Movers", driverName: "Shahid Afridi", psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil", approvedQuantity: 1000, receivedQuantity: 350, unit: "LTR", customsPaid: "PARTIAL", customPaidProofUrl: DEMO_PROOF, remarks: "3rd tanker - OVER by 100 LTR", occurredAt: iso(16) },
  { vehicleRegNo: "LEG-8899", companyName: "Faisal Movers", driverName: "Zubair Khan", psidNumber: "PS-2024-000456", gdNumber: "7654321", itemDescription: "Crude Palm Oil", approvedQuantity: 1000, receivedQuantity: 10, unit: "LTR", customsPaid: "UNPAID", remarks: "Late 4th vehicle after 1000 LTR already reached", occurredAt: iso(14) },
  { vehicleRegNo: "LEH-1122", companyName: "Citrus Traders", driverName: "Kamran Malik", psidNumber: "PS-2024-000789", gdNumber: "2468101", itemDescription: "Canned Tuna", approvedQuantity: 500, receivedQuantity: 240, unit: "PCS", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "box truck 1", occurredAt: iso(12) },
  { vehicleRegNo: "LEI-3344", companyName: "Citrus Traders", driverName: "Rehan Butt", psidNumber: "PS-2024-000789", gdNumber: "2468101", itemDescription: "Canned Tuna", approvedQuantity: 500, receivedQuantity: 250, unit: "PCS", customsPaid: "UNPAID", remarks: "box truck 2 - 490/500 near limit", occurredAt: iso(10) },
  { vehicleRegNo: "LEH-1122", companyName: "Citrus Traders", driverName: "Kamran Malik", psidNumber: "PS-2024-000999", gdNumber: "1357911", itemDescription: "Bottled Water", approvedQuantity: 100, receivedQuantity: 100, unit: "Carton", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "Duplicate Vehicle flag", occurredAt: iso(8) },
  { vehicleRegNo: "LEJ-9900", companyName: "Blue Ocean Shipping", driverName: "Tariq Hassan", psidNumber: "", gdNumber: "9876543", itemDescription: "Steel Coils", approvedQuantity: 50, receivedQuantity: 50, unit: "MT", customsPaid: "PAID", customPaidProofUrl: DEMO_PROOF, remarks: "GD-only customs entry, no PSID", occurredAt: iso(6) },
  { vehicleRegNo: "LEK-5522", companyName: "Karachi Port Logistics", driverName: "Fahad Nawaz", psidNumber: "PS-2024-000123", gdNumber: "1122334", itemDescription: "Basmati Rice", approvedQuantity: 1000, receivedQuantity: 0, unit: "KG", customsPaid: "UNPAID", remarks: "Duplicate PSID flag", occurredAt: iso(4) },
];

async function main() {
  if (!MONGODB_URI) {
    console.log("MONGODB_URI not set — nothing to seed. App will run in memory mode with sample data.");
    return;
  }
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const col = mongoose.connection.db.collection("entries");
  await col.deleteMany({});
  await col.insertMany(SEED.map((e) => ({ ...e, source: "seed", createdAt: e.occurredAt, updatedAt: e.occurredAt })));
  console.log(`Seeded ${SEED.length} entries into 'entries'.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
