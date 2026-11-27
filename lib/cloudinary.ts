import { v2 as cloudinary } from "cloudinary";

// Cloudinary upload — REAL storage only. Nothing is stored locally.
// Requires CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
// (or CLOUDINARY_URL=cloudinary://key:secret@cloud_name). If not configured,
// uploads throw a clear error instead of silently storing locally.

// Treat unset AND obvious template placeholders as "not configured".
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
  url: string; // Cloudinary secure_url
  provider: "cloudinary";
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
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (or CLOUDINARY_URL). No local storage fallback is used."
    );
  }

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
