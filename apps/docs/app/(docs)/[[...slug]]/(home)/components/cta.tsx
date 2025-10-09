"use client";

import { Installer } from "./installer";

export const CallToAction = () => (
  <div className="grid gap-8 rounded-xl bg-sidebar p-8 sm:p-16 md:p-24">
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        Install in seconds. Run in milliseconds.
      </h2>
      <p className="text-lg text-muted-foreground sm:text-xl">
        Install Ultracite and start shipping code faster.
      </p>
    </div>
    <div className="mx-auto w-full max-w-md">
      <Installer />
    </div>
  </div>
);
