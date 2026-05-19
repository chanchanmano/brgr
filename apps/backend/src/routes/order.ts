import { Router } from "express";

import { parseOrderWithPenny, type HistoryEntry } from "../services/penny.js";
import type { CartSnapshotLine } from "../types/order.js";

const router = Router();

router.post("/parse-order", async (req, res) => {
  const { message, cartSnapshot, sessionId, history } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!Array.isArray(cartSnapshot)) {
    return res.status(400).json({ error: "cartSnapshot must be an array" });
  }

  const normalizedSnapshot = cartSnapshot.filter(
    (line: CartSnapshotLine) =>
      line &&
      typeof line.itemId === "string" &&
      typeof line.qty === "number" &&
      Number.isFinite(line.qty)
  );

  const normalizedHistory: HistoryEntry[] = Array.isArray(history)
    ? history
        .filter(
          (entry): entry is HistoryEntry =>
            entry &&
            (entry.role === "user" || entry.role === "penny") &&
            typeof entry.text === "string" &&
            entry.text.trim().length > 0
        )
        .map((entry) => ({ role: entry.role, text: entry.text.trim() }))
    : [];

  const result = await parseOrderWithPenny(
    message.trim(),
    normalizedSnapshot,
    typeof sessionId === "string" && sessionId ? sessionId : "guest",
    normalizedHistory
  );

  return res.json(result);
});

export default router;
