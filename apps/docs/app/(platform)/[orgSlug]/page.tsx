import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getOrganizationBySlug } from "@/lib/auth";
import { database } from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

interface OrgPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

const OrgPage = async ({ params }: OrgPageProps) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const firstRepo = await database.repo.findFirst({
    where: {
      organizationId: organization.id,
      enabled: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (firstRepo) {
    redirect(`/${orgSlug}/${firstRepo.id}`);
  }

  // Layout handles empty states, this is a fallback
  return null;
};

export default OrgPage;
