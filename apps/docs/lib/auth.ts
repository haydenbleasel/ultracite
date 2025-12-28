import { cookies } from 'next/headers';
import { database } from '@/lib/database';
import { createClient } from '@/lib/supabase/server';

const ACTIVE_ORG_COOKIE = 'ultracite_active_org';

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
      email: user.email ?? '',
    },
    update: {
      email: user.email ?? '',
    },
  });

  return dbUser;
}

export async function getActiveOrganization() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  // If we have an active org cookie, verify the user is a member
  if (activeOrgId) {
    const membership = await database.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: activeOrgId,
      },
      include: {
        organization: true,
      },
    });

    if (membership) {
      return membership.organization;
    }
  }

  // Otherwise, get the first organization the user is a member of
  const firstMembership = await database.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
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
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => m.organization);
}

export async function setActiveOrganization(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
