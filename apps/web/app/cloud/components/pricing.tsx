import { docsUrl } from "@repo/data/src/consts";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import Link from "next/link";

const pricingItems = [
  {
    notes:
      "A flat fee to support ongoing platform development and maintenance.",
    price: "$5/month",
    resource: "Monthly Fee",
  },
  {
    notes: "Claude 4.5 Haiku, at-cost pricing",
    price: "$1 / MTok",
    resource: "Input tokens",
  },
  {
    notes: "Claude 4.5 Haiku, at-cost pricing",
    price: "$5 / MTok",
    resource: "Output tokens",
  },
  {
    notes: "Vercel Sandbox, estimated at-cost",
    price: "$0.025 / run",
    resource: "Workflow runs",
  },
];

const pricingUrl = new URL("/cloud#pricing", docsUrl);

export const Pricing = () => (
  <div className="grid items-center gap-8 md:grid-cols-2">
    <div className="grid gap-4">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Simple, transparent pricing
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        We aim to keep costs as low as possible while covering the
        infrastructure needed to run the service.
      </p>
      <Button asChild className="w-fit" variant="secondary">
        <Link href={pricingUrl.toString()}>Learn more</Link>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
        <CardDescription>A flat monthly fee and at-cost usage.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pricingItems.map((item) => (
            <div
              className="flex items-center gap-2 text-sm"
              key={item.resource}
            >
              <span className="text-muted-foreground">{item.resource}</span>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>{item.notes}</TooltipContent>
              </Tooltip>
              <span className="ml-auto font-medium">{item.price}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
