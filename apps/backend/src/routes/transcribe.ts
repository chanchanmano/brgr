import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Router } from "express";
import multer from "multer";

import { transcribeAudioFile } from "../services/transcribe.js";

const router = Router();

// Store uploads in OS temp dir; multer adds a random filename.
const upload = multer({
  dest: tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB ceiling (Groq Whisper max)
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "audio file is required (field: audio)" });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    const transcript = await transcribeAudioFile(filePath, originalName);
    return res.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "transcription failed";
    return res.status(500).json({ error: message });
  } finally {
    // Clean up the temp file regardless of success/failure
    unlink(filePath).catch(() => {});
  }
});

export default router;
