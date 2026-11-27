import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "fs";
import path from "path";

// Cloudinary upload with graceful fallback.
// If CLOUDINARY_* env vars are not set, proof files are saved to uploads-local/
// and served as local URLs (demo mode) so the app still works out of the box.

// Treat unset AND obvious template placeholders as "not configured" so a
// half-filled .env can never silently break uploads — local fallback kicks in.
function clean(v: string | undefined): string {
  const s = (v || "").trim();
  if (!s) return "";
  if (/your_|example|xxxxx|changeme|placeholder|<.*>/i.test(s)) return "";
  return s;
}

let CLOUD_NAME = clean(process.env.CLOUDINARY_CLOUD_NAME);
let API_KEY = clean(process.env.CLOUDINARY_API_KEY);
let API_SECRET = clean(process.env.CLOUDINARY_API_SECRET);

// Support the CLOUDINARY_URL format shown in the Cloudinary dashboard:
//   cloudinary://<api_key>:<api_secret>@<cloud_name>
const CLOUDINARY_URL = clean(process.env.CLOUDINARY_URL);
if (CLOUDINARY_URL) {
  try {
    const u = new URL(CLOUDINARY_URL);
    CLOUD_NAME = CLOUD_NAME || u.host;
    API_KEY = API_KEY || decodeURIComponent(u.username);
    API_SECRET = API_SECRET || decodeURIComponent(u.password);
  } catch { /* malformed CLOUDINARY_URL — ignore */ }
}

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

export interface UploadResult {
  url: string; // secure URL (Cloudinary secure_url, or local /uploads/... fallback)
  provider: "cloudinary" | "local";
  publicId: string;
  resourceType: string;
  format: string;
  originalName: string;
}

export async function uploadProof(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  if (isCloudinaryConfigured()) {
    const resourceType = mimeType.startsWith("image/")
      ? "image"
      : mimeType === "application/pdf"
        ? "raw"
        : "auto";
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: process.env.CLOUDINARY_FOLDER || "psid-gd-proofs",
            resource_type: resourceType as "image" | "raw" | "auto",
            use_filename: true,
            unique_filename: true,
          },
          (error, res) => (error ? reject(error) : resolve((res ?? {}) as Record<string, unknown>))
        )
        .end(buffer);
    });
    return {
      url: String(result.secure_url ?? result.url ?? ""),
      provider: "cloudinary",
      publicId: String(result.public_id ?? ""),
      resourceType: String(result.resource_type ?? resourceType),
      format: String(result.format ?? ""),
      originalName,
    };
  }

  // ---- local fallback (demo mode) ----
  const safeBase = (originalName || "proof").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
  const uploadsDir = path.join(process.cwd(), "uploads-local");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), buffer);
  return {
    url: `/api/local-proof/${fileName}`,
    provider: "local",
    publicId: `local/${fileName}`,
    resourceType: mimeType.startsWith("image/") ? "image" : "raw",
    format: path.extname(originalName).replace(".", ""),
    originalName,
  };
}
