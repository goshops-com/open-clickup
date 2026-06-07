// Minimal in-process pub/sub for Server-Sent Events (single-instance).
// For multi-instance deployments swap this for Redis pub/sub.

export type RealtimeEvent =
  | { type: "list"; listId: string }
  | { type: "bootstrap" };

type Listener = (event: RealtimeEvent) => void;

const g = globalThis as unknown as { __cuListeners?: Set<Listener> };
const listeners: Set<Listener> = g.__cuListeners ?? (g.__cuListeners = new Set());

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(event: RealtimeEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      /* ignore a dead listener */
    }
  }
}
