import type { Editor } from "@repo/data/editors";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardPasteIcon,
  CodeIcon,
  SaveIcon,
  SettingsIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";

interface BenefitsProps {
  editor: Editor;
}

const benefits: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Format on save",
    description:
      "Automatically formats your code when you save, keeping it clean and consistent.",
    icon: SaveIcon,
  },
  {
    title: "Default formatter",
    description:
      "Sets up the correct formatter extension for each file type based on your linter choice.",
    icon: CodeIcon,
  },
  {
    title: "Auto-fix on save",
    description:
      "Enables code actions on save to automatically fix linting issues and organize imports.",
    icon: WrenchIcon,
  },
  {
    title: "TypeScript SDK",
    description:
      "Configures the workspace TypeScript version for consistent type checking.",
    icon: SettingsIcon,
  },
  {
    title: "Extension installation",
    description:
      "Automatically installs the required linter extension when creating a new configuration.",
    icon: SparklesIcon,
  },
  {
    title: "Format on paste",
    description:
      "Formats pasted code to match your project's style automatically.",
    icon: ClipboardPasteIcon,
  },
];

export const Benefits = ({ editor }: BenefitsProps) => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        What Ultracite configures for {editor.name}
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite sets up {editor.name} with optimal settings for your chosen
        linter.
      </p>
    </div>
    <div className="grid divide-x divide-y border-t border-l sm:grid-cols-2 lg:grid-cols-3">
      {benefits.map((benefit) => (
        <div className="p-6 last:border-r last:border-b" key={benefit.title}>
          <benefit.icon className="mb-3 size-5 text-muted-foreground" />
          <h3 className="mb-2 font-medium">{benefit.title}</h3>
          <p className="text-pretty text-muted-foreground text-sm">
            {benefit.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
