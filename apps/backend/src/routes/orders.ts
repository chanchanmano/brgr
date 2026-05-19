import { Router } from "express";

import { deleteOrder, fulfillOrder, getOrder, listOrders, saveOrder } from "../services/orders.js";
import type { PlacedOrder } from "../types/order.js";

const router = Router();

// POST /api/orders — record a newly-placed order
router.post("/orders", (req, res) => {
  const order = req.body as PlacedOrder | undefined;
  if (!order || typeof order.id !== "string" || !Array.isArray(order.lines)) {
    return res.status(400).json({ error: "valid order required" });
  }

  // Normalize the status — the client always submits as "placed"
  const stored = saveOrder({ ...order, status: "placed" });
  console.log(`[orders] placed #${stored.id} (${stored.lines.length} lines · $${stored.total.toFixed(2)})`);
  return res.status(201).json(stored);
});

// GET /api/orders — list all (debugging / CLI)
router.get("/orders", (_req, res) => {
  return res.json({ orders: listOrders() });
});

// GET /api/orders/:id — fetch a single order
router.get("/orders/:id", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  return res.json(order);
});

// POST /api/orders/:id/fulfill — mark an order as fulfilled (CLI use)
router.post("/orders/:id/fulfill", (req, res) => {
  const order = fulfillOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  console.log(`[orders] fulfilled #${order.id}`);
  return res.json(order);
});

// DELETE /api/orders/:id — wipe an order entirely (CLI use)
router.delete("/orders/:id", (req, res) => {
  const removed = deleteOrder(req.params.id);
  if (!removed) return res.status(404).json({ error: "order not found" });
  console.log(`[orders] deleted #${req.params.id}`);
  return res.status(204).end();
});

export default router;
