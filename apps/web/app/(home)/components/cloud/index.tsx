import { Badge } from "@repo/design-system/components/ui/badge";
import { Logo } from "@repo/design-system/components/ultracite/logo";
import { Check, Smile } from "lucide-react";
import Image from "next/image";
import Background from "./background.jpg";

const GitHubComment = () => (
  <div className="dark font-sans text-foreground text-sm">
    {/* Line */}
    <div className="ml-4 h-32 w-0.5 bg-foreground/10 sm:ml-18" />

    <div className="flex w-full gap-4">
      {/* Avatar */}
      <div className="relative hidden shrink-0 sm:block">
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-foreground/5 backdrop-blur-sm">
          <Logo className="size-4" />
        </div>
      </div>

      {/* Comment body */}
      <div className="min-w-0 flex-1">
        {/* Comment header */}
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

        {/* Comment content */}
        <div className="rounded-b-md border bg-black/40 p-4 backdrop-blur-sm">
          <p className="mb-4">
            Ultracite found <strong>3 lint issues</strong> in this pull request
            and automatically fixed them.
          </p>

          {/* Expandable section */}
          <details className="mb-4">
            <summary className="cursor-pointer">3 Issues Fixed</summary>
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

          {/* Emoji reaction */}
          <div className="flex items-center gap-2 border-t pt-3">
            <button
              className="flex size-7 items-center justify-center rounded-full border text-[#656d76] dark:text-[#9198a1]"
              type="button"
            >
              <Smile className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Line */}
    <div className="ml-4 h-32 w-0.5 bg-foreground/10 sm:ml-18" />
  </div>
);

export const Cloud = () => (
  <div className="grid gap-8">
    <Badge
      className="mx-auto h-auto border-primary bg-transparent px-3 py-0.5 text-primary text-sm"
      variant="outline"
    >
      Ultracite Cloud
    </Badge>
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Automated lint fixes, powered by AI
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite Cloud monitors your repositories and pull requests,
        automatically fixing lint issues and creating PRs. When auto-fix isn't
        enough, AI steps in to resolve the trickier problems.
      </p>
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
