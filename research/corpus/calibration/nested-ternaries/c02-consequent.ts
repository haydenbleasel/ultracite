// Nesting in the consequent: a decision inside a decision.
export const access = (isAdmin: boolean, isOwner: boolean, isPublic: boolean): string =>
  isPublic ? (isAdmin ? "manage" : "read") : isOwner ? "edit" : "none";
