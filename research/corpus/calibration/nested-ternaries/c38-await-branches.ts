// Branches that await: a lookup would start every request.
declare const fetchUser: () => Promise<string>;
declare const fetchTeam: () => Promise<string>;
export const load = async (kind: "user" | "team" | "none"): Promise<string> =>
  kind === "user" ? await fetchUser() : kind === "team" ? await fetchTeam() : "nothing";
