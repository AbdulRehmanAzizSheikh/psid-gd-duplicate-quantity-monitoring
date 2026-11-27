import { NextResponse } from "next/server";
import { removeEntry } from "@/lib/store";


// DELETE /api/entries/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await removeEntry(id);
    if (!ok) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
