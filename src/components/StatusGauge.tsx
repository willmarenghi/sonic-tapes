"use client";

import { STATUSES, statusInfo, type CoverStatus } from "@/lib/coverSongs";

export function StatusGauge({
  status,
  onChange,
}: {
  status: CoverStatus;
  onChange?: (status: CoverStatus) => void;
}) {
  const current = statusInfo(status);
  return (
    <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
      <span className="text-xs lowercase text-muted md:w-20 md:shrink-0">{current.label}</span>
      <div className="relative h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-line">
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
