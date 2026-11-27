import { NextResponse, connection } from "next/server";
import { connectDb, isMongoAvailable, isMongoConfigured } from "@/lib/db";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

// GET /api/health — honest backend status. ok=false if MongoDB isn't reachable.
export async function GET() {
  await connection(); // force request-time rendering (no prerendering)

  let connected = false;
  let error: string | null = null;
  try {
    await connectDb();
    connected = true;
  } catch (e) {
    error = (e as Error).message;
  }

  return NextResponse.json({
    ok: connected,
    mongoConfigured: isMongoConfigured(),
    mongoAvailable: connected && isMongoAvailable(),
    cloudinaryConfigured: isCloudinaryConfigured(),
    mode: "mongodb",
    error,
  });
}
