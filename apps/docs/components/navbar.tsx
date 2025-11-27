import Link from "next/link";
import { Logo } from "@/app/(home)/components/logo";
import { SearchButton } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";

export const Navbar = () => (
  <div className="sticky top-0 z-50 w-full bg-background/90 py-3 backdrop-blur-sm">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link className="flex items-center gap-2" href="/">
          <Logo className="size-4" />
          <p className="font-semibold text-lg tracking-tight">Ultracite</p>
        </Link>
        <div className="flex items-center gap-4 font-medium text-sm">
          <Link className="text-muted-foreground hover:text-primary" href="/">
            Home
          </Link>
          <Link
            className="text-muted-foreground hover:text-primary"
            href="/introduction"
          >
            Docs
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchButton />
        <ThemeToggle />
      </div>
    </div>
  </div>
);
