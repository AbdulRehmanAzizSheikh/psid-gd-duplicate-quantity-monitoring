import mongoose, { Schema, model, models } from "mongoose";

// Mongoose schema for a vehicle entry under a PSID/GD.
const EntrySchema = new Schema(
  {
    vehicleRegNo: { type: String, required: true, trim: true, index: true },
    companyName: { type: String, default: "", trim: true },
    driverName: { type: String, default: "", trim: true },
    psidNumber: { type: String, default: "", trim: true, index: true },
    gdNumber: { type: String, default: "", trim: true, index: true },
    itemDescription: { type: String, default: "", trim: true },
    approvedQuantity: { type: Number, default: 0, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "KG", trim: true }, // A/U
    customsPaid: { type: String, enum: ["PAID", "UNPAID", "PARTIAL"], default: "UNPAID" },
    customPaidProofUrl: { type: String, default: "" }, // Cloudinary secure URL
    customPaidProofPublicId: { type: String, default: "" },
    customPaidProofResourceType: { type: String, default: "" },
    customPaidProofFormat: { type: String, default: "" },
    remarks: { type: String, default: "" },
    occurredAt: { type: Date, default: Date.now, index: true }, // automatic date & time
    source: { type: String, default: "web" }, // web | seed | api
  },
  { timestamps: true, collection: "entries" }
);

export type EntryDocument = mongoose.InferSchemaType<typeof EntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EntryModel = models.Entry || model("Entry", EntrySchema);
