import { getAuctionState, getTeams } from "@/lib/auction";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Track last sent payload to skip sending when nothing changed
      let lastHash = null;

      const send = async (force = false) => {
        try {
          const [state, teams] = await Promise.all([getAuctionState(), getTeams()]);

          // Build a lightweight hash: status + currentBid + bidHistory length + team spends
          const changeKey = JSON.stringify({
            status: state.status,
            currentBid: state.currentBid,
            currentBidder: state.currentBidder,
            currentPlayerId: state.currentPlayer?.id ?? null,
            historyLen: state.bidHistory?.length ?? 0,
            spends: Object.values(teams).map((t) => t.spent),
          });

          // Only serialize and enqueue the full payload when something changed
          if (force || changeKey !== lastHash) {
            lastHash = changeKey;
            const data = JSON.stringify({ state, teams, ts: Date.now() });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream error" })}\n\n`));
        }
      };

      // Send immediately (forced, so the client gets initial state)
      await send(true);

      // Then poll every 1.5 seconds, but only push when state changes
      const interval = setInterval(async () => {
        try {
          await send();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 1500);

      // Auto-close after 5 minutes (client reconnects via exponential backoff)
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

