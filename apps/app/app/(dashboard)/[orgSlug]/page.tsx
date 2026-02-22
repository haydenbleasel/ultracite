import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getOrganizationBySlug } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const OrgPage = async ({ params }: PageProps<"/[orgSlug]">) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const firstRepo = await convexClient.query(
    api.repos.getFirstByOrganizationId,
    { organizationId: organization._id }
  );

  if (firstRepo) {
    redirect(`/${orgSlug}/${firstRepo.name}`);
  }

  return null;
};

export default OrgPage;
