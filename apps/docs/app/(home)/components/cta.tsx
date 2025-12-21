"use client";

import { Installer } from "./installer";

export const CallToAction = () => (
  <div className="grid items-center gap-8 sm:p-16 md:p-24">
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-balance font-medium text-3xl md:text-4xl">
        Install in <span className="italic">seconds</span>. Run in{" "}
        <span className="italic">milliseconds</span>.
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Install Ultracite and start shipping code faster.
      </p>
    </div>
    <div className="mx-auto w-full max-w-xs">
      <Installer command="npx ultracite@latest init" />
    </div>
  </div>
);
