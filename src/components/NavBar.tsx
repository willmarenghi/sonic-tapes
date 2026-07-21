"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NavBar() {
  const router = useRouter();
  const [label, setLabel] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setLabel((profile as { name: string } | null)?.name ?? user.email ?? "");
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-neutral-100">
          Sonic Tapes
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">{label}</span>
          <Link
            href="/upload"
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            New idea
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-neutral-400 hover:text-neutral-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
