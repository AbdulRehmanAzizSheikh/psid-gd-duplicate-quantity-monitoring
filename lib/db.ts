import mongoose from "mongoose";

// MongoDB connection with graceful fallback:
// If MONGODB_URI is not configured (or connection fails), the app keeps working
// in "memory mode" with seed/sample data — nothing breaks during local testing.

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

let cached: Promise<typeof mongoose> | null = null;
let mongoAvailable = false;

export function isMongoConfigured(): boolean {
  return Boolean(MONGODB_URI);
}

export function isMongoAvailable(): boolean {
  return mongoAvailable;
}

export async function connectDb(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return null;
  if (mongoose.connection.readyState === 1) {
    mongoAvailable = true;
    return mongoose;
  }
  if (!cached) {
    cached = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      })
      .then((m) => {
        mongoAvailable = true;
        return m;
      })
      .catch((err) => {
        console.error("[db] MongoDB connection failed, falling back to memory mode:", err?.message ?? err);
        mongoAvailable = false;
        cached = null; // allow retry on next request
        throw err;
      });
  }
  try {
    return await cached;
  } catch {
    return null;
  }
}
