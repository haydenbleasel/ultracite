import { cn } from '@/lib/utils';
import { AIGraphic } from './ai';
import { ConfigGraphic } from './config';
import { IntuitiveGraphic } from './intuitive';
import { MonoreposGraphic } from './monorepos';
import { PerformanceGraphic } from './performance';
import { TypeSafetyGraphic } from './type-safety';

const benefits = [
  {
    children: PerformanceGraphic,
    className: 'md:col-span-2',
    description:
      'Built in Rust for instant code analysis and processing, making on-save checks feel seamless without interrupting your workflow.',
    title: 'Speedy linting and formatting',
  },
  {
    children: ConfigGraphic,
    className: 'md:col-span-4',
    description:
      'Preconfigured rules optimized for Next.js, React and TypeScript projects with sensible defaults, while still allowing customization when needed.',
    title: 'Zero-config by design',
  },
  {
    children: IntuitiveGraphic,
    className: 'md:col-span-3',
    description:
      'Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.',
    title: 'Intuitive and robust',
  },
  {
    children: TypeSafetyGraphic,
    className: 'md:col-span-3',
    description:
      'Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns.',
    title: 'Maximum type safety',
  },
  {
    children: MonoreposGraphic,
    className: 'md:col-span-4',
    description:
      'Unified toolchain configuration across all packages and apps, eliminating thousands of lines of duplicate config files while maintaining consistency.',
    title: 'Designed for monorepos',
  },
  {
    children: AIGraphic,
    className: 'md:col-span-2',
    description:
      'Ensures consistent code style and quality across all team members and AI models, eliminating debates over formatting and reducing code review friction.',
    title: 'Usable by humans and AI',
  },
];

export const Benefits = () => (
  <section className="grid md:gap-12">
    <p className="max-w-6xl text-balance font-semibold text-5xl tracking-tighter">
      Finally &mdash; a ⚡ lightning-fast toolchain that ensures you, your team
      and your AI agents are writing code in harmony.
    </p>
    <div className="isolate grid gap-4 md:grid-cols-6">
      {benefits.map((benefit) => (
        <div
          className={cn(
            'relative flex flex-col gap-2 overflow-hidden rounded-xl border p-8',
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
