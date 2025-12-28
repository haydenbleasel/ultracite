import { database } from "@repo/backend";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getOrCreateDbUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const dbUser = await database.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? "",
    },
    update: {
      email: user.email ?? "",
    },
  });

  return dbUser;
}

/**
 * Get an organization by slug and verify the current user has access to it.
 * Returns null if the org doesn't exist or user is not a member.
 */
export async function getOrganizationBySlug(slug: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const membership = await database.organizationMember.findFirst({
    where: {
      userId: user.id,
      organization: {
        OR: [{ slug }, { githubOrgLogin: slug }],
      },
    },
    include: {
      organization: true,
    },
  });

  return membership?.organization ?? null;
}

/**
 * Get the first organization the user is a member of.
 * Used for redirecting after login/onboarding.
 */
export async function getFirstOrganization() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const firstMembership = await database.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return firstMembership?.organization ?? null;
}

export async function getUserOrganizations() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const memberships = await database.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => m.organization);
}
