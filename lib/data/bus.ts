import type { RealtimeTable } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Tiny pub/sub bus. Adapters emit table-change events after          */
/*  realtime payloads arrive or local mutations happen; hooks          */
/*  subscribe and refetch. This is what makes the UI feel live.        */
/* ------------------------------------------------------------------ */

type Listener = (table: RealtimeTable) => void;

const listeners = new Set<Listener>();

export function emitChange(table: RealtimeTable): void {
  listeners.forEach((fn) => {
    try {
      fn(table);
    } catch {
      /* listener errors must never break the emitter */
    }
  });
}

export function onChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
