import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getActiveOrganization } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const DashboardPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getActiveOrganization();

  if (!organization) {
    return null;
  }

  const firstRepo = await convexClient.query(
    api.repos.getFirstByOrganizationId,
    { organizationId: organization._id }
  );

  if (firstRepo) {
    redirect(`/${firstRepo.name}`);
  }

  return null;
};

export default DashboardPage;
