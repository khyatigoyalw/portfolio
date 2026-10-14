"use server";

import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/media-url";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
