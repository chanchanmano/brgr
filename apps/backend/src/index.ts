import "dotenv/config";

import cors from "cors";
import express from "express";

import orderRouter from "./routes/order.js";
import ordersRouter from "./routes/orders.js";
import speakRouter from "./routes/speak.js";
import transcribeRouter from "./routes/transcribe.js";
import { getGroqModel } from "./services/penny.js";
import { getTTSModel } from "./services/speak.js";
import { getTranscribeModel } from "./services/transcribe.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  const ok = Boolean(process.env.GROQ_API_KEY);
  return res.status(ok ? 200 : 500).json({
    status: ok ? "ok" : "error",
    llm: getGroqModel(),
    stt: getTranscribeModel(),
    tts: getTTSModel()
  });
});

app.use("/api", orderRouter);
app.use("/api", ordersRouter);
app.use("/api", transcribeRouter);
app.use("/api", speakRouter);

app.listen(port, () => {
  console.log(`Intelligent Bistro backend listening on http://localhost:${port}`);
});
