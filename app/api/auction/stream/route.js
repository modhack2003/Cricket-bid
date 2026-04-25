import { getAuctionState, getTeams } from "@/lib/auction";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastHash = null;
      let closed = false;

      const safeClose = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };

      const send = async (force = false) => {
        if (closed) return;
        try {
          const [state, teams] = await Promise.all([getAuctionState(), getTeams()]);

          const changeKey = JSON.stringify({
            status: state.status,
            currentBid: state.currentBid,
            currentBidder: state.currentBidder,
            currentPlayerId: state.currentPlayer?.id ?? null,
            historyLen: state.bidHistory?.length ?? 0,
            spends: Object.values(teams).map((t) => t.spent),
          });

          if (force || changeKey !== lastHash) {
            lastHash = changeKey;
            if (!closed) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ state, teams, ts: Date.now() })}\n\n`));
            }
          }
        } catch {
          // Only attempt to write the error event if the stream is still open
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream error" })}\n\n`));
            } catch {}
          }
        }
      };

      // Send immediately (forced, so the client gets initial state)
      await send(true);

      // Then poll every 1.5 seconds, but only push when state changes
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          await send();
        } catch {
          clearInterval(interval);
          safeClose();
        }
      }, 1500);

      // Auto-close after 5 minutes (client reconnects via exponential backoff)
      setTimeout(() => {
        clearInterval(interval);
        safeClose();
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
