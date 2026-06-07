import { subscribe } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Server-Sent Events stream. Clients (EventSource) receive realtime change
// events and invalidate their query cache so collaborators see updates live.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* stream closed */
        }
      };
      send(": connected\n\n");
      unsubscribe = subscribe((event) => send(`data: ${JSON.stringify(event)}\n\n`));
      heartbeat = setInterval(() => send(": hb\n\n"), 25000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
