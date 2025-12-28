'use server';

import { database } from '@/lib/database';
import { getCurrentUser, getOrCreateDbUser } from '@/lib/auth';

interface CreateOrganizationInput {
  name: string;
  slug: string;
}

interface CreateOrganizationResult {
  error?: string;
  slug?: string;
}

export async function createOrganization({
  name,
  slug,
}: CreateOrganizationInput): Promise<CreateOrganizationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'You must be logged in to create an organization.' };
  }

  // Ensure user exists in database
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) {
    return { error: 'Failed to create user record.' };
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      error:
        'Slug must contain only lowercase letters, numbers, and hyphens.',
    };
  }

  // Check if slug is already taken
  const existingOrg = await database.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    return { error: 'This URL slug is already taken. Please choose another.' };
  }

  // Create organization and add user as owner
  const organization = await database.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  return { slug: organization.slug };
}
