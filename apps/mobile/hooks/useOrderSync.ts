import { useEffect } from "react";

import { fetchOrder } from "../lib/api";
import { useOrderStore } from "../store/orderStore";

const POLL_INTERVAL_MS = 3000;

/**
 * Keep the local placed-order in sync with the backend. Polls every 3s while
 * mounted. When the backend reports the order as fulfilled or no longer exists
 * (i.e. CLI `delete`d it), reflects that locally.
 *
 * Mount this on the tracking screen so the user sees real-time updates when
 * the kitchen marks the order done via `curl POST /api/orders/:id/fulfill`.
 */
export function useOrderSync() {
  const currentOrder = useOrderStore((state) => state.currentOrder);
  const setStatus = useOrderStore((state) => state.setStatus);
  const clearOrder = useOrderStore((state) => state.clearOrder);

  const orderId = currentOrder?.id ?? null;
  const localStatus = currentOrder?.status ?? null;

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function tick() {
      try {
        const remote = await fetchOrder(orderId!);
        if (cancelled) return;

        if (!remote) {
          // Backend doesn't know about this order — it was deleted via CLI,
          // or the backend restarted and lost in-memory state. Clear local
          // so the user can place a new one.
          clearOrder();
          return;
        }

        if (remote.status !== localStatus) {
          setStatus(remote.status);
        }
      } catch {
        // Network blip — silently retry on next tick
      }
    }

    // Fire immediately, then poll
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, localStatus, setStatus, clearOrder]);
}
