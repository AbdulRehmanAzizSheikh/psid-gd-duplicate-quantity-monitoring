// Shared domain types for the PSID & GD Duplicate and Quantity Monitoring System.

export type CustomsPaid = "PAID" | "UNPAID" | "PARTIAL";

export const UNITS = [
  "KG",
  "LTR",
  "PCS",
  "Box",
  "Carton",
  "MT",
  "TON",
  "BAG",
  "Drum",
  "Pallet",
  "SET",
] as const;

export type Unit = (typeof UNITS)[number] | string;

export interface EntryInput {
  vehicleRegNo: string;
  companyName: string;
  driverName: string;
  psidNumber: string; // may be empty if a GD is provided
  gdNumber: string; // may be empty if a PSID is provided
  itemDescription: string;
  approvedQuantity: number; // approved quantity for the PSID/GD (in `unit`)
  receivedQuantity: number; // quantity received on THIS vehicle
  unit: Unit; // A/U
  customsPaid: CustomsPaid;
  customPaidProofUrl?: string; // Cloudinary secure URL (or local fallback URL)
  customPaidProofPublicId?: string;
  customPaidProofResourceType?: string;
  customPaidProofFormat?: string;
  remarks: string;
  occurredAt?: string; // ISO timestamp; server sets automatically when omitted
}

export interface Entry extends EntryInput {
  id: string;
  occurredAt: string; // ISO timestamp (automatic)
  createdAt: string; // ISO timestamp (automatic)
}

// ---------- Analysis output ----------

export type QuantityStatus = "OK" | "NEAR_LIMIT" | "OVER_QUANTITY";

export const NEAR_LIMIT_RATIO = 0.9; // totals >= 90% of approved are "Near Limit"

export interface DuplicateFlags {
  duplicatePsid: boolean;
  duplicateGd: boolean;
  duplicateVehicle: boolean;
  bothPsidAndGdUsed: boolean; // this PSID and GD were already used together
  exactDuplicate: boolean; // same PSID + GD + Vehicle combination seen before
  psidCount: number; // total entries sharing this PSID (incl. self)
  gdCount: number; // total entries sharing this GD (incl. self)
  vehicleCount: number; // total entries sharing this Vehicle Reg No (incl. self)
}

export interface QuantityInfo {
  groupKey: string; // PSID if present, else GD
  groupBy: "PSID" | "GD";
  approvedQuantity: number; // approved for the whole group
  totalReceivedBefore: number; // sum on vehicles before this one
  totalReceived: number; // sum across all vehicles in the group
  remaining: number; // approved - totalReceived (negative when over)
  exceedsBy: number; // how much total exceeds approved (0 when not over)
  status: QuantityStatus;
  arrivedAfterCompletion: boolean; // this vehicle arrived after limit was already reached
  sequence: number; // 1-based vehicle order within group
  vehicleCount: number; // number of vehicles in group
}

export interface AnalyzedEntry extends Entry {
  duplicates: DuplicateFlags;
  quantity: QuantityInfo;
  alerts: string[]; // human-readable alert messages
}

export interface GroupSummary {
  groupKey: string;
  groupBy: "PSID" | "GD";
  psidNumber: string;
  gdNumber: string;
  itemDescription: string;
  unit: Unit;
  approvedQuantity: number;
  totalReceived: number;
  remaining: number;
  exceedsBy: number;
  status: QuantityStatus;
  vehicleCount: number;
  duplicatePsid: boolean;
  duplicateGd: boolean;
  duplicateVehicle: boolean;
  vehicleRegNos: string[];
  entries: AnalyzedEntry[];
}

export interface KpiStats {
  totalEntries: number; // total vehicle entries
  totalPsids: number; // unique PSIDs
  totalGds: number; // unique GDs
  totalVehicles: number; // unique vehicle registration numbers
  totalGroups: number; // unique PSID/GD groups
  quantityOk: number; // groups with status OK
  nearLimit: number; // groups with status NEAR_LIMIT
  overQuantity: number; // groups with status OVER_QUANTITY
  duplicateCount: number; // entries carrying any duplicate flag
  alertCount: number; // total alerts across entries
  customsPaidCount: number;
  customsUnpaidCount: number;
  proofCount: number; // entries with a proof URL
  mode: "mongodb"; // storage backend in use
}
