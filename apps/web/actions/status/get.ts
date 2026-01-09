"use server";

import { env } from "@/lib/env";

import type { BetterStackResponse } from "./types";

export const getStatus = async () => {
  try {
    const response = await fetch(
      "https://uptime.betterstack.com/api/v2/monitors",
      {
        headers: {
          Authorization: `Bearer ${env.BETTERSTACK_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch status");
    }

    const { data } = (await response.json()) as BetterStackResponse;
    const sites = data.filter((monitor) =>
      monitor.attributes.url.includes("eververse.ai")
    );

    const status =
      sites.filter((monitor) => monitor.attributes.status === "up").length /
      sites.length;

    if (status === 0) {
      return "offline";
    }

    if (status < 1) {
      return "degraded";
    }

    return "online";
  } catch {
    return "offline";
  }
};
