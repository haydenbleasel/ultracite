import { Logo } from "@/app/(home)/components/logo";
import Link from "next/link";
import { Button } from "../ui/button";

const links = [
  {
    href: "/docs",
    label: "Docs",
  },
  {
    href: "/social",
    label: "Social",
  },
]

export const Navbar = () => (
  <div className="flex items-center justify-between py-4 sticky top-0 z-50 bg-background">
    <Link href="/" className="flex items-center gap-2">
      <Logo className="size-4" />
      <span className="font-semibold text-lg tracking-tight">Ultracite</span>
    </Link>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-px">
        {links.map((link) => (
          <Button nativeButton={false} key={link.href} variant="ghost" render={
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          } />
        ))}
        </div>
      <Button nativeButton={false} render={
        <Link href="/sign-in">
          Sign in
        </Link>
      } />
    </div>
  </div>
);