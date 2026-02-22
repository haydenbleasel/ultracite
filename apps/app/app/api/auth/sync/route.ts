import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/referral/constants";
import { syncGitHubOrganizations } from "@/lib/github/sync-orgs";

export const GET = async (request: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const clerk = await clerkClient();

  // Get GitHub OAuth token from Clerk
  const oauthTokens = await clerk.users.getUserOauthAccessToken(
    userId,
    "github"
  );

  const providerToken = oauthTokens.data[0]?.token;

  if (!providerToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Get referral code from cookie
  const cookieStore = await cookies();
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value;

  try {
    const { organizations } = await syncGitHubOrganizations(
      providerToken,
      userId,
      referralCode
    );

    // Clear referral cookie after use
    if (referralCode) {
      cookieStore.delete(REFERRAL_COOKIE);
    }

    if (organizations.length > 0) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (error) {
    console.error("Failed to sync GitHub organizations:", error);
  }

  return NextResponse.redirect(new URL("/", request.url));
};
