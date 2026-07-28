"use client";

import { useRef } from "react";
import { STATUSES, statusInfo, type CoverStatus } from "@/lib/coverSongs";

export function StatusGauge({
  status,
  onChange,
}: {
  status: CoverStatus;
  onChange?: (status: CoverStatus) => void;
}) {
  const current = statusInfo(status);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  function statusAtX(clientX: number): CoverStatus | null {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const index = Math.min(STATUSES.length - 1, Math.floor(ratio * STATUSES.length));
    return STATUSES[index].value;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onChange) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = statusAtX(e.clientX);
    if (next) onChange(next);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !onChange) return;
    const next = statusAtX(e.clientX);
    if (next) onChange(next);
  }

  function handlePointerUp() {
    draggingRef.current = false;
  }

  return (
    <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
      <span className="text-xs lowercase text-muted md:w-20 md:shrink-0">{current.label}</span>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-line ${
          onChange ? "touch-none cursor-pointer" : ""
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${current.fill}%`, background: current.color }}
        />
        {onChange && (
          <div className="absolute inset-0 flex">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-label={s.label}
                onClick={() => onChange(s.value)}
                className="flex-1 border-r border-background last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
