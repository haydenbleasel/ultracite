import type { Agent } from "@ultracite/data/agents";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircleIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

interface BenefitsProps {
  agent: Agent;
}

const benefits: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Consistent output",
    description:
      "Generated code follows your linting rules from the start, reducing cleanup work.",
    icon: CheckCircleIcon,
  },
  {
    title: "Fewer iterations",
    description:
      "The AI understands your standards upfront, producing acceptable code faster.",
    icon: ZapIcon,
  },
  {
    title: "Team alignment",
    description:
      "Everyone's AI assistant generates code that matches your team's style guide.",
    icon: UsersIcon,
  },
  {
    title: "Zero configuration",
    description:
      "Get started instantly with sensible defaults that work out of the box.",
    icon: RocketIcon,
  },
  {
    title: "Type-safe code",
    description:
      "Strict linting rules catch potential bugs and enforce type safety automatically.",
    icon: ShieldCheckIcon,
  },
  {
    title: "AI-ready rules",
    description:
      "Purpose-built rules that AI models understand and follow consistently.",
    icon: SparklesIcon,
  },
];

export const Benefits = ({ agent }: BenefitsProps) => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Why use Ultracite with {agent.name}?
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        AI coding assistants generate code faster, but without guidance they may
        not follow your project's conventions.
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
