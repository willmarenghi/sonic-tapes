"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_RECORDING_MS } from "@/lib/audioLimits";

const MIME_CANDIDATES = [
  "audio/mp4", // Safari/iOS
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mimeType: string | undefined) {
  if (!mimeType) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({
  onRecorded,
}: {
  onRecorded: (file: File | null) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "recording" | "stopping" | "recorded" | "unsupported"
  >(typeof window !== "undefined" && typeof MediaRecorder !== "undefined" ? "idle" : "unsupported");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType ?? recorder.mimeType });
        const file = new File([blob], `voice-memo-${Date.now()}.${extensionFor(mimeType)}`, {
          type: blob.type,
        });
        setPreviewUrl(URL.createObjectURL(blob));
        onRecorded(file);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus("recorded");
      };

      recorder.onerror = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setError("Recording failed unexpectedly. Please try again.");
        setStatus("idle");
        setElapsedMs(0);
      };

      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) {
          setError(`Stopped automatically at the ${formatElapsed(MAX_RECORDING_MS)} limit.`);
          stopRecording();
        }
      }, 250);
      setStatus("recording");
    } catch {
      setError("Couldn't access the microphone. Check your browser's permission settings.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("stopping");
    recorderRef.current?.stop();
  }

  function discardRecording() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onRecorded(null);
    setStatus("idle");
    setElapsedMs(0);
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted">
        Recording isn&apos;t supported in this browser — use the file upload instead.
      </p>
    );
  }

  if (status === "recorded" && previewUrl) {
    return (
      <div className="space-y-2">
        <audio controls src={previewUrl} className="h-10 w-full" />
        <button
          type="button"
          onClick={discardRecording}
          className="min-h-11 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-foreground"
        >
          Discard &amp; re-record
        </button>
        {error && <p className="text-sm text-muted">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {status === "recording" ? (
        <button
          type="button"
          onClick={stopRecording}
          className="flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          <span className="h-3 w-3 rounded-sm bg-white" />
          Stop ({formatElapsed(elapsedMs)})
        </button>
      ) : status === "stopping" ? (
        <button
          type="button"
          disabled
          className="flex min-h-11 items-center gap-2 rounded-md bg-red-600/60 px-4 py-2 text-sm font-medium text-white"
        >
          <span className="h-3 w-3 rounded-sm bg-white" />
          Stopping…
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="flex min-h-11 items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-foreground hover:border-accent"
        >
          <span className="h-3 w-3 rounded-full bg-red-500" />
          Record
        </button>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
