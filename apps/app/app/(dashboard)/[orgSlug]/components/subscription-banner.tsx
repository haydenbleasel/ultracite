"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";

interface SubscriptionBannerProps {
  organizationId: string;
}

export const SubscriptionBanner = ({
  organizationId,
}: SubscriptionBannerProps) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        body: JSON.stringify({ organizationId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const { url } = (await response.json()) as { url: string };

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-primary px-4 py-2 text-primary-foreground">
      <div className="flex items-center gap-2 text-sm">
        <SparklesIcon className="size-4" />
        <span>
          Ultracite is inactive. Upgrade to enable automatic linting and PR
          reviews.
        </span>
      </div>
      <Button
        disabled={loading}
        onClick={handleUpgrade}
        size="sm"
        variant="secondary"
      >
        {loading ? "Loading..." : "Upgrade"}
      </Button>
    </div>
  );
};
