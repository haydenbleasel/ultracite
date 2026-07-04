"use client";

import { Dithering } from "@paper-design/shaders-react";
import { formatHex, parse } from "culori";
import { useSyncExternalStore } from "react";

import { Installer } from "./installer";

// CSS custom properties are read once on mount; there is nothing to subscribe to.
const subscribe = (): (() => void) => () => {
  // no-op
};

const useCssColor = (cssVar: string, fallback: string): string =>
  useSyncExternalStore(
    subscribe,
    () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim();
      if (!raw) {
        return fallback;
      }
      const parsed = parse(raw);
      return parsed ? formatHex(parsed) : fallback;
    },
    () => fallback
  );

export const CallToAction = () => {
  const colorBack = useCssColor("--sidebar", "#FAFAFA");
  const colorFront = useCssColor("--secondary", "#F1F1F1");

  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-sidebar">
      <Dithering
        colorBack={colorBack}
        colorFront={colorFront}
        shape="warp"
        type="4x4"
        size={2.5}
        speed={1}
        scale={1}
        rotation={0}
        offsetX={0}
        offsetY={0}
        style={{
          height: "100%",
          inset: 0,
          position: "absolute",
          width: "100%",
        }}
        className="select-none pointer-events-none"
      />
      <div className="relative grid items-center gap-8 p-16 md:p-24">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-balance font-medium text-2xl tracking-tighter sm:text-3xl md:text-4xl">
            Install in seconds. Run in milliseconds.
          </h2>
          <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
            Install Ultracite and start shipping code faster in seconds.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Installer />
        </div>
      </div>
    </div>
  );
};
