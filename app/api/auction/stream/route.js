import { getAuctionState, getTeams } from "@/lib/auction";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const [state, teams] = await Promise.all([getAuctionState(), getTeams()]);
          const data = JSON.stringify({ state, teams, ts: Date.now() });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream error" })}\n\n`));
        }
      };

      // Send immediately
      await send();

      // Then every 1.5 seconds
      const interval = setInterval(async () => {
        try {
          await send();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 1500);

      // Auto-close after 5 minutes (client reconnects)
      setTimeout(() => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
