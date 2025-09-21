"use client";

import { Installer } from "./installer";

export const CallToAction = () => (
  <div className="px-8 py-24 grid gap-8">
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h2 className="font-semibold text-3xl tracking-tight">
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
