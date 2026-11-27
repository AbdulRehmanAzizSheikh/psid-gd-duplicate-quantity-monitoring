// Core duplicate-detection and multi-vehicle quantity aggregation logic.
// Pure functions shared by API routes AND client components (used in /flow demos).

import {
  AnalyzedEntry,
  CustomsPaid,
  DuplicateFlags,
  Entry,
  GroupSummary,
  KpiStats,
  NEAR_LIMIT_RATIO,
  QuantityInfo,
  QuantityStatus,
} from "./types";

const norm = (s: string | undefined | null) => (s ?? "").trim().toUpperCase();

export function groupKeyOf(e: { psidNumber: string; gdNumber: string }): {
  key: string;
  by: "PSID" | "GD";
} {
  if (norm(e.psidNumber)) return { key: norm(e.psidNumber), by: "PSID" };
  return { key: norm(e.gdNumber), by: "GD" };
}

/** Group entries per PSID (falling back to GD) and compute totals. */
export function summarizeGroups(entries: AnalyzedEntry[]): GroupSummary[] {
  const map = new Map<string, AnalyzedEntry[]>();
  for (const e of entries) {
    const { key } = groupKeyOf(e);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const groups: GroupSummary[] = [];
  for (const [key, list] of map) {
    const first = list[0];
    const totalReceived = round2(list.reduce((s, e) => s + num(e.receivedQuantity), 0));
    const approvedQuantity = round2(
      list.reduce((m, e) => Math.max(m, num(e.approvedQuantity)), 0)
    );
    const status = quantityStatus(totalReceived, approvedQuantity);
    const vehicleRegNos = list.map((e) => e.vehicleRegNo);
    groups.push({
      groupKey: key,
      groupBy: groupKeyOf(first).by,
      psidNumber: first.psidNumber,
      gdNumber: first.gdNumber,
      itemDescription: first.itemDescription,
      unit: first.unit,
      approvedQuantity,
      totalReceived,
      remaining: round2(approvedQuantity - totalReceived),
      exceedsBy: round2(Math.max(0, totalReceived - approvedQuantity)),
      status,
      vehicleCount: list.length,
      duplicatePsid: list.some((e) => e.duplicates.duplicatePsid),
      duplicateGd: list.some((e) => e.duplicates.duplicateGd),
      duplicateVehicle: list.some((e) => e.duplicates.duplicateVehicle),
      vehicleRegNos,
      entries: list,
    });
  }
  groups.sort((a, b) => a.groupKey.localeCompare(b.groupKey));
  return groups;
}

export function quantityStatus(total: number, approved: number): QuantityStatus {
  if (approved > 0 && total > approved + 1e-9) return "OVER_QUANTITY"; // over even by 1 KG
  if (approved > 0 && total >= approved * NEAR_LIMIT_RATIO - 1e-9) return "NEAR_LIMIT";
  if (approved > 0 && total >= approved - 1e-9) return "NEAR_LIMIT"; // exactly complete
  return "OK";
}

/**
 * Analyze a full list of raw entries:
 *  - duplicate detection (PSID / GD / Vehicle / both / exact)
 *  - per-group quantity totals, status, over-quantity amount
 *  - "subsequent vehicle after limit completion" detection
 *  - human-readable alert strings
 */
export function analyzeEntries(entries: Entry[]): AnalyzedEntry[] {
  // ---- duplicate counts across the whole dataset ----
  const psidCounts = new Map<string, number>();
  const gdCounts = new Map<string, number>();
  const vehicleCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>(); // psid|gd
  const exactCounts = new Map<string, number>(); // psid|gd|vehicle

  for (const e of entries) {
    bump(psidCounts, norm(e.psidNumber));
    bump(gdCounts, norm(e.gdNumber));
    bump(vehicleCounts, norm(e.vehicleRegNo));
    bump(pairCounts, `${norm(e.psidNumber)}|${norm(e.gdNumber)}`, Boolean(norm(e.psidNumber) || norm(e.gdNumber)));
    bump(
      exactCounts,
      `${norm(e.psidNumber)}|${norm(e.gdNumber)}|${norm(e.vehicleRegNo)}`,
      Boolean(norm(e.vehicleRegNo))
    );
  }

  // ---- group + order for quantity accumulation ----
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const { key } = groupKeyOf(e);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const quantityById = new Map<string, QuantityInfo>();
  for (const [key, list] of groups) {
    const by = groupKeyOf(list[0]).by;
    // stable order by occurredAt then createdAt then id
    const sorted = [...list].sort((a, b) => {
      const t = (a.occurredAt || "").localeCompare(b.occurredAt || "");
      if (t !== 0) return t;
      const c = (a.createdAt || "").localeCompare(b.createdAt || "");
      if (c !== 0) return c;
      return a.id.localeCompare(b.id);
    });
    const approvedQuantity = round2(sorted.reduce((m, e) => Math.max(m, num(e.approvedQuantity)), 0));
    let running = 0;
    sorted.forEach((e, idx) => {
      const received = num(e.receivedQuantity);
      const totalBefore = running;
      running = round2(running + received);
      const totalReceived = running;
      const status = quantityStatus(totalReceived, approvedQuantity);
      const arrivedAfterCompletion =
        approvedQuantity > 0 && totalBefore >= approvedQuantity - 1e-9 && idx > 0;
      quantityById.set(e.id, {
        groupKey: key,
        groupBy: by,
        approvedQuantity,
        totalReceivedBefore: round2(totalBefore),
        totalReceived,
        remaining: round2(approvedQuantity - totalReceived),
        exceedsBy: round2(Math.max(0, totalReceived - approvedQuantity)),
        status,
        arrivedAfterCompletion,
        sequence: idx + 1,
        vehicleCount: sorted.length,
      });
    });
  }

  // ---- build analyzed entries with alerts ----
  return entries.map((e) => {
    const psidKey = norm(e.psidNumber);
    const gdKey = norm(e.gdNumber);
    const vehKey = norm(e.vehicleRegNo);
    const pairKey = `${psidKey}|${gdKey}`;
    const exactKey = `${psidKey}|${gdKey}|${vehKey}`;

    const duplicates: DuplicateFlags = {
      duplicatePsid: psidKey !== "" && (psidCounts.get(psidKey) ?? 0) > 1,
      duplicateGd: gdKey !== "" && (gdCounts.get(gdKey) ?? 0) > 1,
      duplicateVehicle: vehKey !== "" && (vehicleCounts.get(vehKey) ?? 0) > 1,
      bothPsidAndGdUsed:
        psidKey !== "" && gdKey !== "" && (pairCounts.get(pairKey) ?? 0) > 1,
      exactDuplicate: vehKey !== "" && (exactCounts.get(exactKey) ?? 0) > 1,
      psidCount: psidKey ? psidCounts.get(psidKey) ?? 0 : 0,
      gdCount: gdKey ? gdCounts.get(gdKey) ?? 0 : 0,
      vehicleCount: vehKey ? vehicleCounts.get(vehKey) ?? 0 : 0,
    };

    const quantity: QuantityInfo =
      quantityById.get(e.id) ?? {
        groupKey: groupKeyOf(e).key,
        groupBy: groupKeyOf(e).by,
        approvedQuantity: num(e.approvedQuantity),
        totalReceivedBefore: 0,
        totalReceived: num(e.receivedQuantity),
        remaining: num(e.approvedQuantity) - num(e.receivedQuantity),
        exceedsBy: Math.max(0, num(e.receivedQuantity) - num(e.approvedQuantity)),
        status: quantityStatus(num(e.receivedQuantity), num(e.approvedQuantity)),
        arrivedAfterCompletion: false,
        sequence: 1,
        vehicleCount: 1,
      };

    const alerts: string[] = [];
    if (duplicates.duplicatePsid)
      alerts.push(`Duplicate PSID: ${e.psidNumber} already used on ${duplicates.psidCount - 1} other entr${duplicates.psidCount - 1 === 1 ? "y" : "ies"}`);
    if (duplicates.duplicateGd)
      alerts.push(`Duplicate GD: ${e.gdNumber} already used on ${duplicates.gdCount - 1} other entr${duplicates.gdCount - 1 === 1 ? "y" : "ies"}`);
    if (duplicates.duplicateVehicle)
      alerts.push(`Duplicate Vehicle: ${e.vehicleRegNo} already used on ${duplicates.vehicleCount - 1} other entr${duplicates.vehicleCount - 1 === 1 ? "y" : "ies"}`);
    if (duplicates.bothPsidAndGdUsed)
      alerts.push(`Both PSID ${e.psidNumber} and GD ${e.gdNumber} were already used together`);
    if (duplicates.exactDuplicate)
      alerts.push(`Exact duplicate record: same PSID + GD + Vehicle already exists`);
    if (quantity.status === "OVER_QUANTITY")
      alerts.push(
        `Over quantity / Red Alert: total ${quantity.totalReceived} ${e.unit} exceeds approved ${quantity.approvedQuantity} ${e.unit} by ${quantity.exceedsBy} ${e.unit}`
      );
    else if (quantity.status === "NEAR_LIMIT")
      alerts.push(
        `Near limit: total ${quantity.totalReceived} ${e.unit} of approved ${quantity.approvedQuantity} ${e.unit}`
      );
    if (quantity.arrivedAfterCompletion)
      alerts.push(
        `Subsequent vehicle arrived after limit completion: ${quantity.totalReceivedBefore} ${e.unit} already received before this vehicle`
      );
    if (e.customsPaid !== "PAID")
      alerts.push(`Customs paid status: ${e.customsPaid}`);

    return { ...e, duplicates, quantity, alerts };
  });
}

export function computeKpis(entries: AnalyzedEntry[], mode: "mongodb"): KpiStats {
  const groups = summarizeGroups(entries);
  const psids = new Set(entries.map((e) => norm(e.psidNumber)).filter(Boolean));
  const gds = new Set(entries.map((e) => norm(e.gdNumber)).filter(Boolean));
  const vehicles = new Set(entries.map((e) => norm(e.vehicleRegNo)).filter(Boolean));
  return {
    totalEntries: entries.length,
    totalPsids: psids.size,
    totalGds: gds.size,
    totalVehicles: vehicles.size,
    totalGroups: groups.length,
    quantityOk: groups.filter((g) => g.status === "OK").length,
    nearLimit: groups.filter((g) => g.status === "NEAR_LIMIT").length,
    overQuantity: groups.filter((g) => g.status === "OVER_QUANTITY").length,
    duplicateCount: entries.filter(
      (e) =>
        e.duplicates.duplicatePsid ||
        e.duplicates.duplicateGd ||
        e.duplicates.duplicateVehicle ||
        e.duplicates.bothPsidAndGdUsed
    ).length,
    alertCount: entries.reduce((s, e) => s + e.alerts.length, 0),
    customsPaidCount: entries.filter((e) => e.customsPaid === ("PAID" as CustomsPaid)).length,
    customsUnpaidCount: entries.filter((e) => e.customsPaid !== ("PAID" as CustomsPaid)).length,
    proofCount: entries.filter((e) => Boolean(e.customPaidProofUrl)).length,
    mode,
  };
}

// ---------- helpers ----------

function bump(map: Map<string, number>, key: string, cond = true) {
  if (!cond || key === "" || key === "|") return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
