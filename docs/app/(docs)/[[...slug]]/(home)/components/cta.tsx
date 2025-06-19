import { Installer } from './installer';

export const CallToAction = () => (
  <div className="grid gap-6 text-center">
    <div className="flex flex-col items-center justify-center gap-2">
      <h2 className="font-semibold text-3xl">
        Install in seconds. Run in milliseconds.
      </h2>
      <p className="text-lg text-muted-foreground">
        Install Ultracite and start shipping code faster.
      </p>
    </div>
    <div className="mx-auto w-full max-w-md">
      <Installer />
    </div>
  </div>
);
