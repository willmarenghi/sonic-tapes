"use client";

import { useEffect, useRef, useState } from "react";

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 8;

// Registry of every mounted row's "close" callback, so starting a swipe on
// one row can snap any other currently-open row shut — only the most
// recently swiped row stays revealed.
type CloseHandle = () => void;
const openRows = new Set<CloseHandle>();

function closeOtherRows(exceptSelf: CloseHandle) {
  for (const close of openRows) {
    if (close !== exceptSelf) close();
  }
}

type DragInfo = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  swiping: boolean;
};

export type SwipeAction = {
  label: string;
  onClick: () => void;
  className?: string;
};

export function SwipeActions({
  actions,
  children,
}: {
  actions: SwipeAction[];
  children: React.ReactNode;
}) {
  const revealWidth = ACTION_WIDTH * actions.length;
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const drag = useRef<DragInfo | null>(null);
  const justClosed = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const closeSelf = useRef<CloseHandle>(() => setOffset(0)).current;
  useEffect(() => {
    openRows.add(closeSelf);
    return () => {
      openRows.delete(closeSelf);
    };
  }, [closeSelf]);

  function handlePointerDown(e: React.PointerEvent) {
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offset,
      swiping: false,
    };
    setIsDragging(true);
  }

  // Track the drag via window listeners rather than pointer capture. Capture
  // retargets pointerup to the capturing element, which silently kills click
  // events on nested buttons (e.g. the setlist toggle) with mouse input —
  // touch synthesizes clicks through a different path that isn't affected,
  // which is why this only broke on desktop. Window listeners avoid that
  // retargeting entirely while still reliably tracking the pointer even if
  // it moves outside this row's bounds mid-swipe.
  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.swiping) {
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
        d.swiping = true;
        closeOtherRows(closeSelf);
      }

      setOffset(Math.min(0, Math.max(-revealWidth, d.startOffset + dx)));
    }

    function handlePointerUp(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      setIsDragging(false);

      if (d.swiping) {
        setOffset((current) => (current < -revealWidth / 2 ? -revealWidth : 0));
        return;
      }

      // A plain tap, not a drag. If we were already revealed, treat the tap
      // as "close this" and swallow it, instead of letting it fall through
      // to whatever's underneath (e.g. a status button).
      if (offsetRef.current !== 0) {
        setOffset(0);
        justClosed.current = true;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClickCapture(e: React.MouseEvent) {
    if (justClosed.current) {
      justClosed.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              setOffset(0);
              action.onClick();
            }}
            style={{ width: ACTION_WIDTH }}
            className={`flex h-full min-h-0 items-center justify-center text-sm font-medium lowercase ${action.className ?? "bg-red-500 text-white"}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="relative select-none bg-surface transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
