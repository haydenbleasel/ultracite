import { CheckIcon, InfoIcon, MinusIcon } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const features = [
  {
    label: "ESLint + Prettier + Stylelint",
    description: "The traditional JavaScript toolchain.",
    avatar: (
      <div className="-space-x-1 flex items-center">
        <Image
          alt="ESLint"
          className="size-6 rounded-full ring-1 ring-background"
          height={24}
          src="https://github.com/eslint.png"
          width={24}
        />
        <Image
          alt="Prettier"
          className="size-6 rounded-full ring-1 ring-background"
          height={24}
          src="https://github.com/prettier.png"
          width={24}
        />
        <Image
          alt="Stylelint"
          className="size-6 rounded-full ring-1 ring-background"
          height={24}
          src="https://github.com/stylelint.png"
          width={24}
        />
      </div>
    ),
    items: [
      {
        text: "Thousands of available rules",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "ESLint has a massive ecosystem of rules and plugins.",
      },
      {
        text: "Hundreds of lines of config",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "This toolchain is unopinionated, so you need to configure every rule and setting.",
      },
      {
        text: "10+ dependencies",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "Typically you need to install eslint, prettier, stylelint, and their respective plugins.",
      },
      {
        text: "4+ config files",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "For example, you might have eslint.config.js, prettier.config.js, stylelint.config.js and .prettierignore.",
      },
      {
        text: "Slow performance",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "ESLint is built in JavaScript and can struggle with large codebases.",
      },
      {
        text: "Setup in minutes",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "ESLint is a complex toolchain that requires a lot of configuration.",
      },
    ],
  },
  {
    label: "Ultracite",
    description: "Zero-config Biome preset with AI integration.",
    avatar: <Logo className="size-6" />,
    items: [
      {
        text: "Hundreds of available rules",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "Biome comes with hundreds of rules you can enable and configure.",
      },
      {
        text: "2 lines of config",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "You only need to extend the Ultracite preset.",
      },
      {
        text: "2 dependencies",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "You only need to install Biome and Ultracite.",
      },
      {
        text: "1 config file",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "You only need to create a biome.jsonc file.",
      },
      {
        text: "Lightning fast performance",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite uses Biome, which is built in Rust and is lightning fast.",
      },
      {
        text: "Agent Rules",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes with rules for agents like Claude, Copilot, Codex and more out of the box.",
      },
      {
        text: "Editor Configuration",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes with configuration for editors like VS Code, Cursor and Zed out of the box.",
      },
      {
        text: "Third-party integrations",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes with configuration for third-party integrations like Husky, Lefthook and Lint-Staged out of the box.",
      },
      {
        text: "MCP Server",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes a MCP server that can be used to expose Ultracite rules to AI assistants during code generation.",
      },
      {
        text: "Setup in seconds",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "You can setup and configure Ultracite in seconds with the `init` command.",
      },
      {
        text: "Framework presets",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes with framework presets for React, Next.js, Solid, Vue, Svelte, Qwik, Angular, Remix and more out of the box.",
      },
    ],
  },
  {
    label: "Biome",
    description: "Fast Rust-based formatter and linter.",
    avatar: (
      <Image
        alt="Biome"
        className="size-6 rounded-full ring-1 ring-background"
        height={24}
        src="https://github.com/biomejs.png"
        width={24}
      />
    ),
    items: [
      {
        text: "Hundreds of available rules",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "Biome comes with hundreds of rules you can enable and configure.",
      },
      {
        text: "Hundreds of lines of config",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "Biome is unopinionated, so you need to configure every rule and setting.",
      },
      {
        text: "1 dependency",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "You need to install Biome.",
      },
      {
        text: "1 config file",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "You need to create a biome.jsonc file.",
      },
      {
        text: "Lightning fast performance",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption: "Biome is built in Rust and is lightning fast.",
      },
      {
        text: "Setup in minutes",
        icon: MinusIcon,
        color: "text-muted-foreground",
        caption:
          "You can setup Biome with the `init` command, but you need to configure it yourself.",
      },
    ],
  },
];

export const Comparison = () => (
  <section className="grid gap-12">
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="text-balance font-medium font-serif text-3xl sm:text-4xl md:text-5xl">
        Why choose Ultracite?
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Ultracite is specifically designed to be easy to setup and use. Here's
        how it compares to other toolchains.
      </p>
    </div>

    <div className="-space-x-px isolate mx-auto flex w-full flex-col items-center gap-4 lg:flex-row lg:gap-0">
      {features.map((feature, index) => (
        <Card
          className={cn(
            "z-10 flex-1 rounded-xl border p-12 shadow-xl",
            "lg:last:rounded-l-none lg:first:rounded-r-none",
            index === 1 && "z-20 border-emerald-500"
          )}
          key={feature.label}
        >
          <CardHeader className="p-0">
            {feature.avatar}
            <CardTitle className="mt-4 font-medium text-lg tracking-tight">
              {feature.label}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {feature.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-0">
            <div className="flex flex-col gap-3">
              {feature.items.map((item) => (
                <div className="flex items-center gap-3" key={item.text}>
                  <item.icon className={cn("size-5 shrink-0", item.color)} />
                  <div className="flex flex-1 items-center gap-4">
                    <span className="flex-1 font-medium text-sm">
                      {item.text}
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="size-6 shrink-0 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent>{item.caption}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);
