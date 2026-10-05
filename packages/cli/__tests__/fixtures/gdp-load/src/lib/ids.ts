declare const brand: unique symbol;

export type UserId = string & { readonly [brand]: "UserId" };

// Branded-id constructors are the one assertion allowed outside proofs/.
export const toUserId = (id: string) => id as UserId;
