import { cn } from '@/lib/utils';
import { AIGraphic } from './ai';
import { IntegrationsGraphic } from './integrations';
import { IntuitiveGraphic } from './intuitive';
import { MonoreposGraphic } from './monorepos';
import { PerformanceGraphic } from './performance';
import { TypeSafetyGraphic } from './type-safety';

const benefits = [
  {
    children: PerformanceGraphic,
    className: 'lg:col-span-2',
    description:
      'Built in Rust for instant code analysis and processing, making on-save checks feel seamless without interrupting your workflow.',
    title: 'Subsecond linting and formatting',
  },
  {
    children: IntegrationsGraphic,
    className: 'lg:col-span-4',
    description:
      'Built-in scaffolding for Husky pre-commit hooks and lint-staged configuration, with support for all major package managers.',
    title: 'Plays nice with others',
  },
  {
    children: IntuitiveGraphic,
    className: 'lg:col-span-3',
    description:
      'Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.',
    title: 'Intuitive and robust',
  },
  {
    children: TypeSafetyGraphic,
    className: 'lg:col-span-3',
    description:
      'Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns.',
    title: 'Maximum type safety',
  },
  {
    children: MonoreposGraphic,
    className: 'lg:col-span-4',
    description:
      'Unified toolchain configuration across all packages and apps, eliminating thousands of lines of duplicate config files while maintaining consistency.',
    title: 'Designed for monorepos',
  },
  {
    children: AIGraphic,
    className: 'lg:col-span-2',
    description:
      'Ensures consistent code style and quality across all team members and AI models, eliminating debates over formatting and reducing code review friction.',
    title: 'Usable by humans and AI',
  },
];

export const Benefits = () => (
  <section className="grid md:gap-12">
    <p className="max-w-6xl text-balance font-semibold text-3xl tracking-tighter sm:text-4xl md:text-5xl">
      Finally &mdash; a ⚡ lightning-fast toolchain that ensures you, your team
      and your AI agents are writing code in harmony.
    </p>
    <div className="isolate grid gap-4 lg:grid-cols-6">
      {benefits.map((benefit) => (
        <div
          className={cn(
            'relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4 sm:p-8',
            benefit.className
          )}
          key={benefit.title}
        >
          <div className="relative z-10 h-64 w-full">
            {benefit.children && <benefit.children />}
          </div>
          <h3 className="z-10 mt-4 font-semibold text-xl">{benefit.title}</h3>
          <p className="max-w-sm text-pretty text-muted-foreground">
            {benefit.description}
          </p>
        </div>
      ))}
    </div>
  </section>
);
