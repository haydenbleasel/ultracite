import {
  Bot,
  Calendar,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: GitPullRequest,
    title: "Automated PR Reviews",
    description:
      'When you comment "@ultracite review" on a pull request, Ultracite automatically checks out your branch, runs fixes, and commits changes directly to your PR.',
  },
  {
    icon: Calendar,
    title: "Scheduled Lint Runs",
    description:
      "Daily automated runs on your default branch catch issues that slip through, creating pull requests with fixes and generated changelogs.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Get visibility into all connected repositories, lint run history, issues found and fixed, and pull requests created.",
  },
  {
    icon: Bot,
    title: "AI-Powered Fixes",
    description:
      "When auto-fix isn't enough, Claude Code steps in to handle complex issues like refactoring, accessibility fixes, and type errors.",
  },
  {
    icon: Lock,
    title: "Secure Sandboxes",
    description:
      "All linting runs in isolated sandbox environments. Your code is cloned, processed, and the sandbox is destroyed — we never store your source code.",
  },
  {
    icon: Zap,
    title: "Zero Configuration",
    description:
      "Connect your repos once, enable them in the dashboard, and Ultracite handles everything else automatically.",
  },
];

export const Features = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Everything you need to keep your codebase clean
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite Cloud automates code quality so you can focus on building
        features, not fixing lint errors.
      </p>
    </div>
    <div className="grid divide-x divide-y border-t border-l sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <div className="p-6 last:border-r last:border-b" key={feature.title}>
          <feature.icon className="mb-3 size-5 text-muted-foreground" />
          <h3 className="mb-2 font-medium">{feature.title}</h3>
          <p className="text-pretty text-muted-foreground text-sm">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
