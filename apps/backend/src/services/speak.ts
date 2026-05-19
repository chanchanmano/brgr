// Text-to-speech via Microsoft Edge's built-in neural voices.
//
// Free, no API key. Uses the same WebSocket endpoint Edge's Read Aloud feature
// uses under the hood. Voices are Microsoft Azure Neural TTS quality.
//
// Voice options (good ones for Penny):
//   en-US-JennyNeural        — warm, conversational, American female  (default)
//   en-US-AriaNeural         — clear, professional
//   en-US-MichelleNeural     — friendly, slightly higher pitch
//   en-GB-SoniaNeural        — British, warm female
//   en-AU-NatashaNeural      — Australian, friendly
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICE = process.env.TTS_VOICE ?? "en-US-JennyNeural";
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const MAX_RETRIES = 2;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function attemptSynthesis(text: string): Promise<Buffer> {
  // Important: instantiate a fresh client per request. The WS connection is
  // stateful and stale sessions are the #1 cause of `msedge-tts` errors.
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, FORMAT);
  const { audioStream } = tts.toStream(text);
  const buffer = await streamToBuffer(audioStream);

  if (buffer.byteLength === 0) {
    throw new Error("TTS returned empty audio");
  }
  return buffer;
}

export async function synthesizeSpeech(text: string): Promise<{ buffer: Buffer; mimeType: string }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buffer = await attemptSynthesis(text);
      return { buffer, mimeType: "audio/mpeg" };
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[tts] attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${message}`);
      // small backoff before retrying — gives the WS a moment to settle
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("TTS failed after retries");
}

export function getTTSModel(): string {
  return `msedge-tts (${VOICE})`;
}
