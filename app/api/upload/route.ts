import { NextRequest, NextResponse } from "next/server";
import { isCloudinaryConfigured, uploadProof } from "@/lib/cloudinary";


const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/upload (multipart/form-data, field name "file")
// Uploads custom-paid proof image/document to Cloudinary; returns a secure URL
// that the client saves on the entry in MongoDB. Falls back to local /uploads in demo mode.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided (field name must be 'file')" }, { status: 400 });
    }
    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }
    const buffer = Buffer.from(await f.arrayBuffer());
    const result = await uploadProof(buffer, f.name || "proof", f.type || "application/octet-stream");
    return NextResponse.json({ ...result, cloudinaryConfigured: isCloudinaryConfigured() }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: `Upload failed: ${(err as Error).message}` }, { status: 500 });
  }
}

// GET /api/upload — report upload backend status.
export async function GET() {
  return NextResponse.json({ cloudinaryConfigured: isCloudinaryConfigured(), provider: isCloudinaryConfigured() ? "cloudinary" : "local" });
}
