import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { hasSupabase } from "@portfolio/core/media-url";
import { createClient } from "@portfolio/core/supabase/server";

/** Only ever redirect to a path on this site (blocks open redirects via ?next=). */
const safeNext = (next: string | null) => (next && /^\/(?!\/)/.test(next) ? next : "/");

/** Magic-link landing: exchanges the PKCE `code` (or a `token_hash`) for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = (msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  if (!hasSupabase) return fail("Supabase is not configured.");

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("That sign-in link is invalid or expired. Request a new one.");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail("That sign-in link is invalid or expired. Request a new one.");
  } else {
    return fail(searchParams.get("error_description") ?? "Missing sign-in code.");
  }
  return NextResponse.redirect(`${origin}${next}`);
}
