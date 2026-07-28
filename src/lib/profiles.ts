"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BandMember = { id: string; name: string };

export const AVATAR_COLORS = ["#d9714f", "#cdb37a", "#cfa8b0", "#a8c0a0", "#9aa6c9"];

// "Daniel Smith" -> "DS". Falls back to the first two letters for a
// single-word name.
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function useBandMembers(): BandMember[] {
  const [members, setMembers] = useState<BandMember[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, name")
      .order("created_at", { ascending: true })
      .then(({ data }) => setMembers((data as BandMember[]) ?? []));
  }, []);

  return members;
}
