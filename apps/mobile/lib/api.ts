import type { CartLine, OrderAction, PennyIntent, PlacedOrder } from "../types/order";
import { Platform } from "react-native";

const DEFAULT_BASE = Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";
const BASE = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
const NETWORK_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 45000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type HistoryEntry = { role: "user" | "penny"; text: string };
export type CartEffect = "add_now" | "needs_resolution" | "already_in_cart" | "no_cart_change";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || err instanceof TypeError || /network request failed/i.test(err.message);
}

async function fetchWithRetry(
  path: string,
  init?: RequestInit,
  options: { retryStatuses?: boolean } = {}
): Promise<Response> {
  const url = `${BASE}${path}`;

  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...init, signal: init?.signal ?? controller.signal });
      if (
        options.retryStatuses &&
        RETRYABLE_STATUSES.has(res.status) &&
        attempt < NETWORK_RETRIES
      ) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      if (!isRetryableFetchError(err) || attempt === NETWORK_RETRIES) break;
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  const hint = Platform.OS === "android" && !process.env.EXPO_PUBLIC_API_URL
    ? "Android is using http://10.0.2.2:3001 by default. If this is a physical device, set EXPO_PUBLIC_API_URL to your Mac's LAN IP."
    : `Using API base ${BASE}.`;
  throw new Error(`Backend network request failed. ${hint}`);
}

export async function parseOrder(
  message: string,
  cartSnapshot: CartLine[],
  sessionId: string,
  history: HistoryEntry[] = []
): Promise<{ reply: string; actions: OrderAction[]; intent?: PennyIntent; cartEffect?: CartEffect }> {
  const res = await fetchWithRetry("/api/parse-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, cartSnapshot, sessionId, history })
  }, { retryStatuses: true });

  if (!res.ok) throw new Error(`parseOrder failed (${res.status})`);
  return res.json();
}

export async function transcribeAudio(uri: string, mime = "audio/m4a"): Promise<string> {
  const form = new FormData();
  // RN FormData accepts a {uri, name, type} blob descriptor for file uploads.
  form.append("audio", {
    uri,
    name: "recording.m4a",
    type: mime
  } as unknown as Blob);

  const res = await fetchWithRetry("/api/transcribe", {
    method: "POST",
    body: form
    // Do NOT set Content-Type manually — RN sets the multipart boundary itself.
  }, { retryStatuses: true });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`transcribe failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}

// ── Orders (placed-order lifecycle, polled by tracking screen) ───────────

export async function createOrder(order: PlacedOrder): Promise<PlacedOrder> {
  const res = await fetchWithRetry("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  }, { retryStatuses: true });
  if (!res.ok) throw new Error(`createOrder failed (${res.status})`);
  return (await res.json()) as PlacedOrder;
}

export async function fetchOrder(id: string): Promise<PlacedOrder | null> {
  const res = await fetchWithRetry(`/api/orders/${encodeURIComponent(id)}`, undefined, { retryStatuses: true });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchOrder failed (${res.status})`);
  return (await res.json()) as PlacedOrder;
}
