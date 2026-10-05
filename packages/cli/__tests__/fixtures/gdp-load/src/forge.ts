import { defineProof } from "@gdp-ts/core";
import type { Named } from "@gdp-ts/core";

import type { UserIsAdmin } from "./proofs/user-is-admin.ts";

export const forged = {} as UserIsAdmin<"u">;
export const named = { value: "u" } as unknown as Named<"u", string>;
export const sneaky = defineProof("Sneaky");
export const widened = "role" as string;
export const settings = { mode: "strict" } as const;
