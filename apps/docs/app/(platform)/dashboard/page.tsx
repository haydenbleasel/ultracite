import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { database } from "@/lib/database";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const DashboardPage = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login");
  }
  const orgId = "";

  if (!orgId) {
    redirect("/login");
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
