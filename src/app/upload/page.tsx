"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { NavBar } from "@/components/NavBar";
import { UploadForm } from "@/components/UploadForm";

function UploadFormWithParams() {
  const searchParams = useSearchParams();
  return <UploadForm defaultReplyTo={searchParams.get("replyTo") ?? undefined} />;
}

export default function UploadPage() {
  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-xl font-semibold text-neutral-100">
          Post a song idea or reply
        </h1>
        <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
          <UploadFormWithParams />
        </Suspense>
      </main>
    </RequireAuth>
  );
}
