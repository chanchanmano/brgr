import { Router } from "express";

import { synthesizeSpeech } from "../services/speak.js";

const router = Router();

async function handle(text: string, res: import("express").Response) {
  const clean = text.trim();
  if (!clean) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const { buffer, mimeType } = await synthesizeSpeech(clean);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", String(buffer.byteLength));
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "speech synthesis failed";
    console.error(`[speak] failed for "${clean.slice(0, 60)}...":`, message);
    return res.status(500).json({ error: message });
  }
}

// GET is convenient for mobile clients that use FileSystem.downloadAsync (GET only).
router.get("/speak", (req, res) => handle(String(req.query.text ?? ""), res));
router.post("/speak", (req, res) => handle(String(req.body?.text ?? ""), res));

export default router;
