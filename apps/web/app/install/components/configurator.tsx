"use client";

import { track } from "@vercel/analytics";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COPY_TIMEOUT = 2000;

export interface LinterOption {
  description: string;
  id: string;
  logo: StaticImageData;
  name: string;
}

export interface FrameworkOption {
  id: string;
  name: string;
}

export interface EditorOption {
  configPath: string;
  id: string;
  logo: StaticImageData;
  name: string;
}

export interface AgentTarget {
  agentNames: string[];
  configPath: string;
  id: string;
  logo: StaticImageData | null;
  name: string;
}

export interface HookOption {
  id: string;
  name: string;
}

export interface IntegrationOption {
  id: string;
  name: string;
}

interface ConfiguratorProps {
  agentTargets: AgentTarget[];
  editors: EditorOption[];
  frameworks: FrameworkOption[];
  hooks: HookOption[];
  integrations: IntegrationOption[];
  linters: LinterOption[];
}

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const packageManagers: { id: PackageManager; name: string }[] = [
  { id: "npm", name: "npm" },
  { id: "pnpm", name: "pnpm" },
  { id: "yarn", name: "yarn" },
  { id: "bun", name: "bun" },
];

const dlxPrefix: Record<PackageManager, string> = {
  bun: "bunx",
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
};

const buildCommand = (
  packageManager: PackageManager,
  flags: string[]
): string => {
  const prefix = dlxPrefix[packageManager];
  const args = ["ultracite@latest", "init", ...flags];
  return `${prefix} ${args.join(" ")}`;
};

const useToggle = <T extends string>(initial: T[] = []) => {
  const [values, setValues] = useState<T[]>(initial);
  const toggle = useCallback((value: T) => {
    setValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }, []);
  return [values, toggle, setValues] as const;
};

interface LogoTitleProps {
  logo?: StaticImageData | null;
  name: string;
}

const LogoTitle = ({ logo, name }: LogoTitleProps) => (
  <FieldTitle>
    {logo ? (
      <Image
        alt=""
        className="size-5 shrink-0 rounded-sm"
        height={20}
        src={logo}
        width={20}
      />
    ) : null}
    {name}
  </FieldTitle>
);

interface CheckboxChoiceProps {
  checked: boolean;
  description?: string;
  id: string;
  logo?: StaticImageData | null;
  name: string;
  onCheckedChange: () => void;
}

const CheckboxChoice = ({
  checked,
  description,
  id,
  logo,
  name,
  onCheckedChange,
}: CheckboxChoiceProps) => (
  <FieldLabel htmlFor={id}>
    <Field orientation="horizontal">
      <FieldContent>
        <LogoTitle logo={logo} name={name} />
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <Checkbox checked={checked} id={id} onCheckedChange={onCheckedChange} />
    </Field>
  </FieldLabel>
);

export const Configurator = ({
  agentTargets,
  editors,
  frameworks,
  hooks,
  integrations,
  linters,
}: ConfiguratorProps) => {
  const [packageManager, setPackageManager] = useState<PackageManager>("npm");
  const [linter, setLinter] = useState<string>(linters[0]?.id ?? "biome");
  const [selectedFrameworks, toggleFramework] = useToggle<string>();
  const [selectedEditors, toggleEditor] = useToggle<string>();
  const [selectedAgents, toggleAgent] = useToggle<string>();
  const [selectedHooks, toggleHook] = useToggle<string>();
  const [selectedIntegrations, toggleIntegration] = useToggle<string>();
  const [typeAware, setTypeAware] = useState(false);
  const [installSkill, setInstallSkill] = useState(false);
  const [skipInstall, setSkipInstall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: "1px 0px 0px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const command = useMemo(() => {
    const flags: string[] = [];

    if (linter) {
      flags.push("--linter", linter);
    }
    if (selectedFrameworks.length > 0) {
      flags.push("--frameworks", ...selectedFrameworks);
    }
    if (selectedEditors.length > 0) {
      flags.push("--editors", ...selectedEditors);
    }
    if (selectedAgents.length > 0) {
      flags.push("--agents", ...selectedAgents);
    }
    if (selectedHooks.length > 0) {
      flags.push("--hooks", ...selectedHooks);
    }
    if (selectedIntegrations.length > 0) {
      flags.push("--integrations", ...selectedIntegrations);
    }
    if (typeAware) {
      flags.push("--type-aware");
    }
    if (installSkill) {
      flags.push("--install-skill");
    }
    if (skipInstall) {
      flags.push("--skip-install");
    }

    return buildCommand(packageManager, flags);
  }, [
    installSkill,
    linter,
    packageManager,
    selectedAgents,
    selectedEditors,
    selectedFrameworks,
    selectedHooks,
    selectedIntegrations,
    skipInstall,
    typeAware,
  ]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command);
    toast.success("Copied to clipboard", {
      description: "Paste it into your terminal to install Ultracite.",
    });
    setCopied(true);
    track("Copied install configurator command", { linter, packageManager });
    setTimeout(() => {
      setCopied(false);
    }, COPY_TIMEOUT);
  }, [command, linter, packageManager]);

  const CopyIconComponent = copied ? CheckIcon : CopyIcon;

  return (
    <div className="grid gap-10">
      <div aria-hidden ref={sentinelRef} />
      <div
        className={cn(
          "sticky top-[61px] z-10 grid gap-3 bg-card p-4 shadow-lg ring-1 ring-foreground/10 transition-[border-radius] sm:p-5",
          isStuck ? "rounded-b-2xl" : "rounded-2xl"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-sm tracking-tight">
            Your install command
          </span>
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) =>
                setPackageManager(value as PackageManager)
              }
              value={packageManager}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {packageManagers.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCopy} size="sm" variant="secondary">
              <CopyIconComponent />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-muted/50 p-3 font-mono text-xs sm:text-sm">
          <code>{command}</code>
        </pre>
      </div>

      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">Linter</FieldLegend>
          <FieldDescription>
            Pick the formatter and linter you want Ultracite to configure.
          </FieldDescription>
          <RadioGroup
            className="grid gap-3 sm:grid-cols-3"
            onValueChange={setLinter}
            value={linter}
          >
            {linters.map((option) => {
              const id = `linter-${option.id}`;
              return (
                <FieldLabel htmlFor={id} key={option.id}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <LogoTitle logo={option.logo} name={option.name} />
                      <FieldDescription>{option.description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id={id} value={option.id} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Frameworks</FieldLegend>
          <FieldDescription>
            Enable framework-specific rules. Pick everything that's in your
            stack.
          </FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frameworks.map((option) => (
              <CheckboxChoice
                checked={selectedFrameworks.includes(option.id)}
                id={`framework-${option.id}`}
                key={option.id}
                name={option.name}
                onCheckedChange={() => toggleFramework(option.id)}
              />
            ))}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Editors</FieldLegend>
          <FieldDescription>
            Generate editor settings so format-on-save and linting work out of
            the box.
          </FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {editors.map((option) => (
              <CheckboxChoice
                checked={selectedEditors.includes(option.id)}
                description={option.configPath}
                id={`editor-${option.id}`}
                key={option.id}
                logo={option.logo}
                name={option.name}
                onCheckedChange={() => toggleEditor(option.id)}
              />
            ))}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Agent files</FieldLegend>
          <FieldDescription>
            Create rules files that teach AI agents your code standards.
          </FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agentTargets.map((option) => (
              <CheckboxChoice
                checked={selectedAgents.includes(option.id)}
                description={option.configPath}
                id={`agent-${option.id}`}
                key={option.id}
                logo={option.logo}
                name={option.name}
                onCheckedChange={() => toggleAgent(option.id)}
              />
            ))}
          </div>
        </FieldSet>

        {hooks.length > 0 ? (
          <FieldSet>
            <FieldLegend variant="label">Agent hooks</FieldLegend>
            <FieldDescription>
              Add agent hooks that auto-format files after each edit.
            </FieldDescription>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hooks.map((option) => (
                <CheckboxChoice
                  checked={selectedHooks.includes(option.id)}
                  id={`hook-${option.id}`}
                  key={option.id}
                  name={option.name}
                  onCheckedChange={() => toggleHook(option.id)}
                />
              ))}
            </div>
          </FieldSet>
        ) : null}

        <FieldSet>
          <FieldLegend variant="label">Pre-commit integrations</FieldLegend>
          <FieldDescription>
            Run Ultracite automatically before each commit.
          </FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {integrations.map((option) => (
              <CheckboxChoice
                checked={selectedIntegrations.includes(option.id)}
                id={`integration-${option.id}`}
                key={option.id}
                name={option.name}
                onCheckedChange={() => toggleIntegration(option.id)}
              />
            ))}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Advanced</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckboxChoice
              checked={typeAware}
              description="Enable type-aware linting rules"
              id="advanced-type-aware"
              name="Type-aware"
              onCheckedChange={() => setTypeAware((value) => !value)}
            />
            <CheckboxChoice
              checked={installSkill}
              description="Install the reusable Ultracite skill"
              id="advanced-install-skill"
              name="Install skill"
              onCheckedChange={() => setInstallSkill((value) => !value)}
            />
            <CheckboxChoice
              checked={skipInstall}
              description="Update package.json without running install"
              id="advanced-skip-install"
              name="Skip install"
              onCheckedChange={() => setSkipInstall((value) => !value)}
            />
          </div>
        </FieldSet>
      </FieldGroup>
    </div>
  );
};
