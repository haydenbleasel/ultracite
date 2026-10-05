import { defineProof } from "@gdp-ts/core";
import type { Named, Proof } from "@gdp-ts/core";

import type { UserId } from "../lib/ids.ts";

const prover = defineProof("UserIsAdmin");

// The upstream recipe: an empty interface per proof, never a type alias.
export interface UserIsAdmin<U> extends Proof<"UserIsAdmin", [U]> {}

export const userIsAdmin = <U>(
  user: Named<U, UserId>,
  role: string
): UserIsAdmin<U> | null =>
  (role as "admin" | "member") === "admin" ? prover.prove(user) : null;

// Leaks the prover, so any module could mint the proof.
export { prover };
