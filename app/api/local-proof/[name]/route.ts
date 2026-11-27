import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Serves locally-stored proof files (demo fallback when Cloudinary isn't configured).
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    // prevent path traversal
    const safe = path.basename(name);
    const filePath = path.join(process.cwd(), "uploads-local", safe);
    const data = await fs.readFile(filePath);
    const ext = path.extname(safe).toLowerCase();
    const type =
      ext === ".png" ? "image/png"
      : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".gif" ? "image/gif"
      : ext === ".webp" ? "image/webp"
      : ext === ".svg" ? "image/svg+xml"
      : ext === ".pdf" ? "application/pdf"
      : "application/octet-stream";
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
