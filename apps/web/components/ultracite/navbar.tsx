import { docsUrl } from "@repo/data/consts";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { Logo } from "./logo";

export const Navbar = () => (
  <div className="sticky top-0 z-50 border-b bg-background">
    <div className="container relative mx-auto flex items-center justify-between px-4 py-3 2xl:max-w-7xl">
      <Link className="flex items-center gap-2" href="/">
        <Logo className="size-5" />
        <span className="font-semibold text-lg tracking-tight">Ultracite</span>
      </Link>
      <Button asChild variant="ghost">
        <Link href={docsUrl}>Docs</Link>
      </Button>
    </div>
  </div>
);
