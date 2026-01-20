"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DollarSignIcon,
  GiftIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralStats {
  creditBalanceCents: number;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnedCents: number;
  referralsGiven: {
    id: string;
    referredName: string;
    status: "PENDING" | "COMPLETED" | "INVALID";
    creditedAt: string | null;
    createdAt: string;
  }[];
  referralReceived: {
    referrerName: string;
    status: "PENDING" | "COMPLETED" | "INVALID";
    creditedAt: string | null;
    createdAt: string;
  } | null;
}

interface ReferralCode {
  code: string;
  url: string;
  timesUsed: number;
}

interface ReferralDashboardProps {
  organizationId: string;
}

export const ReferralDashboard = ({
  organizationId,
}: ReferralDashboardProps) => {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [codeRes, statsRes] = await Promise.all([
          fetch(`/api/referral/code?organizationId=${organizationId}`),
          fetch(`/api/referral/stats?organizationId=${organizationId}`),
        ]);

        if (codeRes.ok) {
          setReferralCode(await codeRes.json());
        }
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  const handleCopy = async () => {
    if (!referralCode) {
      return;
    }

    await navigator.clipboard.writeText(referralCode.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: "PENDING" | "COMPLETED" | "INVALID") => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default">
            <CheckCircleIcon className="mr-1 size-3" />
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <ClockIcon className="mr-1 size-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="destructive">Invalid</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GiftIcon className="size-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link to earn $5 credit for both you and your referral
            when they subscribe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
              {referralCode?.url ?? "Loading..."}
            </code>
            <Button onClick={handleCopy} variant="outline">
              <CopyIcon className="mr-2 size-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Credit Balance</CardTitle>
            <DollarSignIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {formatCurrency(stats?.creditBalanceCents ?? 0)}
            </p>
            <p className="text-muted-foreground text-xs">
              Applied to future invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Referrals</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{stats?.totalReferrals ?? 0}</p>
            <p className="text-muted-foreground text-xs">
              {stats?.completedReferrals ?? 0} completed,{" "}
              {stats?.pendingReferrals ?? 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Earned</CardTitle>
            <GiftIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {formatCurrency(stats?.totalEarnedCents ?? 0)}
            </p>
            <p className="text-muted-foreground text-xs">From referral bonuses</p>
          </CardContent>
        </Card>
      </div>

      {stats?.referralReceived && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">You Were Referred</CardTitle>
            <CardDescription>
              You were referred by {stats.referralReceived.referrerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getStatusBadge(stats.referralReceived.status)}
              <span className="text-muted-foreground text-sm">
                {stats.referralReceived.status === "COMPLETED"
                  ? "You received $5 credit"
                  : "Credit applied after first payment"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.referralsGiven && stats.referralsGiven.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referral History</CardTitle>
            <CardDescription>
              Organizations you have referred to Ultracite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referred On</TableHead>
                  <TableHead>Credited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.referralsGiven.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">
                      {referral.referredName}
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(referral.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {referral.creditedAt
                        ? formatDate(referral.creditedAt)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
