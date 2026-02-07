import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { syncGitHubOrganizations } from "@/lib/github/sync-orgs";
import { REFERRAL_COOKIE } from "@/lib/referral/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (!code) {
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  // Sync GitHub organizations using the provider token
  const providerToken = data.session?.provider_token;
  const userId = data.session?.user?.id;
  const userEmail = data.session?.user?.email ?? "";

  if (providerToken && userId) {
    try {
      // Get referral code from cookie
      const cookieStore = await cookies();
      const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value;

      const { organizations } = await syncGitHubOrganizations(
        providerToken,
        userId,
        userEmail,
        referralCode
      );

      // Clear referral cookie after use
      if (referralCode) {
        cookieStore.delete(REFERRAL_COOKIE);
      }

      // Redirect to first organization if available
      if (organizations.length > 0 && next === "/") {
        next = `/${organizations[0].slug}`;
      }
    } catch (syncError) {
      // Log error but don't fail the auth flow
      console.error("Failed to sync GitHub organizations:", syncError);
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
