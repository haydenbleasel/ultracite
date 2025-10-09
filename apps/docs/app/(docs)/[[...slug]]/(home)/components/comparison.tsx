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
    avatar: (
      <svg
        fill="none"
        height={24}
        viewBox="0 0 117 118"
        width={24}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Ultracite</title>
        <g fill="currentColor">
          <path d="m73.4415 3.08447-11.5112-3.08447-9.7007 36.2036-8.7579-32.68485-11.5116 3.08447 9.4625 35.31358-23.5687-23.5686-8.42691 8.4269 25.85191 25.8521-32.19444-8.6265-3.08446 11.5112 35.1764 9.4256c-.4027-1.7371-.6158-3.5471-.6158-5.4068 0-13.1637 10.6713-23.8349 23.835-23.8349s23.8349 10.6712 23.8349 23.8349c0 1.8477-.2104 3.6466-.6082 5.3734l31.9687 8.566 3.084-11.5113-35.3158-9.463 32.1968-8.6271-3.085-11.5112-35.3147 9.4624 23.5686-23.5684-8.4269-8.42693-25.4933 25.49343z" />
          <path d="m81.5886 65.0381c-.9869 4.1725-3.0705 7.9209-5.9294 10.9241l23.16 23.1603 8.4268-8.4269z" />
          <path d="m75.4254 76.2044c-2.8935 2.9552-6.55 5.1606-10.6505 6.297l8.4275 31.4516 11.5113-3.084z" />
          <path d="m64.345 82.6165c-1.9025.4891-3.8965.749-5.9514.749-2.2016 0-4.3335-.2985-6.3574-.8573l-8.4351 31.4808 11.5112 3.084z" />
          <path d="m51.6292 82.3922c-4.0379-1.193-7.6294-3.4264-10.4637-6.3902l-23.217 23.2171 8.4269 8.4269z" />
          <path d="m40.9741 75.7968c-2.7857-2.9824-4.8149-6.6808-5.7807-10.7889l-32.07328 8.5941 3.08444 11.5112z" />
        </g>
      </svg>
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
        text: "AI Rules",
        icon: CheckIcon,
        color: "text-emerald-500",
        caption:
          "Ultracite comes with AI rules for Claude, Copilot, Codex and more out of the box.",
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
      <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        Why choose Ultracite?
      </h2>
      <p className="text-balance text-lg text-muted-foreground sm:text-xl">
        Ultracite is specifically designed to be easy to setup and use. Here's
        how it compares to other toolchains.
      </p>
    </div>

    <div className="-space-x-px isolate mx-auto flex w-full flex-col items-center gap-4 md:flex-row md:gap-0">
      {features.map((feature, index) => (
        <Card
          className={cn(
            "z-10 flex-1 rounded-xl border p-12 shadow-xl first:rounded-r-none last:rounded-l-none",
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
