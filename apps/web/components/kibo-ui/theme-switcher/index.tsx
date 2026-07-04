"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Monitor, Moon, Sun } from "lucide-react";
import { LazyMotion, m } from "motion/react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const loadMotionFeatures = async () => {
  const mod = await import("motion/react");
  return mod.domMax;
};

const emptySubscribe = (): (() => void) => () => {
  // no-op: mount state never changes after the first client render
};

// Returns false during SSR and the first render, true once mounted on the
// client — the SSR-safe way to guard against hydration mismatches.
const useIsMounted = (): boolean =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

const themes = [
  {
    icon: Monitor,
    key: "system",
    label: "System theme",
  },
  {
    icon: Sun,
    key: "light",
    label: "Light theme",
  },
  {
    icon: Moon,
    key: "dark",
    label: "Dark theme",
  },
];

export interface ThemeSwitcherProps {
  value?: "light" | "dark" | "system";
  onChange?: (theme: "light" | "dark" | "system") => void;
  defaultValue?: "light" | "dark" | "system";
  className?: string;
}

export const ThemeSwitcher = ({
  value,
  onChange,
  defaultValue = "system",
  className,
}: ThemeSwitcherProps) => {
  const [theme, setTheme] = useControllableState({
    defaultProp: defaultValue,
    onChange,
    prop: value,
  });
  const mounted = useIsMounted();

  const handleClickByKey = Object.fromEntries(
    themes.map((t) => [
      t.key,
      () => setTheme(t.key as "light" | "dark" | "system"),
    ])
  ) as Record<string, () => void>;

  if (!mounted) {
    return null;
  }

  return (
    <LazyMotion features={loadMotionFeatures}>
      <div
        className={cn(
          "relative isolate flex h-8 w-fit rounded-full bg-background p-1 ring-1 ring-border",
          className
        )}
      >
        {themes.map(({ key, icon: Icon, label }) => {
          const isActive = theme === key;

          return (
            <button
              aria-label={label}
              className="relative h-6 w-6 rounded-full"
              key={key}
              onClick={handleClickByKey[key]}
              type="button"
            >
              {isActive && (
                <m.div
                  className="absolute inset-0 rounded-full bg-secondary"
                  layoutId="activeTheme"
                  transition={{ duration: 0.5, type: "spring" }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 m-auto h-4 w-4",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              />
            </button>
          );
        })}
      </div>
    </LazyMotion>
  );
};
