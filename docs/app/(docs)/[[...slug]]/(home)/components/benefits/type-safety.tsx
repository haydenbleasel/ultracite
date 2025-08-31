"use client";

import { SiTypescript } from "@icons-pack/react-simple-icons";
import { cn } from "@/lib/utils";

const defaultCards = [
  {
    icon: <SiTypescript className="size-4" />,
    title: "Type Error",
    description: 'Property "name" does not exist on type "User"',
    date: "Line 42, Column 10",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <SiTypescript className="size-4" />,
    title: "Unused Variable",
    description: 'Variable "count" is declared but never used',
    date: "Line 15, Column 14",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <SiTypescript className="size-4" />,
    title: "Missing Return",
    description: 'Function "getUser" lacks return type annotation.',
    date: "Line 28, Column 20",
    className:
      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
  },
];

export const TypeSafetyGraphic = () => (
  <div className="-ml-16 xl:-ml-48 fade-in-0 grid animate-in place-items-center opacity-100 duration-700 [grid-template-areas:'stack']">
    {defaultCards.map((card) => (
      <div
        className={cn(
          "-skew-y-[8deg] relative flex h-36 w-[22rem] select-none flex-col justify-between rounded-xl border p-4 font-mono backdrop-blur-sm transition-all duration-700",
          "after:-right-1 after:absolute after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-['']",
          "hover:border-foreground/20 hover:bg-muted",
          "[&>*]:flex [&>*]:items-center [&>*]:gap-2",
          card.className
        )}
        key={card.title}
      >
        <div>
          {card.icon}
          <p className="font-medium text-sm">{card.title}</p>
        </div>
        <p className="line-clamp-2 text-balance">{card.description}</p>
        <p className="text-muted-foreground text-sm">{card.date}</p>
      </div>
    ))}
  </div>
);
