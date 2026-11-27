import { Entry } from "./types";
import { buildSeedEntries } from "./seed";

// In-memory fallback store (used when MongoDB is not configured/unavailable).
// Survives hot-reloads in `next dev` via globalThis; resets on server restart.

interface MemoryState {
  entries: Entry[];
  nextId: number;
  seeded: boolean;
}

const GLOBAL_KEY = "__psid_gd_memory_store__";

function state(): MemoryState {
  const g = globalThis as unknown as Record<string, MemoryState | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { entries: [], nextId: 1, seeded: false };
  }
  return g[GLOBAL_KEY]!;
}

export function memEnsureSeeded(): void {
  const s = state();
  if (!s.seeded) {
    s.entries = buildSeedEntries(s.nextId);
    s.nextId += s.entries.length;
    s.seeded = true;
  }
}

export function memList(): Entry[] {
  memEnsureSeeded();
  return state().entries.map((e) => ({ ...e }));
}

export function memAdd(entry: Omit<Entry, "id">): Entry {
  memEnsureSeeded();
  const s = state();
  const full: Entry = { ...entry, id: `mem-${s.nextId++}` };
  s.entries.push(full);
  return { ...full };
}

export function memRemove(id: string): boolean {
  const s = state();
  const before = s.entries.length;
  s.entries = s.entries.filter((e) => e.id !== id);
  return s.entries.length < before;
}

export function memReseed(): Entry[] {
  const s = state();
  s.entries = buildSeedEntries(1);
  s.nextId = s.entries.length + 1;
  s.seeded = true;
  return s.entries.map((e) => ({ ...e }));
}

export function memClear(): void {
  const s = state();
  s.entries = [];
  s.seeded = true;
}
