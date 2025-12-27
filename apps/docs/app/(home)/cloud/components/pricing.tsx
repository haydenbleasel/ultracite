import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pricingItems = [
  {
    resource: "Monthly Fee",
    price: "$5/month",
    notes:
      "A flat fee to support ongoing platform development and maintenance.",
  },
  {
    resource: "Input tokens",
    price: "$1 / MTok",
    notes: "Claude 4.5 Haiku, at-cost pricing",
  },
  {
    resource: "Output tokens",
    price: "$5 / MTok",
    notes: "Claude 4.5 Haiku, at-cost pricing",
  },
  {
    resource: "Workflow runs",
    price: "$0.025 / run",
    notes: "Vercel Sandbox, estimated at-cost",
  },
];

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
        <Link href="/docs/cloud#pricing">Learn more</Link>
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
              className="flex items-center justify-between gap-4 text-sm"
              key={item.resource}
            >
              <span className="text-muted-foreground">{item.resource}</span>
              <span className="font-medium">{item.price}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
