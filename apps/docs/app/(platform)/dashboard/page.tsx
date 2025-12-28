import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveOrganization, getCurrentUser } from "@/lib/auth";
import { database } from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const DashboardPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organization = await getActiveOrganization();

  if (!organization) {
    redirect("/onboarding");
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
    redirect(`/dashboard/${firstRepo.id}`);
  }

  // Layout handles empty states, this is a fallback
  return null;
};

export default DashboardPage;
