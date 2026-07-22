"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

function HubTile({
  href,
  label,
  borderColor,
  color,
  background,
}: {
  href: string;
  label: string;
  borderColor: string;
  color: string;
  background: string;
}) {
  return (
    <Link
      href={href}
      className="flex aspect-square w-full items-center justify-center rounded-md border-2 px-3 text-center text-sm font-medium lowercase transition hover:brightness-110"
      style={{ borderColor, color, background }}
    >
      {label}
    </Link>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <AppShell>
        <div className="flex flex-col items-center pt-6 text-center">
          <h1 className="font-display text-2xl lowercase text-foreground">
            where do you want to get started?
          </h1>

          <Link
            href="/upload"
            className="mt-8 flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-accent px-4 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110"
          >
            + new idea
          </Link>

          <div className="mt-6 flex w-full max-w-xs flex-col items-center gap-4">
            <div className="w-[calc(50%-0.5rem)]">
              <HubTile
                href="/library"
                label="idea library"
                borderColor="#5c8fd6"
                color="#a7c2ec"
                background="rgba(92, 143, 214, 0.08)"
              />
            </div>

            <div className="grid w-full grid-cols-2 gap-4">
              <HubTile
                href="/covers"
                label="cover songs"
                borderColor="#6fbf73"
                color="#a8d6ad"
                background="rgba(111, 191, 115, 0.08)"
              />
              <HubTile
                href="/shows"
                label="shows / setlists"
                borderColor="#e15c4f"
                color="#f0a098"
                background="rgba(225, 92, 79, 0.08)"
              />
            </div>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
