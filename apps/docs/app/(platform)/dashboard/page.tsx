import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { database } from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const DashboardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const firstRepo = await database.repo.findFirst({
    where: {
      organizationId: orgId,
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
