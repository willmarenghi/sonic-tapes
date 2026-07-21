"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { UploadForm } from "@/components/UploadForm";

function UploadFormWithParams() {
  const searchParams = useSearchParams();
  return <UploadForm defaultReplyTo={searchParams.get("replyTo") ?? undefined} />;
}

export default function UploadPage() {
  return (
    <RequireAuth>
      <AppShell>
        <h1 className="mb-6 font-display text-2xl lowercase text-foreground">
          new song idea
        </h1>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <UploadFormWithParams />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
