import { NextResponse, connection } from "next/server";
import { connectDb, isMongoAvailable, isMongoConfigured } from "@/lib/db";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { storageMode } from "@/lib/store";


// GET /api/health — report backend status for the demo UI.
export async function GET() {
  await connection(); // force request-time rendering (no prerendering)
  await connectDb();
  return NextResponse.json({
    ok: true,
    mongoConfigured: isMongoConfigured(),
    mongoAvailable: isMongoAvailable(),
    cloudinaryConfigured: isCloudinaryConfigured(),
    mode: await storageMode(),
  });
}
