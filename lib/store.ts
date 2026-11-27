import { connectDb, isMongoAvailable } from "./db";
import { EntryModel } from "./models/Entry";
import { Entry, EntryInput } from "./types";

// Data-access layer — MongoDB only. No local/in-memory storage.

export async function storageMode(): Promise<"mongodb"> {
  await connectDb();
  return "mongodb";
}

export async function listEntries(): Promise<Entry[]> {
  await connectDb();
  const docs = await EntryModel.find({}).sort({ occurredAt: 1 }).lean();
  return docs.map(docToEntry);
}

export async function addEntry(input: EntryInput): Promise<Entry> {
  await connectDb();
  const now = new Date().toISOString();
  const record = {
    ...input,
    customPaidProofUrl: input.customPaidProofUrl ?? "",
    occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : now,
  };
  const doc = await EntryModel.create(record);
  return docToEntry(doc.toObject());
}

export async function removeEntry(id: string): Promise<boolean> {
  await connectDb();
  const res = await EntryModel.findByIdAndDelete(id);
  return Boolean(res);
}

export async function reseed(): Promise<number> {
  await connectDb();
  const { buildSeedEntries } = await import("./seed");
  await EntryModel.deleteMany({});
  const seeds = buildSeedEntries().map((e) => {
    const { id, ...rest } = e;
    return { ...rest, occurredAt: new Date(e.occurredAt), createdAt: new Date(e.createdAt) };
  });
  await EntryModel.insertMany(seeds);
  return seeds.length;
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

export { isMongoAvailable };
