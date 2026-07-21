"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Some mail clients (Gmail in particular) pre-fetch links in emails to scan
// them for phishing, which silently burns a single-use magic link before the
// user ever taps it — so we use a typed 6-digit code instead of a clickable
// link. A stale magic-link email from before this change could still land
// back here with the failure reason in the URL fragment; read it once up
// front instead of silently showing a blank form.
function readAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const raw = hashParams.get("error_description") || hashParams.get("error");
  return raw ? decodeURIComponent(raw.replace(/\+/g, " ")) : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(readAuthError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (window.location.hash.includes("error")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
  }, [router]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl lowercase text-foreground">sonic tapes</h1>

        {stage === "email" ? (
          <>
            <p className="mb-6 text-sm text-muted">Enter your email to get a sign-in code.</p>
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send sign-in code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              Enter the 6-digit code we sent to{" "}
              <span className="text-foreground">{email}</span>.
            </p>
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1 block text-sm text-muted">
                  Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-center text-lg tracking-[0.5em] text-foreground outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="min-h-11 w-full rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setError(null);
                }}
                className="min-h-11 w-full rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
