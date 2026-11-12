// A lookup object evaluates every branch; the ternary evaluates one.
export const calls: string[] = [];
const loadUser = (): string => {
  calls.push("loadUser");
  return "user";
};
const loadTeam = (): string => {
  calls.push("loadTeam");
  return "team";
};
const loadNothing = (): string => {
  calls.push("loadNothing");
  return "nothing";
};
export const inputs = ["user", "team", "other"];
export const original = (kind: string): string =>
  kind === "user" ? loadUser() : kind === "team" ? loadTeam() : loadNothing();
export const rewrites = {
  ifElse: (kind: string): string => {
    if (kind === "user") {
      return loadUser();
    }
    if (kind === "team") {
      return loadTeam();
    }
    return loadNothing();
  },
  lookup: (kind: string): string =>
    ({ team: loadTeam(), user: loadUser() })[kind] ?? loadNothing(),
  lookupThunks: (kind: string): string =>
    ({ team: loadTeam, user: loadUser })[kind]?.() ?? loadNothing(),
};
