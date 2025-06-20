import { cn } from '@/lib/utils';
import { AIGraphic } from './ai';
import { ConfigGraphic } from './config';
import { IntuitiveGraphic } from './intuitive';
import { MonoreposGraphic } from './monorepos';
import { PerformanceGraphic } from './performance';
import { TypeSafetyGraphic } from './type-safety';

const benefits = [
  {
    title: 'Subsecond linting and formatting',
    description:
      'Built in Rust for instant code analysis and processing, making on-save checks feel seamless without interrupting your workflow.',
    className: 'md:col-span-2',
    children: PerformanceGraphic,
  },
  {
    title: 'Zero-config by design',
    description:
      'Preconfigured rules optimized for Next.js, React and TypeScript projects with sensible defaults, while still allowing customization when needed.',
    className: 'md:col-span-4',
    children: ConfigGraphic,
  },
  {
    title: 'Intuitive and robust',
    description:
      'Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.',
    className: 'md:col-span-3',
    children: IntuitiveGraphic,
  },
  {
    title: 'Maximum type safety',
    description:
      'Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns.',
    className: 'md:col-span-3',
    children: TypeSafetyGraphic,
  },
  {
    title: 'Designed for monorepos',
    description:
      'Unified toolchain configuration across all packages and apps, eliminating thousands of lines of duplicate config files while maintaining consistency.',
    className: 'md:col-span-4',
    children: MonoreposGraphic,
  },
  {
    title: 'Usable by humans and AI',
    description:
      'Ensures consistent code style and quality across all team members and AI models, eliminating debates over formatting and reducing code review friction.',
    className: 'md:col-span-2',
    children: AIGraphic,
  },
];

export const Benefits = () => (
  <section className="grid py-24 md:gap-12">
    <p className="max-w-6xl text-balance font-semibold text-5xl tracking-tighter">
      Finally &mdash; a ⚡ lightning-fast toolchain that ensures you, your team
      and your AI agents are writing code in harmony.
    </p>
    <div className="isolate grid gap-4 md:grid-cols-6">
      {benefits.map((benefit) => (
        <div
          key={benefit.title}
          className={cn(
            'relative flex flex-col gap-2 overflow-hidden rounded-xl border p-8',
            benefit.className
          )}
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
