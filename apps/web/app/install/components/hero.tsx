interface InstallHeroProps {
  description: string;
  title: string;
}

export const InstallHero = ({ description, title }: InstallHeroProps) => (
  <div className="grid gap-4">
    <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
      {title}
    </h1>
    <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
      {description}
    </p>
  </div>
);
