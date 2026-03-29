import { cn } from "@/lib/utils";

interface SectionIntroProps {
  className?: string;
  description: string;
  title: string;
}

export const SectionIntro = ({
  className,
  description,
  title,
}: SectionIntroProps) => (
  <div className={cn("mx-auto grid max-w-3xl gap-4 text-center", className)}>
    <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
      {title}
    </h2>
    <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
      {description}
    </p>
  </div>
);
