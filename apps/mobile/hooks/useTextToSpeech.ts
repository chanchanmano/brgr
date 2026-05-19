import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Platform } from "react-native";

const DEFAULT_BASE = Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";
const BASE = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;

type SpeakOptions = {
  /** Called when speech finishes naturally (not when stopped/interrupted). */
  onComplete?: () => void;
};

export type SpeakingStatus = "idle" | "preparing" | "speaking";

// No disk writes — we point the underlying audio player straight at the
// backend's /api/speak endpoint and let it stream the MP3 over HTTP.
// expo-audio uses ExoPlayer on Android and AVPlayer on iOS; both handle
// progressive HTTP streaming with built-in in-memory buffering.
export function useTextToSpeech() {
  const [source, setSource] = useState<{ uri: string } | null>(null);
  const [status, setStatus] = useState<SpeakingStatus>("idle");

  // Mirror state in a ref so stable callbacks can read it
  const statusRef = useRef<SpeakingStatus>("idle");
  statusRef.current = status;

  const player = useAudioPlayer(source ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  const playerRef = useRef(player);
  playerRef.current = player;

  // Token for in-flight requests so stale callbacks get dropped
  const tokenRef = useRef(0);
  const onCompleteRef = useRef<(() => void) | null>(null);

  // ── Auto-play once enough audio is buffered ────────────────────────────
  useEffect(() => {
    if (!source) return;
    if (statusRef.current !== "preparing") return;
    if (!playerStatus.isLoaded) return;

    setStatus("speaking");
    try {
      playerRef.current.seekTo(0);
      playerRef.current.play();
    } catch (err) {
      console.warn("[tts] play failed", err);
      setStatus("idle");
    }
  }, [source, playerStatus.isLoaded]);

  // ── End-of-playback → call onComplete, reset (releases the player buffer) ──
  useEffect(() => {
    if (!playerStatus.didJustFinish) return;
    if (statusRef.current !== "speaking") return;

    const cb = onCompleteRef.current;
    onCompleteRef.current = null;
    setStatus("idle");
    // Clearing source releases the underlying player + its buffered audio.
    setSource(null);
    cb?.();
  }, [playerStatus.didJustFinish]);

  // ── speak / stop — stable callbacks, mutable state via refs ────────────
  const stop = useCallback(() => {
    tokenRef.current++;
    onCompleteRef.current = null;
    try {
      const p = playerRef.current;
      if (p && p.playing) p.pause();
    } catch {
      // ignore
    }
    setStatus("idle");
    setSource(null);
  }, []);

  const speak = useCallback(async (text: string, opts: SpeakOptions = {}) => {
    const clean = text.trim();
    if (!clean) return;

    // Cancel anything in flight; new player gets created when source changes
    try {
      const p = playerRef.current;
      if (p && p.playing) p.pause();
    } catch {
      // ignore
    }

    const token = ++tokenRef.current;
    onCompleteRef.current = opts.onComplete ?? null;
    setStatus("preparing");

    // The token is appended as a query param to force a fresh player+buffer
    // (otherwise repeated same-text utterances could be deduped by the OS).
    const url = `${BASE}/api/speak?text=${encodeURIComponent(clean)}&t=${token}`;
    setSource({ uri: url });
  }, []);

  // Pause on unmount; clearing source releases the buffer
  useEffect(() => {
    return () => {
      try {
        const p = playerRef.current;
        if (p && p.playing) p.pause();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    status,
    speaking: status === "speaking",
    preparing: status === "preparing",
    active: status !== "idle",
    speak,
    stop
  };
}
