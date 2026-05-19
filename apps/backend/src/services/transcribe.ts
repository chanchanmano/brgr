import { createReadStream } from "node:fs";
import OpenAI, { toFile } from "openai";

const MODEL = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";

function getClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });
}

export async function transcribeAudioFile(
  filePath: string,
  originalName?: string
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("GROQ_API_KEY not set");
  }

  // Multer writes uploads with a random name (no extension). Groq's Whisper
  // endpoint sniffs the filename to determine format, so we explicitly hand
  // it a filename with a known extension via toFile().
  const filename = originalName && /\.[a-z0-9]+$/i.test(originalName)
    ? originalName
    : "recording.m4a";

  const file = await toFile(createReadStream(filePath), filename);

  const result = await client.audio.transcriptions.create({
    file,
    model: MODEL,
    response_format: "json"
  });

  return (result.text ?? "").trim();
}

export function getTranscribeModel(): string {
  return MODEL;
}
