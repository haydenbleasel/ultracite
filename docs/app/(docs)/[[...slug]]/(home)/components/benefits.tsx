import {
  CheckIcon,
  PuzzleIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react';
import { PixelCanvas } from '@/components/ui/pixel-canvas';
import { cn } from '@/lib/utils';

const benefits = [
  {
    icon: ZapIcon,
    title: 'Lightning-fast performance',
    description:
      'Built in Rust for instant code analysis and processing, making on-save checks feel seamless without interrupting your workflow.',
    className: 'col-span-2',
  },
  {
    icon: SettingsIcon,
    title: 'Zero-config by design',
    description:
      'Preconfigured rules optimized for Next.js, React and TypeScript projects with sensible defaults, while still allowing customization when needed.',
    className: 'col-span-4',
  },
  {
    icon: CheckIcon,
    title: 'Intuitive and simple',
    description:
      'Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.',
    className: 'col-span-3',
  },
  {
    icon: CheckIcon,
    title: 'Maximum type safety',
    description:
      'Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns.',
    className: 'col-span-3',
  },
  {
    icon: PuzzleIcon,
    title: 'Plays nice with others',
    description:
      'Seamlessly integrates with popular tools and patterns, including automatic sorting of CSS utility classes and support for common utility functions.',
    className: 'col-span-4',
  },
  {
    icon: UsersIcon,
    title: 'Ready for humans and AI agents',
    description:
      'Ensures consistent code style and quality across all team members and AI models, eliminating debates over formatting and reducing code review friction.',
    className: 'col-span-2',
  },
];

export const Benefits = () => (
  <section className="container mx-auto grid gap-12 py-24">
    <p className="max-w-6xl text-balance font-semibold text-5xl tracking-tighter">
      Finally &mdash; a ⚡ lightning-fast toolchain that ensures you, your team
      and your AI agents are writing code in harmony.
    </p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {benefits.map((benefit) => (
        <div
          key={benefit.title}
          className={cn(
            'relative flex flex-col gap-2 overflow-hidden rounded-xl border p-8',
            benefit.className
          )}
        >
          <PixelCanvas
            gap={20}
            speed={25}
            colors={['#0F4468', '#2A83AD', '#0ea5e9']}
            variant="icon"
          />
          <div className="relative h-48 w-full" />
          <div className="inline-flex w-fit items-center justify-center rounded-md bg-primary/10 p-2.5">
            <benefit.icon className="size-5 text-primary" />
          </div>
          <h3 className="mt-4 font-semibold text-xl">{benefit.title}</h3>
          <p className="text-balance text-muted-foreground">
            {benefit.description}
          </p>
        </div>
      ))}
    </div>
  </section>
);
