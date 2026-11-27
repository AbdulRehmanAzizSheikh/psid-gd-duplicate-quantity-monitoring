import mongoose from "mongoose";

// MongoDB connection — REAL database only. Nothing runs locally / no in-memory fallback.
// MONGODB_URI is required. Connection failures surface as errors (no silent fallback).

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

let cached: Promise<typeof mongoose> | null = null;
let mongoAvailable = false;

export function isMongoConfigured(): boolean {
  return Boolean(MONGODB_URI);
}

export function isMongoAvailable(): boolean {
  return mongoAvailable;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured. MongoDB is required; no local/in-memory fallback is used.");
  }
  if (mongoose.connection.readyState === 1) {
    mongoAvailable = true;
    return mongoose;
  }
  if (!cached) {
    cached = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000, bufferCommands: false })
      .then((m) => { mongoAvailable = true; return m; })
      .catch((err) => {
        mongoAvailable = false;
        cached = null; // allow retry on next request
        throw err;
      });
  }
  try {
    return await cached;
  } catch (err) {
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
  }
}
