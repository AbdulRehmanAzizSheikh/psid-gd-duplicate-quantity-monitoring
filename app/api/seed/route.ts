import { NextResponse } from "next/server";
import { reseed, storageMode } from "@/lib/store";


// POST /api/seed — (re)seed the database with sample data. GET for convenience in the demo.
async function handle() {
  try {
    const count = await reseed();
    return NextResponse.json({ seeded: count, mode: await storageMode() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST() {
  return handle();
}
export async function GET() {
  return handle();
}
