import { connectDb, isMongoAvailable } from "./db";
import { EntryModel } from "./models/Entry";
import { Entry, EntryInput } from "./types";
import * as mem from "./memoryStore";

// Data-access layer: MongoDB when available, in-memory seed store otherwise.

export async function storageMode(): Promise<"mongodb" | "memory"> {
  const m = await connectDb();
  return m && isMongoAvailable() ? "mongodb" : "memory";
}

export async function listEntries(): Promise<Entry[]> {
  const m = await connectDb();
  if (m && isMongoAvailable()) {
    try {
      const docs = await EntryModel.find({}).sort({ occurredAt: 1 }).lean();
      return docs.map(docToEntry);
    } catch (err) {
      console.error("[store] Mongo read failed, using memory:", (err as Error)?.message);
    }
  }
  return mem.memList();
}

export async function addEntry(input: EntryInput): Promise<Entry> {
  const now = new Date().toISOString();
  const record = {
    ...input,
    customPaidProofUrl: input.customPaidProofUrl ?? "",
    occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : now,
  };
  const m = await connectDb();
  if (m && isMongoAvailable()) {
    try {
      const doc = await EntryModel.create(record);
      return docToEntry(doc.toObject());
    } catch (err) {
      console.error("[store] Mongo write failed, using memory:", (err as Error)?.message);
    }
  }
  return mem.memAdd({ ...record, createdAt: now });
}

export async function removeEntry(id: string): Promise<boolean> {
  const m = await connectDb();
  if (m && isMongoAvailable()) {
    try {
      const res = await EntryModel.findByIdAndDelete(id);
      return Boolean(res);
    } catch {
      // fall through to memory
    }
  }
  return mem.memRemove(id);
}

export async function reseed(): Promise<number> {
  const { buildSeedEntries } = await import("./seed");
  const m = await connectDb();
  if (m && isMongoAvailable()) {
    try {
      await EntryModel.deleteMany({});
      const seeds = buildSeedEntries().map((e) => {
        const { id, ...rest } = e;
        return { ...rest, occurredAt: new Date(e.occurredAt), createdAt: new Date(e.createdAt) };
      });
      await EntryModel.insertMany(seeds);
      return seeds.length;
    } catch (err) {
      console.error("[store] Mongo seed failed, seeding memory:", (err as Error)?.message);
    }
  }
  mem.memReseed();
  return mem.memList().length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToEntry(doc: any): Entry {
  return {
    id: String(doc._id ?? doc.id),
    vehicleRegNo: doc.vehicleRegNo ?? "",
    companyName: doc.companyName ?? "",
    driverName: doc.driverName ?? "",
    psidNumber: doc.psidNumber ?? "",
    gdNumber: doc.gdNumber ?? "",
    itemDescription: doc.itemDescription ?? "",
    approvedQuantity: Number(doc.approvedQuantity ?? 0),
    receivedQuantity: Number(doc.receivedQuantity ?? 0),
    unit: doc.unit ?? "KG",
    customsPaid: doc.customsPaid ?? "UNPAID",
    customPaidProofUrl: doc.customPaidProofUrl ?? "",
    customPaidProofPublicId: doc.customPaidProofPublicId ?? "",
    customPaidProofResourceType: doc.customPaidProofResourceType ?? "",
    customPaidProofFormat: doc.customPaidProofFormat ?? "",
    remarks: doc.remarks ?? "",
    occurredAt: new Date(doc.occurredAt ?? doc.createdAt ?? Date.now()).toISOString(),
    createdAt: new Date(doc.createdAt ?? Date.now()).toISOString(),
  };
}
