import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
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
      return NextResponse.redirect(
        new URL(`/${organizations[0].slug}`, request.url)
      );
    }
  } catch (error) {
    console.error("Failed to sync GitHub organizations:", error);
  }

  // Fallback: check if user has any orgs
  const firstOrg = await getFirstOrgForUser(userId);
  if (firstOrg) {
    return NextResponse.redirect(new URL(`/${firstOrg.slug}`, request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
};

async function getFirstOrgForUser(userId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  if (memberships.data.length === 0) {
    return null;
  }

  const clerkOrgId = memberships.data[0].organization.id;
  return convexClient.query(api.organizations.getByClerkOrgId, { clerkOrgId });
}
