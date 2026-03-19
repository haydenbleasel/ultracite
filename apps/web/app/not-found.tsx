import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Not Found",
};

const NotFound = () => (
  <div className="grid gap-4 py-32 text-center">
    <h1 className="font-semibold text-4xl tracking-tighter">404</h1>
    <p className="text-muted-foreground text-lg">
      The page you&apos;re looking for doesn&apos;t exist.
    </p>
    <div>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
