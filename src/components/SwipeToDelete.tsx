"use client";

import { useRef, useState } from "react";

const REVEAL_WIDTH = 84;
const SWIPE_THRESHOLD = 8;

type DragInfo = { startX: number; startY: number; startOffset: number; swiping: boolean };

export function SwipeToDelete({
  onDelete,
  deleteLabel = "Remove",
  children,
}: {
  onDelete: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const drag = useRef<DragInfo | null>(null);
  const justClosed = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    // Without this, a fast or wide swipe that carries the pointer outside
    // this element's bounds stops delivering move/up events to it entirely,
    // leaving the row stuck mid-swipe.
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, startOffset: offset, swiping: false };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (!d.swiping) {
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
      d.swiping = true;
    }

    setOffset(Math.min(0, Math.max(-REVEAL_WIDTH, d.startOffset + dx)));
  }

  function handlePointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    if (d.swiping) {
      setOffset((current) => (current < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
      return;
    }

    // A plain tap, not a drag. If we were already revealed, treat the tap as
    // "close this" and swallow it, instead of letting it fall through to
    // whatever's underneath (e.g. a status button).
    if (offset !== 0) {
      setOffset(0);
      justClosed.current = true;
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (justClosed.current) {
      justClosed.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
        style={{ width: REVEAL_WIDTH }}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-sm font-medium text-white"
      >
        {deleteLabel}
      </button>
      <div
        className="relative select-none bg-surface transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
