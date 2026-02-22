import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationBySlug } from "@/lib/auth";
import { getReferralCode } from "@/lib/referral/get-referral-code";
import { getReferralStats } from "@/lib/referral/get-referral-stats";
import { ReferralDashboard } from "./components/referral-dashboard";

export const metadata: Metadata = {
  title: "Referrals",
  description: "Manage your referral program and earn credits.",
};

const ReferralsPage = async ({
  params,
}: PageProps<"/[orgSlug]/settings/referrals">) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const [referralCode, stats] = await Promise.all([
    getReferralCode(organization._id),
    getReferralStats(organization._id, organization.stripeCustomerId ?? null),
  ]);

  return (
    <div className="container relative mx-auto grid w-full gap-8 px-4 py-8 2xl:max-w-4xl">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Referrals</h1>
        <p className="text-muted-foreground">
          Earn $5 credit for each organization you refer. Your referral gets $5
          too.
        </p>
      </div>
      <ReferralDashboard referralCode={referralCode} stats={stats} />
    </div>
  );
};

export default ReferralsPage;
