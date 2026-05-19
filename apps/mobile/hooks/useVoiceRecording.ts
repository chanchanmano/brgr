import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";

import { transcribeAudio } from "../lib/api";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "thinking" | "done" | "error";

type Options = {
  /** Called with the transcript after STT; should return Penny's reply. */
  onTranscript?: (transcript: string) => Promise<string>;
  /** dB threshold below which audio is considered silence. Default −45. */
  silenceThresholdDb?: number;
  /** Milliseconds of continuous silence that trigger auto-stop. Default 1500. */
  silenceTimeoutMs?: number;
  /** Don't auto-stop before this many ms have elapsed. Default 800. */
  minRecordingMs?: number;
  /** Hard cap on recording length. Default 15000. */
  maxRecordingMs?: number;
};

// Recording preset with metering enabled so we can read audio level.
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true
};

function formatVoiceError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/network request failed|backend network request failed|connection|abort|timed out/i.test(message)) {
    return "Penny lost backend connection. Tap Try again.";
  }
  return message || fallback;
}

export function useVoiceRecording(opts: Options = {}) {
  const {
    onTranscript,
    // -40 dB is roughly "no speech" — speech usually sits at -10 to -25 dB.
    silenceThresholdDb = -40,
    silenceTimeoutMs = 1200,
    minRecordingMs = 600,
    maxRecordingMs = 15000
  } = opts;

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  // Poll the recorder state every 100ms to get the live metering value.
  const state = useAudioRecorderState(recorder, 100);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const silenceStartedAt = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const startingRef = useRef(false);
  // Bumped each time a new attempt starts (or cancel is called). Async work
  // checks this token before mutating state so stale in-flight responses get
  // ignored instead of overwriting the current state.
  const attemptTokenRef = useRef(0);

  // Configure audio mode once
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch(() => {});
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    const token = attemptTokenRef.current;

    try {
      await recorder.stop();
      const uri = recorder.uri;
      const heldFor = startedAt.current ? Date.now() - startedAt.current : 0;

      if (attemptTokenRef.current !== token) return; // cancelled while stopping
      if (!uri || heldFor < 350) {
        setStatus("idle");
        return;
      }

      setStatus("transcribing");
      const text = await transcribeAudio(uri);
      if (attemptTokenRef.current !== token) return; // user bailed mid-transcribe
      setTranscript(text);

      if (!text.trim()) {
        // Empty transcript — likely background noise.
        setStatus("idle");
        return;
      }

      if (onTranscript) {
        setStatus("thinking");
        try {
          const r = await onTranscript(text);
          if (attemptTokenRef.current !== token) return; // user bailed mid-LLM
          setReply(r);
          setStatus("done");
        } catch (err) {
          if (attemptTokenRef.current !== token) return;
          setError(formatVoiceError(err, "Penny's having trouble responding"));
          setStatus("error");
        }
      } else {
        setStatus("done");
      }
    } catch (err) {
      if (attemptTokenRef.current !== token) return;
      setError(formatVoiceError(err, "Transcription failed"));
      setStatus("error");
    } finally {
      startedAt.current = null;
      silenceStartedAt.current = null;
      stoppingRef.current = false;
    }
  }, [onTranscript, recorder]);

  // Silence / max-duration watcher
  useEffect(() => {
    if (status !== "recording") return;

    const duration = state.durationMillis ?? 0;
    const metering = state.metering;

    // Max duration hit — force stop
    if (duration >= maxRecordingMs) {
      stopAndTranscribe();
      return;
    }

    // Wait for the minimum window before honoring silence
    if (duration < minRecordingMs) {
      silenceStartedAt.current = null;
      return;
    }

    if (typeof metering !== "number") return;

    if (metering < silenceThresholdDb) {
      // Silent frame — start the timer if not already running
      if (silenceStartedAt.current === null) {
        silenceStartedAt.current = Date.now();
      } else if (Date.now() - silenceStartedAt.current >= silenceTimeoutMs) {
        stopAndTranscribe();
      }
    } else {
      // Voice detected again — reset the silence timer
      silenceStartedAt.current = null;
    }
  }, [
    status,
    state.durationMillis,
    state.metering,
    minRecordingMs,
    maxRecordingMs,
    silenceTimeoutMs,
    silenceThresholdDb,
    stopAndTranscribe
  ]);

  async function start() {
    if (startingRef.current) return;
    if (stoppingRef.current) return;
    startingRef.current = true;
    attemptTokenRef.current++; // any in-flight stuff from a previous turn is now stale
    setError(null);
    setTranscript(null);
    setReply(null);
    silenceStartedAt.current = null;

    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Mic permission denied. Enable it in system settings.");
        setStatus("error");
        return;
      }

      const recorderStatus = recorder.getStatus();
      if (recorderStatus.isRecording) {
        await recorder.stop();
      }

      const nextRecorderStatus = recorder.getStatus();
      if (!nextRecorderStatus.canRecord) {
        await recorder.prepareToRecordAsync();
      }
      recorder.record();
      startedAt.current = Date.now();
      setStatus("recording");
    } catch (err) {
      setError(formatVoiceError(err, "Couldn't start recording"));
      setStatus("error");
    } finally {
      startingRef.current = false;
    }
  }

  async function cancel() {
    // Invalidate any in-flight transcribe/LLM work — when those promises
    // resolve, the token check will discard the result instead of setting state.
    attemptTokenRef.current++;
    stoppingRef.current = true;
    try {
      const recorderStatus = recorder.getStatus();
      if (recorderStatus.canRecord || recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // ignore
    }
    startedAt.current = null;
    silenceStartedAt.current = null;
    stoppingRef.current = false;
    setTranscript(null);
    setReply(null);
    setError(null);
    setStatus("idle");
  }

  function reset() {
    setStatus("idle");
    setTranscript(null);
    setReply(null);
    setError(null);
    silenceStartedAt.current = null;
  }

  // Release the native recorder on unmount
  useEffect(() => {
    return () => {
      try {
        if (recorder.isRecording) recorder.stop();
      } catch {
        // ignore
      }
    };
  }, [recorder]);

  void AudioModule;

  return {
    status,
    transcript,
    reply,
    error,
    metering: state.metering,
    durationMs: state.durationMillis ?? 0,
    start,
    stopAndTranscribe,
    cancel,
    reset
  };
}
