import { cn } from '@/lib/utils';
import {
  CheckIcon,
  PuzzleIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react';

const benefits = [
  {
    icon: ZapIcon,
    title: 'Lightning-fast performance',
    description:
      'Built in Rust for instant code analysis and processing, making on-save checks feel seamless without interrupting your workflow.',
  },
  {
    icon: SettingsIcon,
    title: 'Zero-config by design',
    description:
      'Preconfigured rules optimized for Next.js, React and TypeScript projects with sensible defaults, while still allowing customization when needed.',
  },
  {
    icon: CheckIcon,
    title: 'Intuitive and simple',
    description:
      'Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.',
  },
  {
    icon: CheckIcon,
    title: 'Maximum type safety',
    description:
      'Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns.',
  },
  {
    icon: PuzzleIcon,
    title: 'Plays nice with others',
    description:
      'Seamlessly integrates with popular tools and patterns, including automatic sorting of CSS utility classes and support for common utility functions.',
  },
  {
    icon: UsersIcon,
    title: 'Team-ready collaboration',
    description:
      'Ensures consistent code style and quality across all team members with a single file, eliminating debates over formatting and reducing code review friction.',
  },
];

export const Benefits = () => (
  <div className="grid divide-y divide-dotted md:grid-cols-2 md:divide-x lg:grid-cols-3">
    {benefits.map((benefit) => (
      <div
        key={benefit.title}
        className={cn(
          'flex flex-col gap-2 p-8',
          (benefits.indexOf(benefit) + 1) % 2 === 0 &&
            'md:border-r-0 lg:border-r',
          benefits.indexOf(benefit) >= benefits.length - 2 && 'md:border-b-0',

          benefits.indexOf(benefit) >= benefits.length - 3 && 'lg:border-b-0',
          (benefits.indexOf(benefit) + 1) % 3 === 0 && 'lg:border-r-0'
        )}
      >
        <div className="inline-flex w-fit items-center justify-center rounded-md bg-primary/10 p-2">
          <benefit.icon className="size-4 text-primary" />
        </div>
        <h3 className="mt-4 font-semibold text-xl">{benefit.title}</h3>
        <p className="text-muted-foreground">{benefit.description}</p>
      </div>
    ))}
  </div>
);
