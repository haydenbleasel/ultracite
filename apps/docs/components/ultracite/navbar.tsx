import Link from "next/link";
import { Logo } from "@/app/(home)/components/logo";
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
];

export const Navbar = () => (
  <div className="sticky top-0 z-50 flex items-center justify-between bg-background py-4">
    <Link className="flex items-center gap-2" href="/">
      <Logo className="size-4" />
      <span className="font-semibold text-lg tracking-tight">Ultracite</span>
    </Link>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-px">
        {links.map((link) => (
          <Button
            key={link.href}
            nativeButton={false}
            render={
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            }
            variant="ghost"
          />
        ))}
      </div>
      <Button
        nativeButton={false}
        render={<Link href="/sign-in">Sign in</Link>}
      />
    </div>
  </div>
);
