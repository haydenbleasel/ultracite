import type { Provider } from "@repo/data/providers";
import { Logo } from "@repo/design-system/components/ultracite/logo";
import { XIcon } from "lucide-react";
import Image from "next/image";

import { Installer } from "@/components/installer";

interface ProviderHeroProps {
  provider: Provider;
}

export const ProviderHero = ({ provider }: ProviderHeroProps) => (
  <div className="grid gap-8">
    <div className="flex items-center gap-2">
      <Logo className="size-10" />
      <XIcon className="size-4 text-muted-foreground" />
      <Image
        alt={provider.name}
        className="size-10 rounded-full"
        height={40}
        src={provider.logo}
        width={40}
      />
      {provider.additionalLogos?.map((logo) => (
        <Image
          alt=""
          className="-ml-3 size-10 rounded-full ring-2 ring-background"
          height={40}
          key={logo.src}
          src={logo}
          width={40}
        />
      ))}
    </div>

    <div className="grid gap-4">
      <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
        {provider.subtitle}
      </h1>
      <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
        {provider.description}
      </p>
      <Installer
        className="max-w-md"
        command={`npx ultracite@latest init --linter ${provider.id}`}
      />
    </div>
  </div>
);
