import { Installer } from "./installer";

export const CallToAction = () => (
  <div className="grid items-center gap-8 rounded-2xl bg-sidebar sm:p-16 md:p-24">
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-balance font-medium text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Install in seconds. Run in milliseconds.
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Install Ultracite and start shipping code faster in seconds.
      </p>
    </div>
    <div className="mx-auto w-full max-w-xs">
      <Installer command="npx ultracite@latest init" />
    </div>
  </div>
);
