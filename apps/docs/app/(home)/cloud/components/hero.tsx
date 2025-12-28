import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Background from "../../components/cloud/background.jpg";
import { Logo } from "../../components/logo";

const GitHubComment = () => (
  <div className="dark font-sans text-foreground text-sm">
    <div className="ml-4 h-16 w-0.5 bg-foreground/10 sm:ml-18" />

    <div className="flex w-full gap-4">
      <div className="relative hidden shrink-0 sm:block">
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-foreground/5 backdrop-blur-sm">
          <Logo className="size-4" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 rounded-t-md border border-b-0 bg-foreground/5 px-4 py-2 backdrop-blur-sm">
          <span className="font-semibold">ultracite</span>
          <span className="rounded-full border px-1.5 py-px text-xs">bot</span>
          <span className="hidden text-foreground/50 sm:block">
            commented just now
          </span>
          <Badge className="ml-auto hidden sm:block" variant="outline">
            Contributor
          </Badge>
        </div>

        <div className="rounded-b-md border bg-black/40 p-4 backdrop-blur-sm">
          <p className="mb-4">
            I've automatically fixed lint issues in this PR.
          </p>

          <details className="mb-4" open>
            <summary className="cursor-pointer font-medium">
              3 Issues Fixed
            </summary>
            <div className="mt-2 space-y-1 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <Check className="size-3 text-green-600" />
                <code className="rounded px-1">src/components/Button.tsx</code>
                <span>— Missing semicolon</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Check className="size-3 text-green-600" />
                <code className="rounded px-1">src/utils/format.ts</code>
                <span>— Prefer const over let</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Check className="size-3 text-green-600" />
                <code className="rounded px-1">src/hooks/useAuth.ts</code>
                <span>— Unused import removed</span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div className="ml-4 h-16 w-0.5 bg-foreground/10 sm:ml-18" />
  </div>
);

export const Hero = () => (
  <div className="grid gap-8 sm:gap-12">
    <div className="grid gap-4">
      <h1 className="mb-0 max-w-2xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
        Automated linting and AI-powered fixes for your repos
      </h1>
      <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
        Connect your repos once, and Ultracite will keep your code clean without
        any manual intervention.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/auth/login">Get Started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/docs/cloud">Read the Docs</Link>
        </Button>
      </div>
    </div>

    <div className="dark relative isolate overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl">
      <Image
        alt=""
        className="absolute top-0 left-0 size-full object-cover object-top"
        height={1000}
        src={Background}
        width={1000}
      />
      <div className="relative px-6 sm:px-8 md:px-12">
        <GitHubComment />
      </div>
    </div>
  </div>
);
