"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

// Module-level so every AudioPlayer instance on the page can see what's
// currently playing and pause it, without needing a shared context.
let currentlyPlaying: WaveSurfer | null = null;

// Matches --accent / --accent-foreground in globals.css. wavesurfer draws on
// a <canvas>, whose fillStyle can't resolve CSS custom properties, so the
// purple has to be hardcoded here rather than referenced via var(...).
const WAVE_COLOR = "rgba(184, 169, 230, 0.35)";
const PROGRESS_COLOR = "#b8a9e6";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 translate-x-[1px]" fill="currentColor" aria-hidden>
      <path d="M4 2.5v11l10-5.5-10-5.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="0.5" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="0.5" />
    </svg>
  );
}

export function AudioPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: WAVE_COLOR,
      progressColor: PROGRESS_COLOR,
      cursorColor: PROGRESS_COLOR,
      cursorWidth: 1,
      dragToSeek: true,
      height: 36,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url: src,
    });
    wavesurferRef.current = ws;

    const onReady = () => setDuration(ws.getDuration());
    const onTimeupdate = (time: number) => setCurrentTime(time);
    const onPlay = () => setPlaying(true);
    const onPauseOrFinish = () => setPlaying(false);

    ws.on("ready", onReady);
    ws.on("timeupdate", onTimeupdate);
    ws.on("play", onPlay);
    ws.on("pause", onPauseOrFinish);
    ws.on("finish", onPauseOrFinish);

    return () => {
      if (currentlyPlaying === ws) currentlyPlaying = null;
      ws.destroy();
    };
  }, [src]);

  function togglePlay() {
    const ws = wavesurferRef.current;
    if (!ws) return;
    if (!ws.isPlaying()) {
      if (currentlyPlaying && currentlyPlaying !== ws) {
        currentlyPlaying.pause();
      }
      currentlyPlaying = ws;
      ws.play();
    } else {
      ws.pause();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground transition hover:brightness-110"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-muted">
        {formatTime(currentTime)}
      </span>
      <div ref={containerRef} className="min-w-0 flex-1 cursor-pointer" />
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-muted">
        {formatTime(duration)}
      </span>
    </div>
  );
}
