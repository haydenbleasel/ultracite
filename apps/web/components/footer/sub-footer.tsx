"use client";

import { statusUrl } from "@repo/data/src/consts";
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@repo/design-system/components/kibo-ui/status";
import { ThemeSwitcher } from "@repo/design-system/components/kibo-ui/theme-switcher";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { getStatus } from "@/actions/status/get";

export const SubFooter = () => {
  const { theme, setTheme } = useTheme();
  const { data: status } = useSWR("status", getStatus);

  return (
    <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t py-6 text-center sm:flex-row sm:text-left">
      <a href={statusUrl} target="_blank">
        <Status status={status ?? "offline"}>
          <StatusIndicator />
          <StatusLabel />
        </Status>
      </a>
      <ThemeSwitcher
        onChange={setTheme}
        value={(theme ?? "system") as "light" | "dark" | "system"}
      />
    </div>
  );
};
